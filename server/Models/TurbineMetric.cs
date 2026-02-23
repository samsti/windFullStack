namespace WindTurbineApi.Models;
public class TurbineMetric
{
    public int Id { get; set; }
    public string TurbineId { get; set; } = string.Empty;
    public Turbine Turbine { get; set; } = null!;

    public DateTime RecordedAt { get; set; }

    public double WindSpeed { get; set; }           
    public double WindDirection { get; set; }      
    public double AmbientTemperature { get; set; } 
    public double RotorSpeed { get; set; }       
    public double PowerOutput { get; set; }        
    public double NacelleDirection { get; set; }    
    public double BladePitch { get; set; }          
    public double GeneratorTemp { get; set; }       
    public double GearboxTemp { get; set; }      
    public double Vibration { get; set; }
    public string Status { get; set; } = string.Empty;
}
