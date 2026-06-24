using HRMS.Domain.Common;

namespace HRMS.Domain.Payroll;

public class Payslip : Entity
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = "";
    public string Country { get; set; } = "US";
    public string Currency { get; set; } = "USD";
    public string PayPeriod { get; set; } = "";
    public string PayDate { get; set; } = "";
    // Use Dictionary<string,decimal> stored as JSON for breakdown
    public Dictionary<string, decimal> Earnings { get; set; } = new();
    public Dictionary<string, decimal> Deductions { get; set; } = new();
    public Dictionary<string, decimal> EmployerContributions { get; set; } = new();
    public decimal Gross { get; set; }
    public decimal TotalDeductions { get; set; }
    public decimal Net { get; set; }
    public string Status { get; set; } = "paid";
}
