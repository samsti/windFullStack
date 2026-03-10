using System.Text.Json;
using Mqtt.Controllers;
using WindTurbineApi.Data;
using WindTurbineApi.DTOs;
using WindTurbineApi.Models;
using WindTurbineApi.Services;

namespace WindTurbineApi.Controllers;

public class TelemetryMqttController(
    ILogger<TelemetryMqttController> logger,
    AppDbContext db,
    IMqttClientService mqtt,
    TurbineStateService state,
    IConfiguration config,
    AlertService alerts) : MqttController
{
    [MqttRoute("farm/+/windmill/{turbineId}/telemetry")]
    public async Task HandleTelemetry(string turbineId, TurbineTelemetry data)
    {
        logger.LogInformation("Telemetry from {TurbineId}", turbineId);

        var turbine = await db.Turbines.FindAsync(turbineId);
        if (turbine is null)
        {
            turbine = new Turbine { Id = turbineId, Name = data.TurbineName, Location = string.Empty };
            db.Turbines.Add(turbine);

            // First contact — set the reporting interval
            if (state.MarkIfNew(turbineId))
            {
                var interval = config.GetValue<int>("Mqtt:ReportingIntervalSeconds");
                var farmId   = config["Mqtt:FarmId"];
                var topic    = $"farm/{farmId}/windmill/{turbineId}/command";
                var payload  = JsonSerializer.Serialize(new { action = "setInterval", value = interval });
                await mqtt.PublishAsync(topic, payload);
                logger.LogInformation("Sent setInterval={Interval}s to {TurbineId}", interval, turbineId);
            }
        }
        else
        {
            turbine.IsOnline   = data.Status == "running";
            turbine.LastSeenAt = data.Timestamp;
        }

        db.TurbineMetrics.Add(new TurbineMetric
        {
            TurbineId          = turbineId,
            RecordedAt         = data.Timestamp,
            WindSpeed          = data.WindSpeed,
            WindDirection      = data.WindDirection,
            AmbientTemperature = data.AmbientTemperature,
            RotorSpeed         = data.RotorSpeed,
            PowerOutput        = data.PowerOutput,
            NacelleDirection   = data.NacelleDirection,
            BladePitch         = data.BladePitch,
            GeneratorTemp      = data.GeneratorTemp,
            GearboxTemp        = data.GearboxTemp,
            Vibration          = data.Vibration,
            Status             = data.Status,
        });

        await alerts.GenerateThresholdAlertsAsync(
            turbineId,
            data.Timestamp,
            running:         data.Status == "running",
            isInMaintenance: turbine.IsInMaintenance,
            generatorTemp:   data.GeneratorTemp,
            gearboxTemp:   data.GearboxTemp,
            rotorSpeed:    data.RotorSpeed,
            vibration:     data.Vibration,
            windSpeed:     data.WindSpeed);

        await db.SaveChangesAsync();
        logger.LogInformation("Saved telemetry for turbine {TurbineId}", turbineId);
    }
}

