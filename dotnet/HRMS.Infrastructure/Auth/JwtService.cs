using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HRMS.Domain.Identity;
using Microsoft.IdentityModel.Tokens;

namespace HRMS.Infrastructure.Auth;

public class JwtService(string secret, int expiryMinutes = 10080)
{
    private readonly SymmetricSecurityKey _key = new(Encoding.UTF8.GetBytes(secret));

    public string CreateToken(User user)
    {
        var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Role, user.Role.ToString().ToLowerInvariant()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
        };
        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public TokenValidationParameters BuildValidationParameters() => new()
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = _key,
        ClockSkew = TimeSpan.FromMinutes(2),
    };
}

public static class PasswordHasher
{
    public static string Hash(string plain) => BCrypt.Net.BCrypt.HashPassword(plain);
    public static bool Verify(string plain, string hash)
    {
        try { return BCrypt.Net.BCrypt.Verify(plain, hash); } catch { return false; }
    }
}
