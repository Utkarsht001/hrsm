using HRMS.Application.DTOs;
using HRMS.Domain.Misc;
using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api")]
public class PerformanceController(HrmsDbContext db) : ControllerBase
{
    [HttpGet("goals")]
    public async Task<IEnumerable<Goal>> Goals()
    {
        var me = AuthHelpers.CurrentUserId(User);
        return await db.Goals.AsNoTracking().Where(g => g.UserId == me).ToListAsync();
    }

    [HttpPost("goals")]
    public async Task<ActionResult<Goal>> Create([FromBody] GoalDto body)
    {
        var me = AuthHelpers.CurrentUserId(User);
        var goal = new Goal
        {
            UserId = me, Title = body.Title, Description = body.Description,
            Category = body.Category, Type = body.Type, Weight = body.Weight,
            DueDate = body.DueDate, Status = "not-started", Progress = 0,
        };
        db.Goals.Add(goal);
        await db.SaveChangesAsync();
        return goal;
    }

    [HttpPatch("goals/{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] GoalProgressDto body)
    {
        var me = AuthHelpers.CurrentUserId(User);
        var goal = await db.Goals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == me);
        if (goal == null) return NotFound();
        goal.Progress = Math.Max(0, Math.Min(100, body.Progress));
        goal.Status = body.Status ?? (goal.Progress >= 100 ? "completed" : goal.Progress > 0 ? "in-progress" : "not-started");
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [HttpGet("reviews")]
    public async Task<IEnumerable<Review>> Reviews()
    {
        var me = AuthHelpers.CurrentUserId(User);
        return await db.Reviews.AsNoTracking().Where(r => r.UserId == me)
            .OrderByDescending(r => r.CreatedAt).Take(20).ToListAsync();
    }
}
