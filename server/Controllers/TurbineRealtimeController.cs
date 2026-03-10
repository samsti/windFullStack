using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StateleSSE.AspNetCore;
using StateleSSE.AspNetCore.EfRealtime;
using WindTurbineApi.Data;
using WindTurbineApi.Models;

namespace WindTurbineApi.Controllers;

[Authorize]
[ApiController]
public class TurbineRealtimeController(
    ISseBackplane backplane,
    IRealtimeManager realtimeManager,
    AppDbContext db) : RealtimeControllerBase(backplane)
{
    // SSE endpoint 
    [HttpGet("api/turbines/live")]
    public async Task<RealtimeListenResponse<List<object>>> GetLive(string connectionId)
    {
        const string group = "turbines-live";
        await backplane.Groups.AddToGroupAsync(connectionId, group);

        realtimeManager.Subscribe<AppDbContext>(connectionId, group,
            criteria: changes => changes.HasChanges<TurbineMetric>(),
            query: async ctx => await BuildSnapshot(ctx));

        return new RealtimeListenResponse<List<object>>(group, await BuildSnapshot(db));
    }

    private static async Task<List<object>> BuildSnapshot(AppDbContext ctx)
    {
        var result = await ctx.Turbines
            .AsNoTracking()
            .Select(t => (object)new
            {
                t.Id, t.Name, t.Location, t.IsOnline, t.LastSeenAt,
                t.IsInMaintenance, t.MaintenanceSince, t.MaintenanceReason,
                LatestMetric = ctx.TurbineMetrics
                    .Where(m => m.TurbineId == t.Id)
                    .OrderByDescending(m => m.RecordedAt)
                    .FirstOrDefault()
            })
            .ToListAsync();

        return result;
    }
}
