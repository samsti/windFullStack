using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WindTurbineApi.Data;

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

            result.Add(new { t.Id, t.Name, t.Location, t.IsOnline, t.LastSeenAt, LatestMetric = latest });
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

        return Ok(new { t.Id, t.Name, t.Location, t.IsOnline, t.LastSeenAt, LatestMetric = latest });
    }

    // GET /api/turbines/overview?minutes=60
    // Minute-bucketed aggregates across all turbines (total power, avg wind speed, etc.)
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview([FromQuery] int minutes = 60)
    {
        var since = DateTime.UtcNow.AddMinutes(-minutes);

        var all = await db.TurbineMetrics
            .Where(m => m.RecordedAt >= since)
            .OrderBy(m => m.RecordedAt)
            .ToListAsync();

        var timeSeries = all
            .GroupBy(m => new DateTime(
                m.RecordedAt.Ticks / TimeSpan.TicksPerMinute * TimeSpan.TicksPerMinute,
                DateTimeKind.Utc))
            .Select(g => new
            {
                RecordedAt      = g.Key,
                TotalPower      = Math.Round(g.Sum(m => m.PowerOutput), 1),
                AvgWindSpeed    = Math.Round(g.Average(m => m.WindSpeed), 2),
                AvgGeneratorTemp = Math.Round(g.Average(m => m.GeneratorTemp), 1),
                AvgVibration    = Math.Round(g.Average(m => m.Vibration), 3),
                ActiveTurbines  = g.Select(m => m.TurbineId).Distinct().Count(),
            })
            .OrderBy(g => g.RecordedAt)
            .ToList();

        return Ok(timeSeries);
    }

    // GET /api/turbines/{id}/metrics?minutes=60 — time-series history for charts
    [HttpGet("{id}/metrics")]
    public async Task<IActionResult> GetMetrics(string id, [FromQuery] int minutes = 60)
    {
        var since = DateTime.UtcNow.AddMinutes(-minutes);
        var metrics = await db.TurbineMetrics
            .Where(m => m.TurbineId == id && m.RecordedAt >= since)
            .OrderBy(m => m.RecordedAt)
            .ToListAsync();

        return Ok(metrics);
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
}
