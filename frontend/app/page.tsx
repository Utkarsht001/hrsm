'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "../components/shell/AppShell";
import { useSession } from "../context/SessionContext";
import { api } from "../lib/api";
import { Stat, SectionTitle } from "../components/ui/Primitives";
import {
  Calendar, Briefcase, DollarSign, FileText, Receipt, Target, Sparkles,
  GraduationCap, UserPlus, Trophy, Megaphone, Users, BarChart3, Bot, ArrowRight,
  Clock, CheckCircle2
} from "lucide-react";
import OnboardingDashboard from "./onboarding/OnboardingClient";

const ROLE_QUICK: Record<string, Array<{ href: string; label: string; icon: any; tone: "teal" | "orange" }>> = {
  employee: [
    { href: "/attendance", label: "Clock In", icon: Clock, tone: "orange" },
    { href: "/leave", label: "Request Leave", icon: Briefcase, tone: "teal" },
    { href: "/expenses", label: "Submit Expense", icon: Receipt, tone: "teal" },
    { href: "/payroll", label: "View Payslip", icon: DollarSign, tone: "teal" },
  ],
  manager: [
    { href: "/leave", label: "Approve Leave", icon: Briefcase, tone: "orange" },
    { href: "/expenses", label: "Approve Expenses", icon: Receipt, tone: "orange" },
    { href: "/team", label: "My Team", icon: Users, tone: "teal" },
    { href: "/performance", label: "Performance", icon: Target, tone: "teal" },
  ],
  hr: [
    { href: "/recruitment", label: "Pipeline", icon: UserPlus, tone: "orange" },
    { href: "/announcements", label: "Post Announcement", icon: Megaphone, tone: "orange" },
    { href: "/analytics", label: "HR Dashboard", icon: BarChart3, tone: "teal" },
    { href: "/documents", label: "Verify Documents", icon: FileText, tone: "teal" },
  ],
  admin: [
    { href: "/analytics", label: "Analytics", icon: BarChart3, tone: "orange" },
    { href: "/team", label: "Org Roster", icon: Users, tone: "orange" },
    { href: "/announcements", label: "Announcements", icon: Megaphone, tone: "teal" },
    { href: "/training", label: "Training", icon: GraduationCap, tone: "teal" },
  ],
};

export default function HomePage() {
  const { user } = useSession();
  const [analytics, setAnalytics] = useState<any>(null);
  const [recognition, setRecognition] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [pendingLeave, setPendingLeave] = useState(0);
  const [pendingExp, setPendingExp] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.get("/api/recognition").then(setRecognition).catch(() => {});
    api.get("/api/announcements").then(setAnnouncements).catch(() => {});
    if (["manager", "hr", "admin"].includes(user.role)) {
      api.get("/api/analytics/hr").then(setAnalytics).catch(() => {});
      api.get<any[]>("/api/leave/approvals").then(d => setPendingLeave(d.length)).catch(() => {});
      api.get<any[]>("/api/expenses/approvals").then(d => setPendingExp(d.length)).catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  // If user is in onboarding mode, show onboarding dashboard
  if (user.is_onboarding) {
    return (
      <AppShell>
        <OnboardingDashboard />
      </AppShell>
    );
  }

  const quick = ROLE_QUICK[user.role] || ROLE_QUICK.employee;

  return (
    <AppShell>
      {/* Hero */}
      <div className="rounded-2xl text-white p-5 mb-4 grain shadow-soft animate-rise"
        style={{ background: "linear-gradient(135deg, #0f766e 0%, #134e4a 60%, #062927 100%)" }}>
        <div className="text-[11px] uppercase tracking-[0.2em] opacity-70">{greeting()}</div>
        <h1 className="text-2xl font-extrabold tracking-tight">{user.name.split(" ")[0]}</h1>
        <p className="text-xs opacity-80 mt-1 capitalize">{user.designation} · {user.department} · {user.country}</p>
        <div className="mt-4 flex items-center gap-2 text-xs opacity-90">
          <Sparkles size={12} className="text-[color:var(--orange-400)]" />
          Your day at a glance — {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </div>
      </div>

      {/* Quick Actions */}
      <SectionTitle title="Quick actions" subtitle={`Tailored for ${user.role}s`} />
      <div className="grid grid-cols-2 gap-3 stagger mb-4">
        {quick.map(q => (
          <Link
            key={q.href}
            href={q.href}
            data-testid={`quick-${q.label.toLowerCase().replace(/\s/g, "-")}-btn`}
            className="card p-4 hover:shadow-md transition flex flex-col gap-2"
          >
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${q.tone === "orange" ? "bg-[color:var(--orange-50)] text-[color:var(--orange-600)]" : "bg-[color:var(--teal-50)] text-[color:var(--teal-700)]"}`}>
              <q.icon size={18} />
            </div>
            <div className="font-semibold text-sm leading-tight">{q.label}</div>
            <div className="text-[10px] text-muted flex items-center gap-1 mt-auto">Open <ArrowRight size={10} /></div>
          </Link>
        ))}
      </div>

      {/* Manager/HR/Admin: Approval queue */}
      {(user.role === "manager" || user.role === "hr" || user.role === "admin") && (
        <>
          <SectionTitle title="Approvals queue" />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Link href="/leave" className="card p-4" data-testid="pending-leave-card">
              <div className="text-xs text-muted">Pending leave</div>
              <div className="text-3xl font-extrabold text-[color:var(--orange-600)]">{pendingLeave}</div>
              <div className="text-xs mt-1">Approve →</div>
            </Link>
            <Link href="/expenses" className="card p-4" data-testid="pending-expense-card">
              <div className="text-xs text-muted">Pending expenses</div>
              <div className="text-3xl font-extrabold text-[color:var(--teal-700)]">{pendingExp}</div>
              <div className="text-xs mt-1">Approve →</div>
            </Link>
          </div>
        </>
      )}

      {/* HR/Admin analytics snapshot */}
      {analytics && (
        <>
          <SectionTitle title="People snapshot" />
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label="Headcount" value={analytics.headcount} />
            <Stat label="New joiners" value={analytics.new_joiners} accent="orange" />
            <Stat label="Open roles" value={analytics.open_positions} />
            <Stat label="Present today" value={analytics.attendance_today?.present || 0} />
            <Stat label="Pending leave" value={analytics.pending_leave_approvals} accent="orange" />
            <Stat label="Pending exp." value={analytics.pending_expense_approvals} accent="orange" />
          </div>
        </>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <>
          <SectionTitle
            title="Announcements"
            action={<Link href="/announcements" className="text-xs text-[color:var(--teal-700)] font-semibold">See all</Link>}
          />
          <div className="space-y-2 mb-4">
            {announcements.slice(0, 2).map(a => (
              <Link key={a.id} href="/announcements" className="card p-3 block">
                <div className="flex items-center justify-between mb-1">
                  <span className="badge badge-orange capitalize">{a.category.replace("-", " ")}</span>
                  <span className="text-[10px] text-muted capitalize">{a.priority} priority</span>
                </div>
                <div className="text-sm font-semibold text-ink">{a.title}</div>
                <div className="text-xs text-muted line-clamp-2 mt-0.5">{a.content}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Recognition */}
      {recognition.length > 0 && (
        <>
          <SectionTitle
            title="Recent kudos"
            action={<Link href="/recognition" className="text-xs text-[color:var(--teal-700)] font-semibold">See all</Link>}
          />
          <div className="space-y-2 mb-4">
            {recognition.slice(0, 2).map(r => (
              <div key={r.id} className="card p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Trophy size={14} className="text-[color:var(--orange-500)]" />
                  <div className="text-xs">
                    <span className="font-semibold">{r.sender_name}</span> recognized{" "}
                    <span className="font-semibold">{r.recipient_name}</span>
                  </div>
                </div>
                <div className="text-sm text-ink">{r.message}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Copilot prompt */}
      <Link href="#" data-testid="open-copilot-cta" onClick={(e) => { e.preventDefault(); (document.querySelector('[data-testid="open-copilot-btn"]') as HTMLButtonElement)?.click(); }}
        className="card p-4 flex items-center gap-3 hover:shadow-md transition border-[color:var(--orange-400)]/30"
        style={{ background: "linear-gradient(90deg, #fff7ed 0%, #ffffff 100%)" }}
      >
        <div className="h-10 w-10 rounded-xl bg-[color:var(--orange-500)] text-white flex items-center justify-center"><Bot size={20} /></div>
        <div>
          <div className="text-sm font-bold">Ask your HR Copilot</div>
          <div className="text-xs text-muted">Get instant answers to HR questions — context-aware</div>
        </div>
      </Link>
    </AppShell>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
