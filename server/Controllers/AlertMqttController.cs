using Mqtt.Controllers;
using WindTurbineApi.Data;
using WindTurbineApi.DTOs;
using WindTurbineApi.Models;

namespace WindTurbineApi.Controllers;

public class AlertMqttController(
    ILogger<AlertMqttController> logger,
    AppDbContext db) : MqttController
{
    [MqttRoute("farm/+/windmill/{turbineId}/alert")]
    public async Task HandleAlert(string turbineId, TurbineAlert data)
    {
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

