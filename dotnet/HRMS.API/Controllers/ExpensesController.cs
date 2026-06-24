using HRMS.Application.DTOs;
using HRMS.Domain.Misc;
using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api/expenses")]
public class ExpensesController(HrmsDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<Expense>> Mine()
    {
        var me = AuthHelpers.CurrentUserId(User);
        return await db.Expenses.AsNoTracking().Where(e => e.UserId == me)
            .OrderByDescending(e => e.SubmittedAt).Take(100).ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Expense>> Submit([FromBody] ExpenseDto body)
    {
        var me = AuthHelpers.CurrentUserId(User);
        var user = await db.Users.FindAsync(me);
        var withinLimit = body.Amount <= 1000m;
        var exp = new Expense
        {
            UserId = me, UserName = user?.Name ?? "",
            Category = body.Category, Amount = body.Amount, Currency = body.Currency,
            Description = body.Description, Date = body.Date, Taxable = body.Taxable,
            Status = "pending-approval",
            WithinLimit = withinLimit,
            PolicyValidationMessage = withinLimit ? "Within policy" : "Exceeds $1000 limit — requires HR approval",
            ApproverId = user?.ManagerId,
        };
        db.Expenses.Add(exp);
        await db.SaveChangesAsync();
        return exp;
    }

    [HttpGet("approvals")]
    public async Task<ActionResult<IEnumerable<Expense>>> Approvals()
    {
        if (!AuthHelpers.InRoles(User, "manager", "hr", "admin")) return Forbid();
        var me = AuthHelpers.CurrentUserId(User);
        if (AuthHelpers.CurrentRole(User) == "manager")
        {
            var teamIds = await db.Users.Where(u => u.ManagerId == me).Select(u => u.Id).ToListAsync();
            return await db.Expenses.AsNoTracking()
                .Where(e => teamIds.Contains(e.UserId) && e.Status == "pending-approval").ToListAsync();
        }
        return await db.Expenses.AsNoTracking().Where(e => e.Status == "pending-approval").ToListAsync();
    }

    [HttpPost("{id}/action")]
    public async Task<IActionResult> Action(Guid id, [FromBody] ApprovalActionDto body)
    {
        if (!AuthHelpers.InRoles(User, "manager", "hr", "admin")) return Forbid();
        var exp = await db.Expenses.FindAsync(id);
        if (exp == null) return NotFound();
        exp.Status = body.Action == "approve" ? "approved" : "rejected";
        exp.ApproverComments = body.Comments;
        exp.ApproverId = AuthHelpers.CurrentUserId(User);
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}
