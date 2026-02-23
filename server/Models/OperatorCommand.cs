namespace WindTurbineApi.Models;

public class OperatorCommand
{
    public int Id { get; set; }
    public string TurbineId { get; set; } = string.Empty;
    public Turbine Turbine { get; set; } = null!;

    public string Action { get; set; } = string.Empty;

    public string Payload { get; set; } = string.Empty;

    public string IssuedBy { get; set; } = string.Empty;   
    public DateTime IssuedAt { get; set; }
    public string Status { get; set; } = "Sent";           
}
