namespace HRMS.Application.DTOs;

using System.Text.Json.Serialization;

// --- Auth ----------------------------------------------------------------
public record LoginDto(string Email, string Password);
public record RegisterDto(string Email, string Password, string Name, string Role = "employee");
public record AuthResponse([property: JsonPropertyName("accessToken")] string AccessToken, UserDto User);
public record UserDto(
    Guid Id, string Email, string Name, string Role, string Designation, string Department,
    string Country, bool IsOnboarding, Guid? ManagerId, string JoiningDate, string AvatarColor);
public record DemoUserDto(string Email, string Password, string Name, string Role);

// --- Attendance ---------------------------------------------------------
public record ClockInDto(string Method = "selfie");

// --- Leave --------------------------------------------------------------
public record LeaveRequestDto(string Type, string StartDate, string EndDate, string Reason);
public record ApprovalActionDto(string Action, string Comments = "");

// --- Documents ----------------------------------------------------------
public record DocumentUploadDto(string Category, string Name, string? Expiry);
public record DocumentStatusDto(string Action, string Reason = "");

// --- Expenses -----------------------------------------------------------
public record ExpenseDto(string Category, decimal Amount, string Currency, string Description, string Date, bool Taxable = false);

// --- Performance --------------------------------------------------------
public record GoalDto(string Title, string Description, string Category, string Type, int Weight, string DueDate);
public record GoalProgressDto(int Progress, string? Status);

// --- Contributions ------------------------------------------------------
public record ContributionDto(string Title, string Description, string Category, string Type, int SuggestedPoints, string Impact, List<string> Tags);
public record ContributionActionDto(string Action, int? FinalPoints, string Comments = "");

// --- Training -----------------------------------------------------------
public record TrainingProgressItemDto(int ContentIndex);

// --- Candidates ---------------------------------------------------------
public record CandidateUpdateDto(string Status);

// --- Recognition --------------------------------------------------------
public record RecognitionDto(Guid RecipientId, string Category, string Message, string Visibility = "public");

// --- Announcements ------------------------------------------------------
public record AnnouncementDto(string Title, string Content, string Category, string Priority, string Visibility, List<string> Target, string? Expiry);

// --- Copilot ------------------------------------------------------------
public record CopilotChatDto(string Message, string? SessionId, Dictionary<string, object>? Context);
