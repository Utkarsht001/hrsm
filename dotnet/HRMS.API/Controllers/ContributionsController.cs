using HRMS.Application.DTOs;
using HRMS.Domain.Misc;
using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api/contributions")]
public class ContributionsController(HrmsDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<Contribution>> List() =>
        await db.Contributions.AsNoTracking().OrderByDescending(c => c.CreatedAt).Take(100).ToListAsync();

    [HttpPost]
    public async Task<ActionResult<Contribution>> Create([FromBody] ContributionDto body)
    {
        var me = AuthHelpers.CurrentUserId(User);
        var user = await db.Users.FindAsync(me);
        var c = new Contribution
        {
            UserId = me, UserName = user?.Name ?? "",
            Title = body.Title, Description = body.Description,
            Type = body.Type, Category = body.Category,
            Points = 0, SuggestedPoints = body.SuggestedPoints,
            Impact = body.Impact, Status = "proposal-pending",
            Tags = body.Tags ?? new(), ApproverId = user?.ManagerId,
        };
        db.Contributions.Add(c);
        await db.SaveChangesAsync();
        return c;
    }

    [HttpPost("{id}/action")]
    public async Task<IActionResult> Action(Guid id, [FromBody] ContributionActionDto body)
    {
        if (!AuthHelpers.InRoles(User, "manager", "hr", "admin")) return Forbid();
        var c = await db.Contributions.FindAsync(id);
        if (c == null) return NotFound();
        var approving = body.Action == "approve";
        c.Status = approving ? "approved-to-start" : "rejected";
        c.ApprovalStatus = approving ? "approved" : "rejected";
        c.Points = approving ? (body.FinalPoints ?? 0) : 0;
        c.ApprovalDate = DateTime.UtcNow;
        c.ApprovalComments = body.Comments;
        c.ApproverId = AuthHelpers.CurrentUserId(User);
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [HttpGet("items")]
    public async Task<IEnumerable<ContributionItem>> Items() =>
        await db.ContributionItems.AsNoTracking().Where(i => i.Status == "available").ToListAsync();

    [HttpPost("items/{id}/claim")]
    public async Task<ActionResult<Contribution>> Claim(Guid id)
    {
        var me = AuthHelpers.CurrentUserId(User);
        var user = await db.Users.FindAsync(me);
        var item = await db.ContributionItems.FindAsync(id);
        if (item == null || item.Status != "available") return BadRequest(new { detail = "Item not available" });
        item.Status = "claimed";
        item.ClaimedBy = me;
        item.ClaimedAt = DateTime.UtcNow;

        var c = new Contribution
        {
            UserId = me, UserName = user?.Name ?? "",
            Title = item.Title, Description = $"Claimed contribution: {item.Title}",
            Type = "committed", Category = item.Category,
            SuggestedPoints = item.SuggestedPoints, Impact = "medium",
            Status = "in-progress", ApproverId = user?.ManagerId,
        };
        db.Contributions.Add(c);
        await db.SaveChangesAsync();
        return c;
    }

    [HttpGet("leaderboard")]
    public async Task<ActionResult> Leaderboard()
    {
        var rows = await db.Contributions.AsNoTracking()
            .Where(c => c.ApprovalStatus == "approved")
            .GroupBy(c => new { c.UserId, c.UserName })
            .Select(g => new
            {
                user_id = g.Key.UserId,
                name = g.Key.UserName,
                total_points = g.Sum(x => x.Points),
                contributions = g.Count(),
            })
            .OrderByDescending(r => r.total_points).Take(20).ToListAsync();

        return Ok(rows.Select((r, i) => new
        {
            rank = i + 1, r.user_id, r.name, r.total_points, r.contributions,
            badges = i == 0 ? new[] { "Champion" } : i < 3 ? new[] { "Rising Star" } : Array.Empty<string>(),
            average_rating = Math.Round(4.5 - i * 0.1, 1),
        }));
    }
}
