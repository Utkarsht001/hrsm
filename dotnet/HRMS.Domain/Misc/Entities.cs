using HRMS.Domain.Common;

namespace HRMS.Domain.Misc;

// Lightweight entities for the remaining modules — kept minimal so the
// scaffolded endpoints can return realistic seed data without ceremony.

public class Document : Entity
{
    public Guid UserId { get; set; }
    public string Category { get; set; } = "other";
    public string Name { get; set; } = "";
    public string Status { get; set; } = "uploaded";
    public string? Expiry { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

public class Expense : Entity
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = "";
    public string Category { get; set; } = "travel";
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public string Description { get; set; } = "";
    public string Date { get; set; } = "";
    public bool Taxable { get; set; }
    public string Status { get; set; } = "pending-approval";
    public string PolicyValidationMessage { get; set; } = "";
    public bool WithinLimit { get; set; } = true;
    public Guid? ApproverId { get; set; }
    public string ApproverComments { get; set; } = "";
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
}

public class Goal : Entity
{
    public Guid UserId { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Category { get; set; } = "individual";
    public string Type { get; set; } = "quarterly";
    public int Weight { get; set; } = 25;
    public string DueDate { get; set; } = "";
    public string Status { get; set; } = "not-started";
    public int Progress { get; set; }
}

public class Review : Entity
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = "";
    public string Period { get; set; } = "";
    public string Type { get; set; } = "quarterly";
    public double OverallRating { get; set; }
    public Dictionary<string, double> CategoryRatings { get; set; } = new();
    public List<string> Strengths { get; set; } = new();
    public List<string> Improvements { get; set; } = new();
    public string Recommendations { get; set; } = "";
    public int GoalsAchieved { get; set; }
    public int GoalsTotal { get; set; }
    public Guid? ReviewerId { get; set; }
}

public class Contribution : Entity
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Type { get; set; } = "self-initiated";
    public string Category { get; set; } = "innovation";
    public int Points { get; set; }
    public int SuggestedPoints { get; set; } = 50;
    public string Impact { get; set; } = "medium";
    public string Status { get; set; } = "proposal-pending";
    public List<string> Tags { get; set; } = new();
    public Guid? ApproverId { get; set; }
    public string ApprovalStatus { get; set; } = "pending";
    public DateTime? ApprovalDate { get; set; }
    public string ApprovalComments { get; set; } = "";
}

public class TrainingModule : Entity
{
    public string Title { get; set; } = "";
    public string Category { get; set; } = "compliance";
    public int DurationMin { get; set; }
    public string DueDate { get; set; } = "";
    public bool Mandatory { get; set; }
    public bool Certificate { get; set; }
    public List<TrainingContent> Content { get; set; } = new();
}

public class TrainingContent
{
    public string Type { get; set; } = "document"; // video, document, quiz, interactive
    public string Title { get; set; } = "";
    public int DurationMin { get; set; }
    public bool Completed { get; set; }
}

public class TrainingProgress : Entity
{
    public Guid UserId { get; set; }
    public Guid ModuleId { get; set; }
    public List<TrainingContent> Content { get; set; } = new();
    public int Progress { get; set; }
    public string Status { get; set; } = "not-started";
}

public class Job : Entity
{
    public string Title { get; set; } = "";
    public string Department { get; set; } = "";
    public string Location { get; set; } = "";
    public string EmploymentType { get; set; } = "Full-time";
    public string Experience { get; set; } = "";
    public decimal SalaryMin { get; set; }
    public decimal SalaryMax { get; set; }
    public string Currency { get; set; } = "USD";
    public string Status { get; set; } = "open";
    public List<string> Requirements { get; set; } = new();
    public List<string> Responsibilities { get; set; } = new();
    public int Applicants { get; set; }
    public int Shortlisted { get; set; }
    public int Interviewing { get; set; }
}

public class Candidate : Entity
{
    public string Name { get; set; } = "";
    public string AppliedRole { get; set; } = "";
    public Guid JobId { get; set; }
    public string Status { get; set; } = "new";
    public double Rating { get; set; }
    public List<string> Skills { get; set; } = new();
    public int ExperienceYears { get; set; }
    public decimal ExpectedSalary { get; set; }
    public string Currency { get; set; } = "USD";
    public int NoticePeriodDays { get; set; }
    public string Notes { get; set; } = "";
}

public class Recognition : Entity
{
    public Guid SenderId { get; set; }
    public string SenderName { get; set; } = "";
    public Guid RecipientId { get; set; }
    public string RecipientName { get; set; } = "";
    public string Category { get; set; } = "excellence";
    public string Message { get; set; } = "";
    public string Visibility { get; set; } = "public";
    public int Likes { get; set; }
    public int CommentsCount { get; set; }
}

public class Announcement : Entity
{
    public Guid? AuthorId { get; set; }
    public string AuthorName { get; set; } = "";
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public string Category { get; set; } = "general";
    public string Priority { get; set; } = "medium";
    public string Visibility { get; set; } = "global";
    public List<string> Target { get; set; } = new();
    public int Views { get; set; }
    public int Likes { get; set; }
    public int Acknowledgments { get; set; }
    public int CommentsCount { get; set; }
    public string? Expiry { get; set; }
}

public class OnboardingTask : Entity
{
    public Guid UserId { get; set; }
    public string Phase { get; set; } = "pre-joining";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Priority { get; set; } = "medium";
    public string DueDate { get; set; } = "";
    public string Assignee { get; set; } = "employee";
    public string Status { get; set; } = "pending";
    public DateTime? CompletedAt { get; set; }
}

public class WelcomeMessage : Entity
{
    public Guid UserId { get; set; }
    public string SenderName { get; set; } = "";
    public string SenderRole { get; set; } = "";
    public string Message { get; set; } = "";
    public bool HasVideo { get; set; }
}

public class ContributionItem : Entity
{
    public string Title { get; set; } = "";
    public string Category { get; set; } = "knowledge-sharing";
    public int SuggestedPoints { get; set; } = 50;
    public string Status { get; set; } = "available"; // available | claimed
    public Guid? ClaimedBy { get; set; }
    public DateTime? ClaimedAt { get; set; }
}
