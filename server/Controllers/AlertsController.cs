using Microsoft.AspNetCore.Mvc;
using WindTurbineApi.Services;

namespace WindTurbineApi.Controllers;

[ApiController]
[Route("api/alerts")]
public class AlertsController(AlertService alertService) : ControllerBase
{
    // GET /api/alerts?limit=50&unackOnly=false
    [HttpGet]
    public async Task<IActionResult> GetAlerts(
        [FromQuery] int  limit    = 50,
        [FromQuery] bool unackOnly = false)
    {
        var alerts = await alertService.GetRecentAsync(limit, unackOnly);
        return Ok(alerts.Select(a => new
        {
            a.Id,
            a.TurbineId,
            TurbineName    = a.Turbine?.Name,
            a.Severity,
            a.Message,
            a.TriggeredAt,
            a.IsAcknowledged,
            a.AcknowledgedAt,
            a.AcknowledgedBy,
        }));
    }

    // POST /api/alerts/{id}/acknowledge
    [HttpPost("{id}/acknowledge")]
    public async Task<IActionResult> Acknowledge(int id)
    {
        var alert = await alertService.AcknowledgeAsync(id);
        if (alert is null) return NotFound();
        return Ok(new
        {
            alert.Id,
            alert.IsAcknowledged,
            alert.AcknowledgedAt,
            alert.AcknowledgedBy,
        });
    }
}
