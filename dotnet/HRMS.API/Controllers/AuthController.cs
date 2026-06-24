using System.Security.Claims;
using HRMS.Application.DTOs;
using HRMS.Domain.Common;
using HRMS.Domain.Identity;
using HRMS.Infrastructure.Auth;
using HRMS.Infrastructure.Persistence;
using HRMS.Infrastructure.Seed;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HRMS.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(HrmsDbContext db, JwtService jwt) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginDto body)
    {
        var email = body.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null || !PasswordHasher.Verify(body.Password, user.PasswordHash))
            return Unauthorized(new { detail = "Invalid credentials" });

        var token = jwt.CreateToken(user);
        SetAuthCookie(token);
        return new AuthResponse(token, ToDto(user));
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterDto body)
    {
        var email = body.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email))
            return BadRequest(new { detail = "Email already exists" });

        var user = new User
        {
            Email = email, PasswordHash = PasswordHasher.Hash(body.Password),
            Name = body.Name,
            Role = Enum.TryParse<UserRole>(body.Role, true, out var r) ? r : UserRole.Employee,
            Designation = "Employee", Department = "General",
            JoiningDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var token = jwt.CreateToken(user);
        SetAuthCookie(token);
        return new AuthResponse(token, ToDto(user));
    }

    [HttpGet("me"), Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        var id = AuthHelpers.CurrentUserId(User);
        var user = await db.Users.FindAsync(id);
        return user == null ? Unauthorized() : ToDto(user);
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("access_token", new CookieOptions { Path = "/" });
        return Ok(new { ok = true });
    }

    [HttpGet("demo-users")]
    public ActionResult<IEnumerable<DemoUserDto>> DemoUsers() =>
        DataSeeder.DemoUsers
            .Select(d => new DemoUserDto(d.Email, d.Password, d.Name, d.Role.ToString().ToLowerInvariant()))
            .ToList();

    private void SetAuthCookie(string token) =>
        Response.Cookies.Append("access_token", token, new CookieOptions
        {
            HttpOnly = true, Secure = true, SameSite = SameSiteMode.Lax,
            Path = "/", MaxAge = TimeSpan.FromDays(7),
        });

    internal static UserDto ToDto(User u) => new(
        u.Id, u.Email, u.Name, u.Role.ToString().ToLowerInvariant(),
        u.Designation, u.Department, u.Country, u.IsOnboarding,
        u.ManagerId, u.JoiningDate, u.AvatarColor);
}

internal static class AuthHelpers
{
    public static Guid CurrentUserId(ClaimsPrincipal principal)
    {
        var sub = principal.FindFirstValue("sub") ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var g) ? g : Guid.Empty;
    }

    public static string CurrentRole(ClaimsPrincipal principal) =>
        principal.FindFirstValue(ClaimTypes.Role)?.ToLowerInvariant() ?? "employee";

    public static bool InRoles(ClaimsPrincipal p, params string[] roles) =>
        roles.Contains(CurrentRole(p), StringComparer.OrdinalIgnoreCase);
}
