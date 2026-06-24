using HRMS.Domain.Attendance;
using HRMS.Domain.Identity;
using HRMS.Domain.Leave;
using HRMS.Domain.Misc;
using HRMS.Domain.Payroll;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HRMS.Infrastructure.Persistence;

/// <summary>
/// Single DbContext for the modular monolith. Each domain area gets its own
/// DbSet so services can stay cleanly scoped to a single aggregate.
/// </summary>
public class HrmsDbContext(DbContextOptions<HrmsDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<AttendanceRecord> Attendance => Set<AttendanceRecord>();
    public DbSet<LeaveBalance> LeaveBalances => Set<LeaveBalance>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<Payslip> Payslips => Set<Payslip>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Contribution> Contributions => Set<Contribution>();
    public DbSet<ContributionItem> ContributionItems => Set<ContributionItem>();
    public DbSet<TrainingModule> TrainingModules => Set<TrainingModule>();
    public DbSet<TrainingProgress> TrainingProgress => Set<TrainingProgress>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<Candidate> Candidates => Set<Candidate>();
    public DbSet<Recognition> Recognitions => Set<Recognition>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<OnboardingTask> OnboardingTasks => Set<OnboardingTask>();
    public DbSet<WelcomeMessage> WelcomeMessages => Set<WelcomeMessage>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        var jsonOpts = new JsonSerializerOptions();

        mb.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Role).HasConversion<string>();
        });

        // Store dictionaries / lists as JSONB columns
        var dictConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Dictionary<string, decimal>, string>(
            v => JsonSerializer.Serialize(v, jsonOpts),
            v => JsonSerializer.Deserialize<Dictionary<string, decimal>>(v, jsonOpts) ?? new());

        var dictDoubleConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Dictionary<string, double>, string>(
            v => JsonSerializer.Serialize(v, jsonOpts),
            v => JsonSerializer.Deserialize<Dictionary<string, double>>(v, jsonOpts) ?? new());

        var listStringConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<List<string>, string>(
            v => JsonSerializer.Serialize(v, jsonOpts),
            v => JsonSerializer.Deserialize<List<string>>(v, jsonOpts) ?? new());

        var listTrainingConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<List<TrainingContent>, string>(
            v => JsonSerializer.Serialize(v, jsonOpts),
            v => JsonSerializer.Deserialize<List<TrainingContent>>(v, jsonOpts) ?? new());

        mb.Entity<Payslip>(e =>
        {
            e.Property(x => x.Earnings).HasConversion(dictConverter).HasColumnType("jsonb");
            e.Property(x => x.Deductions).HasConversion(dictConverter).HasColumnType("jsonb");
            e.Property(x => x.EmployerContributions).HasConversion(dictConverter).HasColumnType("jsonb");
        });

        mb.Entity<Review>(e =>
        {
            e.Property(x => x.CategoryRatings).HasConversion(dictDoubleConverter).HasColumnType("jsonb");
            e.Property(x => x.Strengths).HasConversion(listStringConverter).HasColumnType("jsonb");
            e.Property(x => x.Improvements).HasConversion(listStringConverter).HasColumnType("jsonb");
        });

        mb.Entity<Contribution>(e => e.Property(x => x.Tags).HasConversion(listStringConverter).HasColumnType("jsonb"));
        mb.Entity<Job>(e =>
        {
            e.Property(x => x.Requirements).HasConversion(listStringConverter).HasColumnType("jsonb");
            e.Property(x => x.Responsibilities).HasConversion(listStringConverter).HasColumnType("jsonb");
        });
        mb.Entity<Candidate>(e => e.Property(x => x.Skills).HasConversion(listStringConverter).HasColumnType("jsonb"));
        mb.Entity<Announcement>(e => e.Property(x => x.Target).HasConversion(listStringConverter).HasColumnType("jsonb"));
        mb.Entity<TrainingModule>(e => e.Property(x => x.Content).HasConversion(listTrainingConverter).HasColumnType("jsonb"));
        mb.Entity<TrainingProgress>(e => e.Property(x => x.Content).HasConversion(listTrainingConverter).HasColumnType("jsonb"));

        base.OnModelCreating(mb);
    }
}
