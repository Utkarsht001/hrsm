using HRMS.Application.DTOs;
using HRMS.Domain.Misc;
using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api/documents")]
public class DocumentsController(HrmsDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<Document>> Mine()
    {
        var me = AuthHelpers.CurrentUserId(User);
        return await db.Documents.AsNoTracking().Where(d => d.UserId == me).ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Document>> Upload([FromBody] DocumentUploadDto body)
    {
        var me = AuthHelpers.CurrentUserId(User);
        var doc = new Document { UserId = me, Category = body.Category, Name = body.Name, Expiry = body.Expiry, Status = "uploaded" };
        db.Documents.Add(doc);
        await db.SaveChangesAsync();
        return doc;
    }

    [HttpPost("{id}/status")]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] DocumentStatusDto body)
    {
        if (!AuthHelpers.InRoles(User, "hr", "admin")) return Forbid();
        var doc = await db.Documents.FindAsync(id);
        if (doc == null) return NotFound();
        if (body.Action == "verify")
        {
            doc.Status = "verified";
            doc.VerifiedAt = DateTime.UtcNow;
        }
        else
        {
            doc.Status = "rejected";
            doc.RejectionReason = body.Reason;
        }
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}
