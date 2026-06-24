using HRMS.Application.DTOs;
using HRMS.Domain.Misc;
using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api/recruitment")]
public class RecruitmentController(HrmsDbContext db) : ControllerBase
{
    [HttpGet("jobs")]
    public async Task<IEnumerable<Job>> Jobs() =>
        await db.Jobs.AsNoTracking().ToListAsync();

    [HttpGet("candidates")]
    public async Task<ActionResult<IEnumerable<Candidate>>> Candidates()
    {
        if (!AuthHelpers.InRoles(User, "hr", "admin")) return Forbid();
        return await db.Candidates.AsNoTracking().ToListAsync();
    }

    [HttpPatch("candidates/{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CandidateUpdateDto body)
    {
        if (!AuthHelpers.InRoles(User, "hr", "admin")) return Forbid();
        var c = await db.Candidates.FindAsync(id);
        if (c == null) return NotFound();
        c.Status = body.Status;
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}
