'use client';

import { useEffect, useState } from "react";
import { AppShell } from "../../components/shell/AppShell";
import { PageHeader, Stat, SectionTitle, Empty } from "../../components/ui/Primitives";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { BarChart3, TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
  const { user } = useSession();
  const [self, setSelf] = useState<any>(null);
  const [hr, setHr] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    api.get("/api/analytics/attendance").then(setSelf).catch(() => {});
    if (["manager", "hr", "admin"].includes(user.role)) {
      api.get("/api/analytics/hr").then(setHr).catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  return (
    <AppShell>
      <PageHeader title="Analytics" subtitle="Your patterns & people insights" icon={BarChart3} />

      {self && (
        <>
          <SectionTitle title="My attendance" subtitle="Last 30 days" />
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label="Days tracked" value={self.days_total} />
            <Stat label="Present" value={self.present} />
            <Stat label="Absent" value={self.absent} accent="orange" />
            <Stat label="Late" value={self.late} accent="orange" />
            <Stat label="Total hours" value={`${self.total_hours}h`} />
            <Stat label="Avg/day" value={`${self.avg_hours}h`} />
          </div>
        </>
      )}

      {hr && (
        <>
          <SectionTitle title="HR dashboard" subtitle="Organization snapshot" />
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Stat label="Headcount" value={hr.headcount} />
            <Stat label="New joiners" value={hr.new_joiners} accent="orange" />
            <Stat label="Open positions" value={hr.open_positions} />
            <Stat label="Pending leave" value={hr.pending_leave_approvals} accent="orange" />
            <Stat label="Pending expense" value={hr.pending_expense_approvals} accent="orange" />
            <Stat label="Present today" value={hr.attendance_today?.present || 0} />
          </div>

          <SectionTitle title="By department" />
          <div className="card p-4 mb-4">
            {hr.by_department.map((d: any) => {
              const max = Math.max(...hr.by_department.map((x: any) => x.count));
              const pct = max ? (d.count / max) * 100 : 0;
              return (
                <div key={d.name} className="mb-2 last:mb-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{d.name}</span>
                    <span className="font-bold">{d.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #0d9488 0%, #134e4a 100%)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!self && !hr && <Empty title="No data yet" />}
    </AppShell>
  );
}
