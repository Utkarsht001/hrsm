using HRMS.Application.DTOs;
using HRMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController, Authorize]
[Route("api")]
public class UsersTeamController(HrmsDbContext db) : ControllerBase
{
    [HttpGet("users")]
    public async Task<IEnumerable<UserDto>> ListAll() =>
        (await db.Users.AsNoTracking().ToListAsync()).Select(AuthController.ToDto);

    [HttpGet("team")]
    public async Task<IEnumerable<UserDto>> MyTeam()
    {
        var role = AuthHelpers.CurrentRole(User);
        var meId = AuthHelpers.CurrentUserId(User);
        var query = db.Users.AsNoTracking().AsQueryable();
        if (role == "manager")    query = query.Where(u => u.ManagerId == meId);
        else if (role is "hr" or "admin") { /* full roster */ }
        else                              return Array.Empty<UserDto>();
        return (await query.ToListAsync()).Select(AuthController.ToDto);
    }
}
