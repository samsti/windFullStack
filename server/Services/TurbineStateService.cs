namespace WindTurbineApi.Services;

/// <summary>
/// Singleton that tracks which turbines have already received the
/// setInterval command so it is only sent once per server session.
/// </summary>
public class TurbineStateService
{
    private readonly HashSet<string> _configured = [];
    private readonly Lock _lock = new();

    /// <summary>Returns true the first time this turbineId is seen.</summary>
    public bool MarkIfNew(string turbineId)
    {
        lock (_lock)
            return _configured.Add(turbineId);
    }
}
