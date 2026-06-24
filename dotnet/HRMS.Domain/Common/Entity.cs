namespace HRMS.Domain.Common;

public abstract class Entity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum UserRole { Employee, Manager, HR, Admin }

public enum ApprovalStatus { Pending, Approved, Rejected }
