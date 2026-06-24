'use client';

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Loader, StatusBadge } from "../../components/ui/Primitives";
import { CheckCircle2, Play, Plane, Home, Users, Calendar, Award, PartyPopper } from "lucide-react";
import toast from "react-hot-toast";
import { useSession } from "../../context/SessionContext";

export default function OnboardingDashboard() {
  const { refresh } = useSession();
  const [data, setData] = useState<any>(null);

  async function load() {
    const d = await api.get<any>("/api/onboarding/dashboard");
    setData(d);
  }
  useEffect(() => { load(); }, []);

  if (!data) return <Loader />;

  async function complete(tid: string) {
    await api.post(`/api/onboarding/tasks/${tid}/complete`);
    toast.success("Task completed");
    load();
  }

  async function finishOnboarding() {
    await api.post("/api/onboarding/complete");
    toast.success("Welcome aboard! 🎉");
    await refresh();
  }

  const tasksByPhase: Record<string, any[]> = {};
  for (const t of (data.tasks || [])) {
    tasksByPhase[t.phase] = tasksByPhase[t.phase] || [];
    tasksByPhase[t.phase].push(t);
  }
  const PHASES = [
    { key: "pre-joining", label: "Pre-joining" },
    { key: "day-1", label: "Day 1" },
    { key: "week-1", label: "Week 1" },
    { key: "week-2", label: "Week 2" },
    { key: "month-1", label: "Month 1" },
  ];

  return (
    <div className="space-y-4">
      {/* Hero progress */}
      <div className="rounded-2xl text-white p-5 grain shadow-soft animate-rise"
        style={{ background: "linear-gradient(135deg, #f97316 0%, #c2410c 100%)" }}>
        <div className="text-[11px] uppercase tracking-[0.2em] opacity-80">Onboarding</div>
        <h1 className="text-2xl font-extrabold">Welcome to WorkFlow! 🎉</h1>
        <p className="text-xs opacity-90 mt-1">Manager: {data.manager_name} · Buddy: {data.buddy_name}</p>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span>Onboarding progress</span>
            <span className="font-bold">{data.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${data.progress}%` }} />
          </div>
        </div>
      </div>

      {/* Welcome messages */}
      <div>
        <h2 className="font-bold text-base mb-2">Welcome messages</h2>
        <div className="space-y-2">
          {data.welcome_messages.map((m: any) => (
            <div key={m.id} className="card p-3" data-testid={`welcome-${m.sender_name.replace(/\s/g, "-")}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-semibold">{m.sender_name}</div>
                <span className="badge badge-teal">{m.sender_role}</span>
              </div>
              <p className="text-xs text-muted">{m.message}</p>
              {m.has_video && (
                <button className="mt-2 btn btn-ghost py-1 text-xs"><Play size={12} /> Watch welcome video</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div>
        <h2 className="font-bold text-base mb-2">Your tasks</h2>
        {PHASES.map(phase => {
          const items = tasksByPhase[phase.key];
          if (!items?.length) return null;
          return (
            <div key={phase.key} className="mb-4">
              <div className="text-[11px] uppercase tracking-wider text-muted font-bold mb-1.5">{phase.label}</div>
              <div className="space-y-2">
                {items.map((t: any) => (
                  <div key={t.id} className="card p-3 flex items-start gap-3" data-testid={`onboarding-task-${t.id}`}>
                    <button
                      onClick={() => t.status !== "completed" && t.assignee === "employee" && complete(t.id)}
                      disabled={t.status === "completed" || t.assignee !== "employee"}
                      data-testid={`complete-task-${t.id}-btn`}
                      className={`h-6 w-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${
                        t.status === "completed" ? "bg-[color:var(--success)] border-[color:var(--success)] text-white" : "border-[color:var(--slate-400)]"
                      }`}
                    >
                      {t.status === "completed" && <CheckCircle2 size={14} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{t.title}</div>
                      <div className="text-xs text-muted">{t.description}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-muted">Due {t.due_date}</span>
                        <span className={`badge ${t.priority === "high" ? "badge-danger" : "badge-slate"} text-[10px]`}>
                          {t.priority}
                        </span>
                        <span className="badge badge-slate text-[10px]">{t.assignee}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Relocation */}
      <div className="card p-4">
        <h2 className="font-bold mb-2 flex items-center gap-2"><Plane size={16} /> Relocation support</h2>
        <div className="space-y-1.5 text-xs">
          <div><b>Status:</b> <StatusBadge status={data.relocation.status} /></div>
          <div><b>Visa:</b> {data.relocation.visa_status}</div>
          <div className="flex items-start gap-1.5"><Home size={12} className="mt-0.5" /><span>{data.relocation.accommodation}</span></div>
          <div className="flex items-start gap-1.5"><Plane size={12} className="mt-0.5" /><span>{data.relocation.travel}</span></div>
          <div><b>Allowance:</b> ${data.relocation.allowance_usd.toLocaleString()}</div>
          <div><b>Local buddy:</b> {data.relocation.local_buddy}</div>
        </div>
      </div>

      {/* Team intros */}
      <div>
        <h2 className="font-bold mb-2 flex items-center gap-2"><Users size={16} /> Meet your team</h2>
        <div className="space-y-2">
          {data.team_intros.map((t: any) => (
            <div key={t.name} className="card p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-semibold">{t.name}</div>
                <span className="badge badge-teal text-[10px]">{t.role}</span>
              </div>
              <p className="text-xs text-muted">{t.bio}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {t.expertise.map((e: string) => (
                  <span key={e} className="badge badge-slate text-[10px]">{e}</span>
                ))}
              </div>
              <div className="text-[11px] text-[color:var(--orange-600)] italic mt-1.5">Fun fact: {t.fun_fact}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div>
        <h2 className="font-bold mb-2 flex items-center gap-2"><Award size={16} /> Milestones</h2>
        <div className="space-y-2">
          {data.milestones.map((m: any) => (
            <div key={m.title} className="card p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{m.title}</div>
                <div className="text-xs text-muted">{m.date}</div>
              </div>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Complete */}
      {data.progress >= 50 && (
        <button
          data-testid="complete-onboarding-btn"
          onClick={finishOnboarding}
          className="btn btn-accent w-full justify-center"
        >
          <PartyPopper size={16} /> Complete onboarding & enter app
        </button>
      )}
    </div>
  );
}
