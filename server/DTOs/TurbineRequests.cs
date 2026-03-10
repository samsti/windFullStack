using System.Text.Json.Serialization;

namespace WindTurbineApi.DTOs;

public record TurbineCommandRequest(
    [property: JsonPropertyName("action")] string  Action,
    [property: JsonPropertyName("reason")] string? Reason = null,
    [property: JsonPropertyName("value")]  int?    Value  = null,
    [property: JsonPropertyName("angle")]  double? Angle  = null);

public record MaintenanceRequest(
    [property: JsonPropertyName("enable")] bool    Enable,
    [property: JsonPropertyName("reason")] string? Reason = null);
