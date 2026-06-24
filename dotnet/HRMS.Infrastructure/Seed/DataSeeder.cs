using HRMS.Domain.Attendance;
using HRMS.Domain.Common;
using HRMS.Domain.Identity;
using HRMS.Domain.Leave;
using HRMS.Domain.Misc;
using HRMS.Domain.Payroll;
using HRMS.Infrastructure.Auth;
using HRMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HRMS.Infrastructure.Seed;

/// <summary>
/// Idempotent demo-data seeder. Mirrors the spec's user personas + sample
/// records so every module has something realistic to show on first load.
/// Each block is a guarded helper — easy to extend without touching siblings.
/// </summary>
public static class DataSeeder
{
    public record DemoUser(string Email, string Password, string Name, UserRole Role,
        string Designation, string Department, string Country = "US", bool IsOnboarding = false);

    public static readonly DemoUser[] DemoUsers =
    [
        new("admin@workflow.com",   "admin123",   "Admin User",     UserRole.Admin,    "System Administrator", "IT"),
        new("sarah@workflow.com",   "sarah123",   "Sarah Mitchell", UserRole.Employee, "Software Engineer",    "Engineering"),
        new("michael@workflow.com", "michael123", "Michael Chen",   UserRole.Manager,  "Engineering Manager",  "Engineering"),
        new("priya@workflow.com",   "priya123",   "Priya Sharma",   UserRole.HR,       "HR Business Partner",  "People", "IN"),
        new("alex@workflow.com",    "alex123",    "Alex Rivera",    UserRole.Employee, "Junior Developer",     "Engineering", "US", true),
    ];

    public static async Task SeedAsync(HrmsDbContext db)
    {
        await SeedUsersAsync(db);
        await LinkReportingAsync(db);

        var sarah   = await db.Users.FirstAsync(u => u.Email == "sarah@workflow.com");
        var michael = await db.Users.FirstOrDefaultAsync(u => u.Email == "michael@workflow.com");
        var alex    = await db.Users.FirstOrDefaultAsync(u => u.Email == "alex@workflow.com");
        var priya   = await db.Users.FirstOrDefaultAsync(u => u.Email == "priya@workflow.com");

        await SeedLeaveAsync(db, sarah, michael);
        await SeedAttendanceAsync(db, sarah);
        await SeedPayrollAsync(db, sarah, michael);
        await SeedDocumentsAsync(db, sarah);
        await SeedExpensesAsync(db, sarah, michael);
        await SeedPerformanceAsync(db, sarah, michael);
        await SeedContributionsAsync(db, sarah, michael);
        await SeedTrainingAsync(db);
        await SeedRecruitmentAsync(db);
        await SeedRecognitionAsync(db, sarah, michael);
        await SeedAnnouncementsAsync(db, priya);
        await SeedOnboardingAsync(db, alex);
    }

    private static async Task SeedUsersAsync(HrmsDbContext db)
    {
        foreach (var d in DemoUsers)
        {
            if (await db.Users.AnyAsync(u => u.Email == d.Email)) continue;
            db.Users.Add(new User
            {
                Email = d.Email, PasswordHash = PasswordHasher.Hash(d.Password),
                Name = d.Name, Role = d.Role,
                Designation = d.Designation, Department = d.Department,
                Country = d.Country, IsOnboarding = d.IsOnboarding,
                JoiningDate = d.IsOnboarding ? "2026-02-01" : "2024-01-15",
            });
        }
        await db.SaveChangesAsync();
    }

    private static async Task LinkReportingAsync(HrmsDbContext db)
    {
        var michael = await db.Users.FirstOrDefaultAsync(u => u.Email == "michael@workflow.com");
        if (michael == null) return;
        var reports = await db.Users.Where(u => u.Email == "sarah@workflow.com" || u.Email == "alex@workflow.com").ToListAsync();
        foreach (var r in reports.Where(r => r.ManagerId == null))
            r.ManagerId = michael.Id;
        await db.SaveChangesAsync();
    }

    private static async Task SeedLeaveAsync(HrmsDbContext db, User sarah, User? michael)
    {
        if (await db.LeaveBalances.AnyAsync()) return;
        var allUsers = await db.Users.Where(u => u.Role != UserRole.Admin).ToListAsync();
        var totals = new (string Type, int Total)[] { ("casual", 12), ("sick", 10), ("personal", 5), ("comp-off", 3) };
        foreach (var u in allUsers)
            foreach (var (type, total) in totals)
                db.LeaveBalances.Add(new LeaveBalance { UserId = u.Id, Type = type, Total = total, Available = total, Year = 2026 });

        db.LeaveRequests.Add(new LeaveRequest
        {
            UserId = sarah.Id, UserName = sarah.Name, Type = "casual",
            StartDate = "2026-01-20", EndDate = "2026-01-21", TotalDays = 2,
            Reason = "Family event", Status = "pending",
            ApproverId = michael?.Id,
        });
        await db.SaveChangesAsync();
    }

    private static async Task SeedAttendanceAsync(HrmsDbContext db, User sarah)
    {
        if (await db.Attendance.AnyAsync()) return;
        db.Attendance.Add(new AttendanceRecord
        {
            UserId = sarah.Id, Date = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            Status = "absent",
        });
        await db.SaveChangesAsync();
    }

    private static async Task SeedPayrollAsync(HrmsDbContext db, User sarah, User? michael)
    {
        if (await db.Payslips.AnyAsync()) return;
        foreach (var u in new[] { sarah, michael }.Where(x => x != null))
        {
            db.Payslips.Add(new Payslip
            {
                UserId = u!.Id, UserName = u.Name, Country = u.Country,
                Currency = u.Country == "US" ? "USD" : "INR",
                PayPeriod = "January 2026", PayDate = "2026-01-31",
                Earnings = new() { ["basic"] = 5000, ["hra"] = 1500, ["special_allowance"] = 800, ["bonus"] = 0, ["overtime"] = 0, ["reimbursements"] = 200 },
                Deductions = new() { ["income_tax"] = 850, ["professional_tax"] = 50, ["pf"] = 500, ["esi"] = 80, ["health_insurance"] = 120, ["lwf"] = 0 },
                EmployerContributions = new() { ["pf"] = 500, ["esi"] = 200, ["gratuity"] = 100 },
                Gross = 7500, TotalDeductions = 1600, Net = 5900, Status = "paid",
            });
        }
        await db.SaveChangesAsync();
    }

    private static async Task SeedDocumentsAsync(HrmsDbContext db, User sarah)
    {
        if (await db.Documents.AnyAsync()) return;
        var samples = new (string Cat, string Name, string Status, string? Exp)[]
        {
            ("identity", "Passport", "verified", "2030-05-12"),
            ("employment", "Offer Letter", "verified", null),
            ("work-auth", "H1-B Visa", "uploaded", "2027-03-01"),
            ("tax", "W-2 Form 2025", "verified", null),
            ("education", "Degree Certificate", "missing", null),
        };
        foreach (var s in samples)
            db.Documents.Add(new Document { UserId = sarah.Id, Category = s.Cat, Name = s.Name, Status = s.Status, Expiry = s.Exp });
        await db.SaveChangesAsync();
    }

    private static async Task SeedExpensesAsync(HrmsDbContext db, User sarah, User? michael)
    {
        if (await db.Expenses.AnyAsync()) return;
        db.Expenses.Add(new Expense
        {
            UserId = sarah.Id, UserName = sarah.Name, Category = "travel",
            Amount = 245.50m, Currency = "USD", Description = "Client meeting - San Francisco",
            Date = "2026-01-15", Status = "pending-approval",
            WithinLimit = true, PolicyValidationMessage = "Within policy",
            ApproverId = michael?.Id,
        });
        await db.SaveChangesAsync();
    }

    private static async Task SeedPerformanceAsync(HrmsDbContext db, User sarah, User? michael)
    {
        if (!await db.Goals.AnyAsync())
        {
            db.Goals.Add(new Goal
            {
                UserId = sarah.Id, Title = "Ship Q1 Auth Refactor",
                Description = "Migrate legacy auth to JWT", Category = "individual", Type = "quarterly",
                Weight = 40, DueDate = "2026-03-31", Status = "in-progress", Progress = 65,
            });
        }
        if (!await db.Reviews.AnyAsync())
        {
            db.Reviews.Add(new Review
            {
                UserId = sarah.Id, UserName = sarah.Name,
                Period = "Q4 2025", Type = "quarterly", OverallRating = 4.3,
                CategoryRatings = new() { ["technical"] = 4.5, ["communication"] = 4.0, ["leadership"] = 4.2, ["collaboration"] = 4.5 },
                Strengths = new() { "Strong technical depth", "Excellent code reviews", "Mentors juniors" },
                Improvements = new() { "Public speaking", "Cross-team alignment" },
                Recommendations = "Promote to Senior Engineer in next cycle",
                GoalsAchieved = 3, GoalsTotal = 4, ReviewerId = michael?.Id,
            });
        }
        await db.SaveChangesAsync();
    }

    private static async Task SeedContributionsAsync(HrmsDbContext db, User sarah, User? michael)
    {
        if (!await db.Contributions.AnyAsync())
        {
            db.Contributions.Add(new Contribution
            {
                UserId = sarah.Id, UserName = sarah.Name,
                Title = "Auto-deploy pipeline", Description = "Set up GitHub Actions CI/CD",
                Type = "self-initiated", Category = "process-improvement",
                Points = 150, SuggestedPoints = 100, Impact = "high",
                Status = "completed", Tags = new() { "devops", "automation" },
                ApproverId = michael?.Id, ApprovalStatus = "approved",
                ApprovalDate = DateTime.UtcNow, ApprovalComments = "Saved 4 hours/week per dev",
            });
        }
        if (!await db.ContributionItems.AnyAsync())
        {
            db.ContributionItems.AddRange(
                new ContributionItem { Title = "Wiki page for onboarding", Category = "knowledge-sharing", SuggestedPoints = 50 },
                new ContributionItem { Title = "Bug bash session lead", Category = "quality", SuggestedPoints = 80 },
                new ContributionItem { Title = "Mentor a junior engineer", Category = "team-building", SuggestedPoints = 120 });
        }
        await db.SaveChangesAsync();
    }

    private static async Task SeedTrainingAsync(HrmsDbContext db)
    {
        if (await db.TrainingModules.AnyAsync()) return;
        db.TrainingModules.AddRange(
            new TrainingModule
            {
                Title = "Security & Compliance 2026", Category = "compliance",
                DurationMin = 45, DueDate = "2026-02-28", Mandatory = true, Certificate = true,
                Content = new()
                {
                    new() { Type = "video", Title = "Intro", DurationMin = 15 },
                    new() { Type = "quiz",  Title = "Knowledge check", DurationMin = 10 },
                },
            },
            new TrainingModule
            {
                Title = "TypeScript Deep Dive", Category = "technical",
                DurationMin = 180, DueDate = "2026-03-31", Mandatory = false, Certificate = true,
                Content = new() { new() { Type = "video", Title = "Advanced types", DurationMin = 60 } },
            },
            new TrainingModule
            {
                Title = "Effective Communication", Category = "soft-skills",
                DurationMin = 90, DueDate = "2026-04-15", Mandatory = false, Certificate = false,
                Content = new() { new() { Type = "document", Title = "Reading", DurationMin = 30 } },
            });
        await db.SaveChangesAsync();
    }

    private static async Task SeedRecruitmentAsync(HrmsDbContext db)
    {
        if (!await db.Jobs.AnyAsync())
        {
            db.Jobs.AddRange(
                new Job
                {
                    Title = "Senior Backend Engineer", Department = "Engineering", Location = "Remote (US)",
                    Experience = "5+ years", SalaryMin = 130000, SalaryMax = 180000, Currency = "USD",
                    Requirements = new() { "C#/.NET", "PostgreSQL", "AWS" }, Responsibilities = new() { "Design APIs", "Mentor engineers" },
                    Applicants = 24, Shortlisted = 6, Interviewing = 3,
                },
                new Job
                {
                    Title = "Product Designer", Department = "Product", Location = "Bangalore, IN",
                    Experience = "3+ years", SalaryMin = 1800000, SalaryMax = 2800000, Currency = "INR",
                    Requirements = new() { "Figma", "Design Systems" }, Responsibilities = new() { "Own product flows" },
                    Applicants = 41, Shortlisted = 8, Interviewing = 4,
                });
            await db.SaveChangesAsync();
        }
        if (!await db.Candidates.AnyAsync())
        {
            var jobs = await db.Jobs.ToListAsync();
            db.Candidates.AddRange(
                new Candidate { Name = "Jordan Lee", AppliedRole = jobs[0].Title, JobId = jobs[0].Id, Status = "interview-scheduled", Rating = 4.2, Skills = new() { "C#", ".NET" }, ExperienceYears = 6, ExpectedSalary = 165000, Currency = "USD", NoticePeriodDays = 45, Notes = "Strong systems background" },
                new Candidate { Name = "Aisha Patel", AppliedRole = jobs[1].Title, JobId = jobs[1].Id, Status = "shortlisted", Rating = 4.5, Skills = new() { "Figma", "User Research" }, ExperienceYears = 4, ExpectedSalary = 2400000, Currency = "INR", NoticePeriodDays = 60, Notes = "Excellent portfolio" },
                new Candidate { Name = "Tom Becker", AppliedRole = jobs[0].Title, JobId = jobs[0].Id, Status = "new", Rating = 3.8, Skills = new() { "Go", "Kubernetes" }, ExperienceYears = 5, ExpectedSalary = 150000, Currency = "USD", NoticePeriodDays = 30 });
            await db.SaveChangesAsync();
        }
    }

    private static async Task SeedRecognitionAsync(HrmsDbContext db, User sarah, User? michael)
    {
        if (await db.Recognitions.AnyAsync() || michael == null) return;
        db.Recognitions.Add(new Recognition
        {
            SenderId = michael.Id, SenderName = michael.Name,
            RecipientId = sarah.Id, RecipientName = sarah.Name,
            Category = "excellence",
            Message = "Outstanding work on the auth refactor — saved the team a week.",
            Likes = 12, CommentsCount = 3,
        });
        await db.SaveChangesAsync();
    }

    private static async Task SeedAnnouncementsAsync(HrmsDbContext db, User? priya)
    {
        if (await db.Announcements.AnyAsync()) return;
        db.Announcements.AddRange(
            new Announcement
            {
                AuthorId = priya?.Id, AuthorName = priya?.Name ?? "HR Team",
                Title = "New Health Insurance Provider — Effective March 1",
                Content = "We are switching to BlueShield. Please review the new plan documents and complete the enrollment by Feb 20.",
                Category = "hr-update", Priority = "high",
                Views = 124, Likes = 18, Acknowledgments = 87, CommentsCount = 6, Expiry = "2026-03-15",
            },
            new Announcement
            {
                AuthorId = priya?.Id, AuthorName = priya?.Name ?? "HR Team",
                Title = "Quarterly All-Hands — Friday 3pm",
                Content = "Join us for the Q1 all-hands. CEO will share roadmap. Coffee & cookies in the lounge.",
                Category = "event", Priority = "medium",
                Views = 87, Likes = 22, CommentsCount = 11, Expiry = "2026-01-31",
            });
        await db.SaveChangesAsync();
    }

    private static async Task SeedOnboardingAsync(HrmsDbContext db, User? alex)
    {
        if (alex == null) return;

        if (!await db.OnboardingTasks.AnyAsync())
        {
            db.OnboardingTasks.AddRange(
                new OnboardingTask { UserId = alex.Id, Phase = "pre-joining", Title = "Submit tax forms (W-4)", Description = "Complete and submit W-4", Priority = "high", DueDate = "2026-01-28", Assignee = "employee" },
                new OnboardingTask { UserId = alex.Id, Phase = "pre-joining", Title = "Provide bank details", Description = "Direct deposit setup", Priority = "high", DueDate = "2026-01-28", Assignee = "employee" },
                new OnboardingTask { UserId = alex.Id, Phase = "pre-joining", Title = "Sign offer letter", Description = "Digital signature", Priority = "high", DueDate = "2026-01-25", Assignee = "employee", Status = "completed", CompletedAt = DateTime.UtcNow },
                new OnboardingTask { UserId = alex.Id, Phase = "day-1", Title = "Office tour & ID card", Description = "Meet IT and Facilities", Priority = "medium", DueDate = "2026-02-01", Assignee = "hr" },
                new OnboardingTask { UserId = alex.Id, Phase = "week-1", Title = "Complete security training", Description = "Mandatory module", Priority = "high", DueDate = "2026-02-08", Assignee = "employee" },
                new OnboardingTask { UserId = alex.Id, Phase = "month-1", Title = "First 1:1 with manager", Description = "Manager check-in", Priority = "medium", DueDate = "2026-02-15", Assignee = "manager" });
        }
        if (!await db.WelcomeMessages.AnyAsync())
        {
            db.WelcomeMessages.AddRange(
                new WelcomeMessage { UserId = alex.Id, SenderName = "Lara Wells",   SenderRole = "CEO",     Message = "Welcome to WorkFlow, Alex! We're thrilled to have you.", HasVideo = true },
                new WelcomeMessage { UserId = alex.Id, SenderName = "Michael Chen", SenderRole = "Manager", Message = "Looking forward to building great things together!",       HasVideo = false },
                new WelcomeMessage { UserId = alex.Id, SenderName = "Sarah Mitchell", SenderRole = "Buddy", Message = "I'll be your onboarding buddy — text me anytime.",          HasVideo = false });
        }
        await db.SaveChangesAsync();
    }
}
