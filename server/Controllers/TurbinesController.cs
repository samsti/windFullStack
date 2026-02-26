using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mqtt.Controllers;
using WindTurbineApi.Data;
using WindTurbineApi.Models;

namespace WindTurbineApi.Controllers;

[ApiController]
[Route("api/turbines")]
public class TurbinesController(AppDbContext db) : ControllerBase
{
    // GET /api/turbines — all turbines with their latest metric snapshot
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var turbines = await db.Turbines.ToListAsync();
        var result = new List<object>();

        foreach (var t in turbines)
        {
            var latest = await db.TurbineMetrics
                .Where(m => m.TurbineId == t.Id)
                .OrderByDescending(m => m.RecordedAt)
                .FirstOrDefaultAsync();

            result.Add(new { t.Id, t.Name, t.Location, t.IsOnline, t.LastSeenAt,
                             t.IsInMaintenance, t.MaintenanceSince, t.MaintenanceReason,
                             LatestMetric = latest });
        }

        return Ok(result);
    }

    // GET /api/turbines/{id} — single turbine with latest metric
    [HttpGet("{id}")]
    public async Task<IActionResult> GetOne(string id)
    {
        var t = await db.Turbines.FindAsync(id);
        if (t is null) return NotFound();

        var latest = await db.TurbineMetrics
            .Where(m => m.TurbineId == id)
            .OrderByDescending(m => m.RecordedAt)
            .FirstOrDefaultAsync();

        return Ok(new { t.Id, t.Name, t.Location, t.IsOnline, t.LastSeenAt,
                        t.IsInMaintenance, t.MaintenanceSince, t.MaintenanceReason,
                        LatestMetric = latest });
    }

    // GET /api/turbines/overview?minutes=60&bucket=1
    // minutes=0 = all time; bucket=N = N-minute aggregation window
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview([FromQuery] int minutes = 60, [FromQuery] int bucket = 1)
    {
        var query = db.TurbineMetrics.AsQueryable();
        if (minutes > 0)
        {
            var since = DateTime.UtcNow.AddMinutes(-minutes);
            query = query.Where(m => m.RecordedAt >= since);
        }

        var all = await query.OrderBy(m => m.RecordedAt).ToListAsync();

        var bucketTicks = (long)TimeSpan.TicksPerMinute * Math.Max(1, bucket);
        var timeSeries = all
            .GroupBy(m => new DateTime(m.RecordedAt.Ticks / bucketTicks * bucketTicks, DateTimeKind.Utc))
            .OrderBy(g => g.Key)
            .Select(g => new
            {
                recordedAt       = g.Key,
                totalPower       = Math.Round(g.Sum(m => m.PowerOutput),        1),
                avgWindSpeed     = Math.Round(g.Average(m => m.WindSpeed),      2),
                avgGeneratorTemp = Math.Round(g.Average(m => m.GeneratorTemp),  1),
                avgVibration     = Math.Round(g.Average(m => m.Vibration),      3),
                activeTurbines   = g.Select(m => m.TurbineId).Distinct().Count(),
            });

        return Ok(timeSeries);
    }

    // GET /api/turbines/{id}/metrics?minutes=60&bucket=1
    // minutes=0 means all time; bucket=N aggregates into N-minute averages (1 = raw)
    [HttpGet("{id}/metrics")]
    public async Task<IActionResult> GetMetrics(string id, [FromQuery] int minutes = 60, [FromQuery] int bucket = 1)
    {
        var query = db.TurbineMetrics
            .Where(m => m.TurbineId == id)
            .AsQueryable();

        if (minutes > 0)
        {
            var since = DateTime.UtcNow.AddMinutes(-minutes);
            query = query.Where(m => m.RecordedAt >= since);
        }

        var raw = await query.OrderBy(m => m.RecordedAt).ToListAsync();

        if (bucket <= 1) return Ok(raw);

        // Bucket into N-minute averages
        var bucketTicks = (long)TimeSpan.TicksPerMinute * bucket;
        var bucketed = raw
            .GroupBy(m => new DateTime(m.RecordedAt.Ticks / bucketTicks * bucketTicks, DateTimeKind.Utc))
            .OrderBy(g => g.Key)
            .Select(g => new
            {
                recordedAt         = g.Key,
                windSpeed          = Math.Round(g.Average(m => m.WindSpeed),          2),
                powerOutput        = Math.Round(g.Average(m => m.PowerOutput),        1),
                rotorSpeed         = Math.Round(g.Average(m => m.RotorSpeed),         2),
                generatorTemp      = Math.Round(g.Average(m => m.GeneratorTemp),      1),
                gearboxTemp        = Math.Round(g.Average(m => m.GearboxTemp),        1),
                ambientTemperature = Math.Round(g.Average(m => m.AmbientTemperature), 1),
                vibration          = Math.Round(g.Average(m => m.Vibration),          3),
                bladePitch         = Math.Round(g.Average(m => m.BladePitch),         1),
                windDirection      = Math.Round(g.Average(m => m.WindDirection),      0),
                nacelleDirection   = Math.Round(g.Average(m => m.NacelleDirection),   0),
                status             = g.OrderByDescending(m => m.RecordedAt).First().Status,
            });

        return Ok(bucketed);
    }

    // GET /api/turbines/{id}/alerts?limit=20
    [HttpGet("{id}/alerts")]
    public async Task<IActionResult> GetAlerts(string id, [FromQuery] int limit = 20)
    {
        var t = await db.Turbines.FindAsync(id);
        if (t is null) return NotFound();

        var alerts = await db.Alerts
            .Where(a => a.TurbineId == id)
            .OrderByDescending(a => a.TriggeredAt)
            .Take(limit)
            .ToListAsync();

        return Ok(alerts);
    }

    // POST /api/turbines/{id}/command — forward operator command via MQTT
    [Authorize]
    [HttpPost("{id}/command")]
    public async Task<IActionResult> SendCommand(
        string id,
        [FromBody] TurbineCommandRequest req,
        [FromServices] IMqttClientService mqtt,
        [FromServices] IConfiguration config)
    {
        var t = await db.Turbines.FindAsync(id);
        if (t is null) return NotFound();

        // ── Validate parameters per action ───────────────────────────────────
        var validationError = req.Action switch
        {
            "setInterval" when req.Value is null          => "value is required for setInterval",
            "setInterval" when req.Value is < 1 or > 60  => "value must be between 1 and 60 seconds",
            "setPitch"    when req.Angle is null          => "angle is required for setPitch",
            "setPitch"    when req.Angle is < 0 or > 30  => "angle must be between 0 and 30 degrees",
            "start" or "stop" or "setInterval" or "setPitch" => null,
            _ => $"unknown action '{req.Action}'",
        };
        if (validationError is not null) return BadRequest(new { error = validationError });

        // ── Build MQTT payload ────────────────────────────────────────────────
        var mqttPayload = req.Action switch
        {
            "start"       => new { action = "start" },
            "stop"        => (object)new { action = "stop", reason = req.Reason ?? "operator" },
            "setInterval" => new { action = "setInterval", value = req.Value },
            "setPitch"    => new { action = "setPitch",    angle = req.Angle },
            _             => throw new InvalidOperationException(), // unreachable
        };

        var farmId      = config["Mqtt:FarmId"];
        var topic       = $"farm/{farmId}/windmill/{id}/command";
        var payloadJson = JsonSerializer.Serialize(mqttPayload);

        await mqtt.PublishAsync(topic, payloadJson);

        // ── Persist audit record ──────────────────────────────────────────────
        var issuedBy = User.FindFirstValue(ClaimTypes.Name)
                    ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue("sub")
                    ?? "unknown";

        db.OperatorCommands.Add(new OperatorCommand
        {
            TurbineId = id,
            Action    = req.Action,
            Payload   = payloadJson,
            IssuedBy  = issuedBy,
            IssuedAt  = DateTime.UtcNow,
            Status    = "Sent",
        });
        await db.SaveChangesAsync();

        return Ok(new { sent = true, action = req.Action, issuedBy });
    }

    // GET /api/turbines/{id}/commands?limit=50 — full command audit log
    [Authorize]
    [HttpGet("{id}/commands")]
    public async Task<IActionResult> GetCommands(string id, [FromQuery] int limit = 50)
    {
        var t = await db.Turbines.FindAsync(id);
        if (t is null) return NotFound();

        var commands = await db.OperatorCommands
            .Where(c => c.TurbineId == id)
            .OrderByDescending(c => c.IssuedAt)
            .Take(limit)
            .ToListAsync();

        return Ok(commands);
    }

    // POST /api/turbines/{id}/maintenance — enter or exit maintenance mode
    [HttpPost("{id}/maintenance")]
    public async Task<IActionResult> SetMaintenance(string id, [FromBody] MaintenanceRequest req)
    {
        var t = await db.Turbines.FindAsync(id);
        if (t is null) return NotFound();

        t.IsInMaintenance   = req.Enable;
        t.MaintenanceSince  = req.Enable ? DateTime.UtcNow : null;
        t.MaintenanceReason = req.Enable ? req.Reason       : null;

        await db.SaveChangesAsync();

        return Ok(new { t.Id, t.IsInMaintenance, t.MaintenanceSince, t.MaintenanceReason });
    }
}

public record MaintenanceRequest(
    [property: JsonPropertyName("enable")] bool    Enable,
    [property: JsonPropertyName("reason")] string? Reason = null);

public record TurbineCommandRequest(
    [property: JsonPropertyName("action")] string  Action,
    [property: JsonPropertyName("reason")] string? Reason = null,
    [property: JsonPropertyName("value")]  int?    Value  = null,
    [property: JsonPropertyName("angle")]  double? Angle  = null);
