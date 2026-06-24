using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api/analytics")]
public class AnalyticsController(HrmsDbContext db) : ControllerBase
{
    [HttpGet("attendance")]
    public async Task<ActionResult> SelfAttendance()
    {
        var me = AuthHelpers.CurrentUserId(User);
        var docs = await db.Attendance.AsNoTracking().Where(a => a.UserId == me)
            .OrderByDescending(a => a.Date).Take(30).ToListAsync();
        var present = docs.Count(d => d.Status == "present");
        var late = docs.Count(d => d.Status == "late");
        var absent = docs.Count(d => d.Status == "absent");
        var totalHours = docs.Sum(d => d.TotalHours);
        return Ok(new
        {
            days_total = docs.Count,
            present, late, absent,
            total_hours = Math.Round(totalHours, 1),
            avg_hours = present > 0 ? Math.Round(totalHours / present, 1) : 0,
        });
    }

    [HttpGet("hr")]
    public async Task<ActionResult> Hr()
    {
        if (!AuthHelpers.InRoles(User, "manager", "hr", "admin")) return Forbid();
        var total = await db.Users.CountAsync();
        var newJoiners = await db.Users.CountAsync(u => u.IsOnboarding);
        var openJobs = await db.Jobs.CountAsync(j => j.Status == "open");
        var pendingLeave = await db.LeaveRequests.CountAsync(r => r.Status == "pending");
        var pendingExp = await db.Expenses.CountAsync(e => e.Status == "pending-approval");
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        return Ok(new
        {
            headcount = total, new_joiners = newJoiners,
            open_positions = openJobs,
            pending_leave_approvals = pendingLeave,
            pending_expense_approvals = pendingExp,
            by_department = new[]
            {
                new { name = "Engineering", count = await db.Users.CountAsync(u => u.Department == "Engineering") },
                new { name = "People",      count = await db.Users.CountAsync(u => u.Department == "People") },
                new { name = "IT",          count = await db.Users.CountAsync(u => u.Department == "IT") },
            },
            attendance_today = new
            {
                present = await db.Attendance.CountAsync(a => a.Date == today && a.Status == "present"),
                absent  = await db.Attendance.CountAsync(a => a.Date == today && a.Status == "absent"),
            },
        });
    }
}
