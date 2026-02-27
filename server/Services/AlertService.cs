using Microsoft.EntityFrameworkCore;
using WindTurbineApi.Data;
using WindTurbineApi.Models;

namespace WindTurbineApi.Services;

public class AlertService(AppDbContext db)
{
    // ── Threshold alert generation ───────────────────────────────────────────

    private record ThresholdCheck(string MetricLabel, string Severity, string Message);

    private static List<ThresholdCheck> EvaluateThresholds(
        bool running,
        double generatorTemp,
        double gearboxTemp,
        double rotorSpeed,
        double vibration,
        double windSpeed)
    {
        var results = new List<ThresholdCheck>();

        // Generator temperature
        if (generatorTemp > 80)
            results.Add(new("Generator Temp", "Critical", $"Generator Temp critical: {generatorTemp:F1}°C (limit 80°C)"));
        else if (generatorTemp > 65)
            results.Add(new("Generator Temp", "Warning", $"Generator Temp warning: {generatorTemp:F1}°C (limit 65°C)"));

        // Gearbox temperature
        if (gearboxTemp > 80)
            results.Add(new("Gearbox Temp", "Critical", $"Gearbox Temp critical: {gearboxTemp:F1}°C (limit 80°C)"));
        else if (gearboxTemp > 65)
            results.Add(new("Gearbox Temp", "Warning", $"Gearbox Temp warning: {gearboxTemp:F1}°C (limit 65°C)"));

        // Vibration
        if (vibration > 4.0)
            results.Add(new("Vibration", "Critical", $"Vibration critical: {vibration:F2} g (limit 4.00 g)"));
        else if (vibration > 2.0)
            results.Add(new("Vibration", "Warning", $"Vibration warning: {vibration:F2} g (limit 2.00 g)"));

        // Rotor speed (only meaningful when running)
        if (running)
        {
            if (rotorSpeed > 23 || rotorSpeed < 2)
                results.Add(new("Rotor Speed", "Critical", $"Rotor Speed critical: {rotorSpeed:F1} RPM (range 2–23 RPM)"));
            else if (rotorSpeed > 20 || rotorSpeed < 5)
                results.Add(new("Rotor Speed", "Warning", $"Rotor Speed warning: {rotorSpeed:F1} RPM (range 5–20 RPM)"));

            // Wind speed
            if (windSpeed > 25 || windSpeed < 2)
                results.Add(new("Wind Speed", "Critical", $"Wind Speed critical: {windSpeed:F1} m/s (range 2–25 m/s)"));
            else if (windSpeed > 20 || windSpeed < 5)
                results.Add(new("Wind Speed", "Warning", $"Wind Speed warning: {windSpeed:F1} m/s (range 5–20 m/s)"));
        }

        return results;
    }

    /// <summary>
    /// Checks telemetry values against thresholds and adds Alert entities to the
    /// DbContext for any violation that has no existing unacknowledged alert.
    /// The caller is responsible for calling SaveChangesAsync.
    /// </summary>
    public async Task GenerateThresholdAlertsAsync(
        string turbineId,
        DateTime timestamp,
        bool running,
        bool isInMaintenance,
        double generatorTemp,
        double gearboxTemp,
        double rotorSpeed,
        double vibration,
        double windSpeed)
    {
        if (isInMaintenance) return;
        var checks = EvaluateThresholds(running, generatorTemp, gearboxTemp, rotorSpeed, vibration, windSpeed);
        if (checks.Count == 0) return;

        // Load existing unacknowledged metric labels for this turbine in one query
        var cutoff = timestamp.AddHours(-2);
        var existingLabels = await db.Alerts
            .Where(a => a.TurbineId == turbineId && !a.IsAcknowledged && a.TriggeredAt >= cutoff)
            .Select(a => a.Message)
            .ToListAsync();

        foreach (var check in checks)
        {
            // Skip if there's already an open alert for this metric
            bool alreadyOpen = existingLabels.Any(m => m.StartsWith(check.MetricLabel));
            if (alreadyOpen) continue;

            db.Alerts.Add(new Alert
            {
                TurbineId   = turbineId,
                Severity    = check.Severity,
                Message     = check.Message,
                TriggeredAt = timestamp,
            });
        }
    }

    // ── Query / acknowledge ──────────────────────────────────────────────────

    public async Task<List<Alert>> GetRecentAsync(int limit = 50, bool unackOnly = false)
    {
        var q = db.Alerts
            .Include(a => a.Turbine)
            .OrderByDescending(a => a.TriggeredAt)
            .AsQueryable();

        if (unackOnly)
            q = q.Where(a => !a.IsAcknowledged);

        return await q.Take(limit).ToListAsync();
    }

    public async Task<List<Alert>> GetForTurbineAsync(string turbineId, int limit = 20)
    {
        return await db.Alerts
            .Where(a => a.TurbineId == turbineId)
            .OrderByDescending(a => a.TriggeredAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<Alert?> AcknowledgeAsync(int id)
    {
        var alert = await db.Alerts.FindAsync(id);
        if (alert is null || alert.IsAcknowledged) return alert;

        alert.IsAcknowledged = true;
        alert.AcknowledgedAt  = DateTime.UtcNow;
        alert.AcknowledgedBy  = "operator";
        await db.SaveChangesAsync();
        return alert;
    }
}
