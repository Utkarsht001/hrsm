using HRMS.Domain.Common;

namespace HRMS.Domain.Attendance;

public class AttendanceRecord : Entity
{
    public Guid UserId { get; set; }
    public string Date { get; set; } = "";        // ISO date
    public DateTime? ClockIn { get; set; }
    public DateTime? ClockOut { get; set; }
    public string Status { get; set; } = "absent"; // present | absent | late
    public string? Method { get; set; }            // selfie | geolocation | biometric | manual
    public bool LocationVerified { get; set; }
    public bool IpValidated { get; set; }
    public double TotalHours { get; set; }
    public double ProductiveHours { get; set; }
    public double BreakHours { get; set; }
    public double OvertimeHours { get; set; }
}
