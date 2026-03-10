using System.Text.Json.Serialization;

namespace WindTurbineApi.DTOs;

public record TurbineTelemetry(
    [property: JsonPropertyName("turbineId")]          string   TurbineId,
    [property: JsonPropertyName("turbineName")]        string   TurbineName,
    [property: JsonPropertyName("farmId")]             string   FarmId,
    [property: JsonPropertyName("timestamp")]          DateTime Timestamp,
    [property: JsonPropertyName("windSpeed")]          double   WindSpeed,
    [property: JsonPropertyName("windDirection")]      double   WindDirection,
    [property: JsonPropertyName("ambientTemperature")] double   AmbientTemperature,
    [property: JsonPropertyName("rotorSpeed")]         double   RotorSpeed,
    [property: JsonPropertyName("powerOutput")]        double   PowerOutput,
    [property: JsonPropertyName("nacelleDirection")]   double   NacelleDirection,
    [property: JsonPropertyName("bladePitch")]         double   BladePitch,
    [property: JsonPropertyName("generatorTemp")]      double   GeneratorTemp,
    [property: JsonPropertyName("gearboxTemp")]        double   GearboxTemp,
    [property: JsonPropertyName("vibration")]          double   Vibration,
    [property: JsonPropertyName("status")]             string   Status
);

public record TurbineAlert(
    [property: JsonPropertyName("turbineId")] string   TurbineId,
    [property: JsonPropertyName("farmId")]    string   FarmId,
    [property: JsonPropertyName("timestamp")] DateTime Timestamp,
    [property: JsonPropertyName("severity")]  string   Severity,
    [property: JsonPropertyName("message")]   string   Message
);
