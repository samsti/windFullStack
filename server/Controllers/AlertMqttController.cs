using Mqtt.Controllers;
using WindTurbineApi.Data;
using WindTurbineApi.DTOs;
using WindTurbineApi.Models;

namespace WindTurbineApi.Controllers;

public class AlertMqttController(
    ILogger<AlertMqttController> logger,
    AppDbContext db) : MqttController
{
    private static readonly HashSet<string> ValidSeverities = ["Critical", "Warning", "Info"];

    [MqttRoute("farm/+/windmill/{turbineId}/alert")]
    public async Task HandleAlert(string turbineId, TurbineAlert data)
    {
        if (!ValidSeverities.Contains(data.Severity))
        {
            logger.LogWarning("Rejected alert from {TurbineId}: invalid severity '{Severity}'", turbineId, data.Severity);
            return;
        }

        if (string.IsNullOrWhiteSpace(data.Message) || data.Message.Length > 300)
        {
            logger.LogWarning("Rejected alert from {TurbineId}: invalid message length", turbineId);
            return;
        }

        logger.LogInformation("Alert from {TurbineId}: [{Severity}] {Message}",
            turbineId, data.Severity, data.Message);

        db.Alerts.Add(new Alert
        {
            TurbineId   = turbineId,
            Severity    = data.Severity,
            Message     = data.Message,
            TriggeredAt = data.Timestamp,
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Saved alert for turbine {TurbineId}", turbineId);
    }
}

