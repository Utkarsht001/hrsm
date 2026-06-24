using HRMS.Application.DTOs;
using HRMS.Domain.Misc;
using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api/recognition")]
public class RecognitionController(HrmsDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<Recognition>> Feed() =>
        await db.Recognitions.AsNoTracking().Where(r => r.Visibility == "public")
            .OrderByDescending(r => r.CreatedAt).Take(100).ToListAsync();

    [HttpPost]
    public async Task<ActionResult<Recognition>> Send([FromBody] RecognitionDto body)
    {
        var me = AuthHelpers.CurrentUserId(User);
        var sender = await db.Users.FindAsync(me);
        var recipient = await db.Users.FindAsync(body.RecipientId);
        if (recipient == null) return NotFound(new { detail = "Recipient not found" });
        var rec = new Recognition
        {
            SenderId = me, SenderName = sender?.Name ?? "",
            RecipientId = recipient.Id, RecipientName = recipient.Name,
            Category = body.Category, Message = body.Message, Visibility = body.Visibility,
        };
        db.Recognitions.Add(rec);
        await db.SaveChangesAsync();
        return rec;
    }

    [HttpPost("{id}/like")]
    public async Task<IActionResult> Like(Guid id)
    {
        var r = await db.Recognitions.FindAsync(id);
        if (r == null) return NotFound();
        r.Likes += 1;
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}
