using HRMS.Application.DTOs;
using HRMS.Domain.Leave;
using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api/leave")]
public class LeaveController(HrmsDbContext db) : ControllerBase
{
    [HttpGet("balances")]
    public async Task<IEnumerable<LeaveBalance>> Balances()
    {
        var me = AuthHelpers.CurrentUserId(User);
        return await db.LeaveBalances.AsNoTracking().Where(b => b.UserId == me).ToListAsync();
    }

    [HttpGet("requests")]
    public async Task<IEnumerable<LeaveRequest>> MyRequests()
    {
        var me = AuthHelpers.CurrentUserId(User);
        return await db.LeaveRequests.AsNoTracking().Where(r => r.UserId == me)
            .OrderByDescending(r => r.CreatedAt).Take(50).ToListAsync();
    }

    [HttpPost("requests")]
    public async Task<ActionResult<LeaveRequest>> Submit([FromBody] LeaveRequestDto body)
    {
        var me = AuthHelpers.CurrentUserId(User);
        var user = await db.Users.FindAsync(me);
        if (user == null) return Unauthorized();

        var days = Math.Max(1, (DateTime.Parse(body.EndDate) - DateTime.Parse(body.StartDate)).Days + 1);
        var req = new LeaveRequest
        {
            UserId = me, UserName = user.Name,
            Type = body.Type, StartDate = body.StartDate, EndDate = body.EndDate,
            TotalDays = days, Reason = body.Reason, Status = "pending",
            ApproverId = user.ManagerId,
        };
        db.LeaveRequests.Add(req);

        var bal = await db.LeaveBalances.FirstOrDefaultAsync(b => b.UserId == me && b.Type == body.Type);
        if (bal != null)
        {
            bal.Pending += days;
            bal.Available -= days;
        }
        await db.SaveChangesAsync();
        return req;
    }

    [HttpGet("approvals")]
    public async Task<ActionResult<IEnumerable<LeaveRequest>>> Approvals()
    {
        if (!AuthHelpers.InRoles(User, "manager", "hr", "admin")) return Forbid();
        var role = AuthHelpers.CurrentRole(User);
        var me = AuthHelpers.CurrentUserId(User);

        if (role == "manager")
        {
            var teamIds = await db.Users.Where(u => u.ManagerId == me).Select(u => u.Id).ToListAsync();
            return await db.LeaveRequests.AsNoTracking()
                .Where(r => teamIds.Contains(r.UserId) && r.Status == "pending").ToListAsync();
        }
        return await db.LeaveRequests.AsNoTracking().Where(r => r.Status == "pending").ToListAsync();
    }

    [HttpPost("requests/{id}/action")]
    public async Task<IActionResult> Action(Guid id, [FromBody] ApprovalActionDto body)
    {
        if (!AuthHelpers.InRoles(User, "manager", "hr", "admin")) return Forbid();
        var req = await db.LeaveRequests.FindAsync(id);
        if (req == null) return NotFound();
        var approving = body.Action == "approve";
        req.Status = approving ? "approved" : "rejected";
        req.ApproverComments = body.Comments;
        req.ApproverId = AuthHelpers.CurrentUserId(User);

        var bal = await db.LeaveBalances.FirstOrDefaultAsync(b => b.UserId == req.UserId && b.Type == req.Type);
        if (bal != null)
        {
            bal.Pending = Math.Max(0, bal.Pending - req.TotalDays);
            if (approving) bal.Used += req.TotalDays;
            else           bal.Available += req.TotalDays;
        }
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}
