namespace WindTurbineApi.Models;

public class Turbine
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public bool IsOnline { get; set; }
    public DateTime LastSeenAt { get; set; }

    public bool      IsInMaintenance   { get; set; }
    public DateTime? MaintenanceSince  { get; set; }
    public string?   MaintenanceReason { get; set; }

    public ICollection<TurbineMetric> Metrics { get; set; } = [];
    public ICollection<Alert> Alerts { get; set; } = [];
    public ICollection<OperatorCommand> Commands { get; set; } = [];
}
