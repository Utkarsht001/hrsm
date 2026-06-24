using HRMS.Domain.Common;

namespace HRMS.Domain.Leave;

public class LeaveBalance : Entity
{
    public Guid UserId { get; set; }
    public string Type { get; set; } = "casual";
    public int Total { get; set; }
    public int Used { get; set; }
    public int Pending { get; set; }
    public int Available { get; set; }
    public int CarriedForward { get; set; }
    public int Encashed { get; set; }
    public int Year { get; set; }
}

public class LeaveRequest : Entity
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = "";
    public string Type { get; set; } = "casual";
    public string StartDate { get; set; } = "";
    public string EndDate { get; set; } = "";
    public int TotalDays { get; set; }
    public string Reason { get; set; } = "";
    public string Status { get; set; } = "pending";
    public string ApprovalLevel { get; set; } = "manager";
    public Guid? ApproverId { get; set; }
    public string ApproverComments { get; set; } = "";
}
