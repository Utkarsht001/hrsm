using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api/onboarding")]
public class OnboardingController(HrmsDbContext db) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult> Dashboard()
    {
        var me = AuthHelpers.CurrentUserId(User);
        var user = await db.Users.FindAsync(me);
        if (user == null) return Unauthorized();
        if (!user.IsOnboarding) return Ok(new { is_onboarding = false });

        var tasks = await db.OnboardingTasks.AsNoTracking().Where(t => t.UserId == me).ToListAsync();
        var welcomes = await db.WelcomeMessages.AsNoTracking().Where(w => w.UserId == me).ToListAsync();
        var manager = user.ManagerId.HasValue ? await db.Users.FindAsync(user.ManagerId.Value) : null;
        var buddy = await db.Users.FirstOrDefaultAsync(u => u.Email == "sarah@workflow.com");

        var progress = tasks.Count == 0 ? 0
            : (int)(tasks.Count(t => t.Status == "completed") * 100.0 / tasks.Count);

        return Ok(new
        {
            is_onboarding = true,
            progress,
            tasks,
            welcome_messages = welcomes,
            manager_name = manager?.Name ?? "—",
            buddy_name = buddy?.Name ?? "—",
            relocation = new
            {
                status = "in-progress", visa_status = "approved",
                accommodation = "Booked - Hyatt House",
                travel = "Flight UA-845 on 2026-01-31",
                allowance_usd = 3500, local_buddy = buddy?.Name ?? "—",
                tickets = new[] { new { id = "RT-001", title = "Apartment search", status = "open" } },
            },
            team_intros = new[]
            {
                new { name = "Michael Chen",   role = "Engineering Manager", bio = "10 years in distributed systems.", expertise = new[] { "C#", "K8s" }, fun_fact = "Marathon runner" },
                new { name = "Sarah Mitchell", role = "Software Engineer",   bio = "Frontend & DX enthusiast.",       expertise = new[] { "React", "TypeScript" }, fun_fact = "Bakes sourdough" },
            },
            milestones = new[]
            {
                new { title = "Day 1 - Welcome",      date = "2026-02-01", status = "upcoming" },
                new { title = "Week 1 Check-in",      date = "2026-02-08", status = "upcoming" },
                new { title = "30-day Review",        date = "2026-03-03", status = "upcoming" },
                new { title = "90-day Celebration",   date = "2026-05-01", status = "upcoming" },
            },
        });
    }

    [HttpPost("tasks/{id}/complete")]
    public async Task<IActionResult> Complete(Guid id)
    {
        var me = AuthHelpers.CurrentUserId(User);
        var task = await db.OnboardingTasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == me);
        if (task == null) return NotFound();
        task.Status = "completed";
        task.CompletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [HttpPost("complete")]
    public async Task<IActionResult> CompleteOnboarding()
    {
        var me = AuthHelpers.CurrentUserId(User);
        var user = await db.Users.FindAsync(me);
        if (user == null) return Unauthorized();
        user.IsOnboarding = false;
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}
