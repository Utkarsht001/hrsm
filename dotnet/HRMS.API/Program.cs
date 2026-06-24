using System.Text.Json.Serialization;
using HRMS.Infrastructure.Ai;
using HRMS.Infrastructure.Auth;
using HRMS.Infrastructure.Persistence;
using HRMS.Infrastructure.Seed;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ----------------------------------------------------------------------------
// Configuration: Postgres connection + JWT secret + Anthropic API key
// ----------------------------------------------------------------------------
var pgConn = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION")
    ?? "Host=localhost;Port=5432;Database=hrms;Username=postgres;Password=postgres";
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? "b9c1f4a7e8d2c6b5a9f3e7d1c8b6a4f2e9d7c5b3a1f8e6d4c2b9a7f5e3d1c8b6";
var llmKey = Environment.GetEnvironmentVariable("EMERGENT_LLM_KEY") ?? "";

// ----------------------------------------------------------------------------
// Services
// ----------------------------------------------------------------------------
builder.Services
    .AddDbContext<HrmsDbContext>(o => o.UseNpgsql(pgConn));

builder.Services.AddSingleton(_ => new JwtService(jwtSecret));
builder.Services.AddHttpClient<EmergentLlmClient>(c => c.Timeout = TimeSpan.FromSeconds(60))
    .AddTypedClient<EmergentLlmClient>((http, _) => new EmergentLlmClient(http, llmKey));

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .SetIsOriginAllowed(_ => true)
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new JwtService(jwtSecret).BuildValidationParameters();
        // Also accept the cookie set by /api/auth/login.
        opts.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (string.IsNullOrEmpty(ctx.Token) &&
                    ctx.Request.Cookies.TryGetValue("access_token", out var cookie))
                {
                    ctx.Token = cookie;
                }
                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();

builder.Services
    .AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
        o.JsonSerializerOptions.DictionaryKeyPolicy = null; // keep dict keys as-stored
    });

builder.Services.Configure<ApiBehaviorOptions>(o => o.SuppressMapClientErrors = false);

var app = builder.Build();

// ----------------------------------------------------------------------------
// Pipeline
// ----------------------------------------------------------------------------
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));

// ----------------------------------------------------------------------------
// Migrate + seed on startup
// ----------------------------------------------------------------------------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();
    await db.Database.EnsureCreatedAsync();
    await DataSeeder.SeedAsync(db);
}

app.Run();
