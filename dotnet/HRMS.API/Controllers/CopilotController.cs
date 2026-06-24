using HRMS.Application.DTOs;
using HRMS.Infrastructure.Ai;
using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api/copilot")]
public class CopilotController(HrmsDbContext db, EmergentLlmClient ai) : ControllerBase
{
    [HttpPost("chat")]
    public async Task<ActionResult> Chat([FromBody] CopilotChatDto body, CancellationToken ct)
    {
        var me = AuthHelpers.CurrentUserId(User);
        var user = await db.Users.FindAsync(me);
        if (user == null) return Unauthorized();

        var view = body.Context != null && body.Context.TryGetValue("currentView", out var v) ? v?.ToString() : "home";
        var onboard = body.Context != null && body.Context.TryGetValue("isOnboarding", out var o) && o?.ToString() == "True";

        var system = $@"You are the WorkFlow HR Copilot, an embedded AI assistant inside a Global HRMS app.
You help employees, managers, HR, and admins with HR questions and guide them through tasks.

CURRENT USER CONTEXT:
- Name: {user.Name}
- Role: {user.Role.ToString().ToLowerInvariant()}
- Department: {user.Department}
- Country: {user.Country}
- Designation: {user.Designation}
- Currently viewing: {view}
- Onboarding mode: {onboard || user.IsOnboarding}

GUIDELINES:
- Be concise (3-6 sentences for most answers).
- Tailor advice to the user's role and current view.
- For policy questions, reference common HRMS concepts (PF/ESI for India, 401k/health for US).
- If onboarding, gently guide through next steps (documents, training, team intros).
- Never fabricate company-specific policy details — say ""check with HR"" if uncertain.
- Use friendly, professional tone.";

        try
        {
            var reply = await ai.ChatAsync(system, new[] { ("user", body.Message) }, ct);
            return Ok(new { reply, session_id = body.SessionId ?? $"copilot-{me}" });
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { detail = $"AI provider error: {ex.Message}" });
        }
    }
}
