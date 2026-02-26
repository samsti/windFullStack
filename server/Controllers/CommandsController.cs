using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WindTurbineApi.Data;

namespace WindTurbineApi.Controllers;

[ApiController]
[Route("api/commands")]
public class CommandsController(AppDbContext db) : ControllerBase
{
    // GET /api/commands?turbineId=wt-01&limit=200
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? turbineId = null,
        [FromQuery] int     limit     = 200)
    {
        var q = db.OperatorCommands
            .Include(c => c.Turbine)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(turbineId))
            q = q.Where(c => c.TurbineId == turbineId);

        var commands = await q
            .OrderByDescending(c => c.IssuedAt)
            .Take(limit)
            .Select(c => new
            {
                c.Id,
                c.TurbineId,
                TurbineName = c.Turbine.Name,
                c.Action,
                c.Payload,
                c.IssuedBy,
                c.IssuedAt,
                c.Status,
            })
            .ToListAsync();

        return Ok(commands);
    }
}
