namespace WindTurbineApi.Models;
public class Alert
{
    public int Id { get; set; }
    public string TurbineId { get; set; } = string.Empty;
    public Turbine Turbine { get; set; } = null!;

    public string Severity { get; set; } = string.Empty;  
    public string Message { get; set; } = string.Empty;
    public DateTime TriggeredAt { get; set; }

    public bool IsAcknowledged { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public string? AcknowledgedBy { get; set; }
}
