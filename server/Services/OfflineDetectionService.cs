using Microsoft.EntityFrameworkCore;
using WindTurbineApi.Data;
using WindTurbineApi.Models;

namespace WindTurbineApi.Services;

public class OfflineDetectionService(
    IServiceScopeFactory scopeFactory,
    ILogger<OfflineDetectionService> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(60);
    private static readonly TimeSpan StaleAge      = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await DetectAsync(stoppingToken); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "OfflineDetectionService error");
            }

            await Task.Delay(CheckInterval, stoppingToken);
        }
    }

    private async Task DetectAsync(CancellationToken ct)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db  = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var cutoff = DateTime.UtcNow - StaleAge;

        var stale = await db.Turbines
            .Where(t => t.IsOnline && t.LastSeenAt < cutoff)
            .ToListAsync(ct);

        if (stale.Count == 0) return;

        logger.LogInformation("OfflineDetection: marking {Count} turbine(s) offline", stale.Count);

        var now = DateTime.UtcNow;
        var alertCutoff = now.AddHours(-24);

        foreach (var t in stale)
        {
            t.IsOnline = false;

            if (t.IsInMaintenance) continue;

            bool alreadyAlerted = await db.Alerts.AnyAsync(a =>
                a.TurbineId       == t.Id  &&
                !a.IsAcknowledged          &&
                a.Message.StartsWith("Offline") &&
                a.TriggeredAt     >= alertCutoff, ct);

            if (alreadyAlerted) continue;

            db.Alerts.Add(new Alert
            {
                TurbineId   = t.Id,
                Severity    = "Warning",
                Message     = $"Offline: no telemetry for >{(int)StaleAge.TotalMinutes} min (last seen {t.LastSeenAt:HH:mm} UTC)",
                TriggeredAt = now,
            });

            logger.LogWarning("Turbine {Id} offline — last seen {LastSeen}", t.Id, t.LastSeenAt);
        }

        await db.SaveChangesAsync(ct);
    }
}
