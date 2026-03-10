using System.Text.Json.Serialization;

namespace WindTurbineApi.DTOs;

public record LoginRequest(
    [property: JsonPropertyName("email")]    string Email,
    [property: JsonPropertyName("password")] string Password);
