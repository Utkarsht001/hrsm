using HRMS.Domain.Payroll;
using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api/payroll")]
public class PayrollController(HrmsDbContext db) : ControllerBase
{
    [HttpGet("payslips")]
    public async Task<IEnumerable<Payslip>> Payslips()
    {
        var me = AuthHelpers.CurrentUserId(User);
        return await db.Payslips.AsNoTracking().Where(p => p.UserId == me)
            .OrderByDescending(p => p.PayDate).Take(24).ToListAsync();
    }

    [HttpGet("compliance")]
    public ActionResult Compliance()
    {
        if (!AuthHelpers.InRoles(User, "hr", "admin")) return Forbid();
        return Ok(new
        {
            items = new object[]
            {
                new { name = "PF Filing - January",  country = "IN", status = "completed",   due_date = "2026-02-15" },
                new { name = "ESI Filing - January", country = "IN", status = "pending",     due_date = "2026-02-15" },
                new { name = "Form 941 - Q4",        country = "US", status = "completed",   due_date = "2026-01-31" },
                new { name = "W-2 Distribution",     country = "US", status = "in-progress", due_date = "2026-01-31" },
            },
        });
    }
}
