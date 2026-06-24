using HRMS.Domain.Common;

namespace HRMS.Domain.Identity;

public class User : Entity
{
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Name { get; set; } = "";
    public UserRole Role { get; set; } = UserRole.Employee;
    public string Designation { get; set; } = "";
    public string Department { get; set; } = "";
    public string Country { get; set; } = "US";
    public bool IsOnboarding { get; set; } = false;
    public Guid? ManagerId { get; set; }
    public string JoiningDate { get; set; } = "";
    public string AvatarColor { get; set; } = "#14b8a6";
}
