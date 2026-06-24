using HRMS.Application.DTOs;
using HRMS.Domain.Misc;
using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api/training")]
public class TrainingController(HrmsDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult> List()
    {
        var me = AuthHelpers.CurrentUserId(User);
        var modules = await db.TrainingModules.AsNoTracking().ToListAsync();
        var progressByModule = await db.TrainingProgress.AsNoTracking()
            .Where(p => p.UserId == me).ToDictionaryAsync(p => p.ModuleId);

        var result = modules.Select(m =>
        {
            var p = progressByModule.GetValueOrDefault(m.Id);
            return new
            {
                id = m.Id, title = m.Title, category = m.Category, duration_min = m.DurationMin,
                due_date = m.DueDate, mandatory = m.Mandatory, certificate = m.Certificate,
                created_at = m.CreatedAt,
                content = p?.Content ?? m.Content,
                progress = p?.Progress ?? 0,
                status = p?.Status ?? "not-started",
            };
        });
        return Ok(result);
    }

    [HttpPost("{moduleId}/complete-item")]
    public async Task<ActionResult> CompleteItem(Guid moduleId, [FromBody] TrainingProgressItemDto body)
    {
        var me = AuthHelpers.CurrentUserId(User);
        var mod = await db.TrainingModules.FindAsync(moduleId);
        if (mod == null) return NotFound();

        var prog = await db.TrainingProgress.FirstOrDefaultAsync(p => p.UserId == me && p.ModuleId == moduleId);
        if (prog == null)
        {
            prog = new TrainingProgress
            {
                UserId = me, ModuleId = moduleId,
                Content = mod.Content.Select(c => new TrainingContent { Type = c.Type, Title = c.Title, DurationMin = c.DurationMin }).ToList(),
                Status = "in-progress",
            };
            db.TrainingProgress.Add(prog);
        }
        if (body.ContentIndex >= 0 && body.ContentIndex < prog.Content.Count)
            prog.Content[body.ContentIndex].Completed = true;

        var completed = prog.Content.Count(c => c.Completed);
        prog.Progress = prog.Content.Count > 0 ? (int)(completed * 100.0 / prog.Content.Count) : 0;
        prog.Status = prog.Progress == 100 ? "completed" : "in-progress";

        await db.SaveChangesAsync();
        return Ok(new { progress = prog.Progress, status = prog.Status });
    }
}
