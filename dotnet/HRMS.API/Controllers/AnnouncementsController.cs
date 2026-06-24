using HRMS.Application.DTOs;
using HRMS.Domain.Misc;
using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api/announcements")]
public class AnnouncementsController(HrmsDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<Announcement>> List() =>
        await db.Announcements.AsNoTracking().OrderByDescending(a => a.CreatedAt).Take(100).ToListAsync();

    [HttpPost]
    public async Task<ActionResult<Announcement>> Create([FromBody] AnnouncementDto body)
    {
        if (!AuthHelpers.InRoles(User, "hr", "admin")) return Forbid();
        var me = AuthHelpers.CurrentUserId(User);
        var user = await db.Users.FindAsync(me);
        var a = new Announcement
        {
            AuthorId = me, AuthorName = user?.Name ?? "",
            Title = body.Title, Content = body.Content,
            Category = body.Category, Priority = body.Priority,
            Visibility = body.Visibility, Target = body.Target ?? new(), Expiry = body.Expiry,
        };
        db.Announcements.Add(a);
        await db.SaveChangesAsync();
        return a;
    }

    [HttpPost("{id}/acknowledge")]
    public async Task<IActionResult> Ack(Guid id)
    {
        var a = await db.Announcements.FindAsync(id);
        if (a == null) return NotFound();
        a.Acknowledgments += 1;
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}
