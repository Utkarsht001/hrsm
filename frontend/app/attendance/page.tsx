'use client';

import { useEffect, useState } from "react";
import { AppShell } from "../../components/shell/AppShell";
import { PageHeader, SectionTitle, Stat, Loader, StatusBadge, Empty } from "../../components/ui/Primitives";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { Calendar, Clock, LogIn, LogOut, MapPin, Wifi, Camera, Fingerprint } from "lucide-react";
import toast from "react-hot-toast";

export default function AttendancePage() {
  const { user } = useSession();
  const [today, setToday] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showMethod, setShowMethod] = useState(false);

  async function load() {
    const [t, h, a] = await Promise.all([
      api.get("/api/attendance/today"),
      api.get<any[]>("/api/attendance/history"),
      api.get("/api/analytics/attendance"),
    ]);
    setToday(t);
    setHistory(h);
    setAnalytics(a);
    if (user && ["manager", "hr", "admin"].includes(user.role)) {
      api.get<any[]>("/api/attendance/team").then(setTeam).catch(() => {});
    }
  }
  useEffect(() => { load(); }, [user]);

  async function clockIn(method: string) {
    try {
      await api.post("/api/attendance/clock-in", { method });
      toast.success(`Clocked in via ${method}`);
      setShowMethod(false);
      load();
    } catch (e: any) { toast.error(e.message); }
  }
  async function clockOut() {
    try {
      await api.post("/api/attendance/clock-out");
      toast.success("Clocked out");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  if (!user) return null;
  const isIn = today?.clock_in && !today?.clock_out;

  return (
    <AppShell>
      <PageHeader title="Attendance" subtitle="Clock in & track your hours" icon={Calendar} />

      {/* Today card */}
      <div className="card p-4 mb-3 animate-rise">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-muted">Today · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
            <div className="text-2xl font-extrabold mt-1">
              {today?.clock_in ? new Date(today.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—:—"}
            </div>
            <div className="text-xs text-muted">{today?.clock_in ? "Clock-in time" : "Not clocked in"}</div>
          </div>
          {today?.location_verified && (
            <div className="flex flex-col items-end gap-1">
              <span className="badge badge-success text-[10px]"><MapPin size={10} /> Location verified</span>
              <span className="badge badge-success text-[10px]"><Wifi size={10} /> IP validated</span>
            </div>
          )}
        </div>
        {isIn ? (
          <button data-testid="clock-out-btn" onClick={clockOut} className="btn btn-accent w-full justify-center">
            <LogOut size={16} /> Clock out
          </button>
        ) : (
          <button data-testid="clock-in-btn" onClick={() => setShowMethod(true)} className="btn btn-primary w-full justify-center">
            <LogIn size={16} /> Clock in
          </button>
        )}

        {today?.clock_in && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            <Stat label="Total" value={`${today.total_hours || 0}h`} />
            <Stat label="Productive" value={`${today.productive_hours || 0}h`} />
            <Stat label="Break" value={`${today.break_hours || 0}h`} />
            <Stat label="OT" value={`${today.overtime_hours || 0}h`} accent="orange" />
          </div>
        )}
      </div>

      {/* Method picker */}
      {showMethod && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowMethod(false)} />
          <div className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 w-full max-w-[480px] bg-surface rounded-t-2xl p-5 animate-rise">
            <h3 className="font-bold mb-3">Choose clock-in method</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "selfie", label: "Selfie", icon: Camera },
                { id: "geolocation", label: "Geolocation", icon: MapPin },
                { id: "biometric", label: "Biometric", icon: Fingerprint },
                { id: "manual", label: "Manual", icon: Clock },
              ].map(m => (
                <button
                  key={m.id}
                  data-testid={`method-${m.id}-btn`}
                  onClick={() => clockIn(m.id)}
                  className="card p-4 hover:shadow-md flex flex-col items-center gap-2"
                >
                  <m.icon size={22} className="text-[color:var(--teal-700)]" />
                  <span className="text-sm font-semibold">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Analytics (employee view) */}
      {analytics && (
        <>
          <SectionTitle title="My analytics" subtitle="Last 30 days" />
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label="Present" value={analytics.present} />
            <Stat label="Late" value={analytics.late} accent="orange" />
            <Stat label="Absent" value={analytics.absent} />
            <Stat label="Total hours" value={`${analytics.total_hours}h`} />
            <Stat label="Avg/day" value={`${analytics.avg_hours}h`} />
            <Stat label="Days" value={analytics.days_total} />
          </div>
        </>
      )}

      {/* Team attendance for manager/HR/admin */}
      {team.length > 0 && (
        <>
          <SectionTitle title="Team today" subtitle="Manager view" />
          <div className="space-y-2 mb-4">
            {team.map(t => (
              <div key={t.id} className="card p-3 flex items-center justify-between" data-testid={`team-att-${t.user_id}`}>
                <div>
                  <div className="text-sm font-semibold">{t.user_name}</div>
                  <div className="text-xs text-muted">{t.department}</div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recent history */}
      <SectionTitle title="Recent shifts" />
      {history.length === 0 ? <Empty title="No shifts yet" /> : (
        <div className="space-y-2">
          {history.slice(0, 14).map(h => (
            <div key={h.id} className="card p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{h.date}</div>
                <div className="text-xs text-muted">
                  {h.clock_in ? new Date(h.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  {" → "}
                  {h.clock_out ? new Date(h.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                </div>
              </div>
              <div className="text-right">
                <StatusBadge status={h.status} />
                <div className="text-xs text-muted mt-0.5">{h.total_hours || 0}h</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
