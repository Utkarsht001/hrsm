using HRMS.Application.DTOs;
using HRMS.Domain.Attendance;
using HRMS.Domain.Identity;
using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api/attendance")]
public class AttendanceController(HrmsDbContext db) : ControllerBase
{
    private static string TodayDate() => DateTime.UtcNow.ToString("yyyy-MM-dd");

    [HttpGet("today")]
    public async Task<ActionResult<AttendanceRecord?>> Today()
    {
        var me = AuthHelpers.CurrentUserId(User);
        return await db.Attendance.AsNoTracking()
            .FirstOrDefaultAsync(a => a.UserId == me && a.Date == TodayDate());
    }

    [HttpGet("history")]
    public async Task<IEnumerable<AttendanceRecord>> History()
    {
        var me = AuthHelpers.CurrentUserId(User);
        return await db.Attendance.AsNoTracking().Where(a => a.UserId == me)
            .OrderByDescending(a => a.Date).Take(60).ToListAsync();
    }

    [HttpPost("clock-in")]
    public async Task<ActionResult<AttendanceRecord>> ClockIn([FromBody] ClockInDto body)
    {
        var me = AuthHelpers.CurrentUserId(User);
        var today = TodayDate();
        var rec = await db.Attendance.FirstOrDefaultAsync(a => a.UserId == me && a.Date == today);
        var now = DateTime.UtcNow;
        if (rec == null)
        {
            rec = new AttendanceRecord
            {
                UserId = me, Date = today,
                ClockIn = now, Method = body.Method, Status = "present",
                LocationVerified = true, IpValidated = true,
            };
            db.Attendance.Add(rec);
        }
        else
        {
            rec.ClockIn = now; rec.Method = body.Method; rec.Status = "present";
            rec.LocationVerified = true; rec.IpValidated = true;
        }
        await db.SaveChangesAsync();
        return rec;
    }

    [HttpPost("clock-out")]
    public async Task<ActionResult<AttendanceRecord>> ClockOut()
    {
        var me = AuthHelpers.CurrentUserId(User);
        var today = TodayDate();
        var rec = await db.Attendance.FirstOrDefaultAsync(a => a.UserId == me && a.Date == today);
        if (rec?.ClockIn == null) return BadRequest(new { detail = "Not clocked in" });
        var now = DateTime.UtcNow;
        rec.ClockOut = now;
        rec.TotalHours = Math.Round((now - rec.ClockIn.Value).TotalHours, 2);
        rec.OvertimeHours = Math.Max(0, rec.TotalHours - 8);
        rec.ProductiveHours = Math.Max(0, rec.TotalHours - 0.5);
        rec.BreakHours = 0.5;
        await db.SaveChangesAsync();
        return rec;
    }

    [HttpGet("team")]
    public async Task<ActionResult> TeamToday()
    {
        if (!AuthHelpers.InRoles(User, "manager", "hr", "admin")) return Forbid();
        var today = TodayDate();
        var atts = await db.Attendance.AsNoTracking().Where(a => a.Date == today).ToListAsync();
        var users = await db.Users.AsNoTracking().ToDictionaryAsync(u => u.Id);
        var rows = atts.Select(a => new
        {
            a.Id, a.UserId, a.Status, a.ClockIn, a.ClockOut, a.TotalHours,
            user_name = users.TryGetValue(a.UserId, out var u) ? u.Name : "Unknown",
            department = users.TryGetValue(a.UserId, out var u2) ? u2.Department : "",
        });
        return Ok(rows);
    }
}
