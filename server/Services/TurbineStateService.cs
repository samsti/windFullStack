namespace WindTurbineApi.Services;

public class TurbineStateService
{
    private readonly HashSet<string> _configured = [];
    private readonly Lock _lock = new();

    public bool MarkIfNew(string turbineId)
    {
        lock (_lock)
            return _configured.Add(turbineId);
    }
}
