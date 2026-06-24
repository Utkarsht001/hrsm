'use client';

import { useEffect, useState } from "react";
import { AppShell } from "../../components/shell/AppShell";
import { PageHeader, SectionTitle, StatusBadge, Empty } from "../../components/ui/Primitives";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { UserPlus, Briefcase, MapPin, Star } from "lucide-react";
import toast from "react-hot-toast";

const PIPELINE = ["new", "screening", "shortlisted", "interview-scheduled", "interviewed", "offer-extended", "hired", "rejected"];

export default function RecruitmentPage() {
  const { user } = useSession();
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [tab, setTab] = useState<"jobs" | "pipeline">("pipeline");

  async function load() {
    api.get<any[]>("/api/recruitment/jobs").then(setJobs);
    if (user && ["hr", "admin"].includes(user.role)) {
      api.get<any[]>("/api/recruitment/candidates").then(setCandidates).catch(() => {});
    } else {
      setTab("jobs");
    }
  }
  useEffect(() => { load(); }, [user]);

  async function updateStatus(cid: string, status: string) {
    await api.patch(`/api/recruitment/candidates/${cid}`, { status });
    toast.success(`Status updated to ${status}`);
    load();
    if (selected) setSelected({ ...selected, status });
  }

  if (!user) return null;
  const canManage = ["hr", "admin"].includes(user.role);

  return (
    <AppShell>
      <PageHeader title="Recruitment" subtitle="Open roles & candidate pipeline" icon={UserPlus} />

      {canManage && (
        <div className="flex gap-1 mb-3 bg-surface-2 rounded-xl p-1">
          {(["pipeline", "jobs"] as const).map(t => (
            <button key={t} data-testid={`recruit-tab-${t}`} onClick={() => setTab(t)}
              className={`flex-1 text-xs font-semibold py-2 rounded-lg capitalize ${tab === t ? "bg-[color:var(--teal-700)] text-white" : "text-muted"}`}>{t}</button>
          ))}
        </div>
      )}

      {tab === "pipeline" && canManage && (
        candidates.length === 0 ? <Empty title="No candidates" /> : (
          <div className="space-y-2">
            {candidates.map(c => (
              <button key={c.id} data-testid={`candidate-${c.id}`} onClick={() => setSelected(c)} className="card p-3 w-full text-left">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="text-sm font-bold">{c.name}</div>
                    <div className="text-xs text-muted">{c.applied_role}</div>
                  </div>
                  <div className="flex items-center gap-1 text-[color:var(--orange-500)]">
                    <Star size={12} fill="currentColor" />
                    <span className="text-xs font-bold">{c.rating}</span>
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </button>
            ))}
          </div>
        )
      )}

      {tab === "jobs" && (
        jobs.length === 0 ? <Empty title="No open positions" /> : (
          <div className="space-y-2">
            {jobs.map(j => (
              <div key={j.id} className="card p-3" data-testid={`job-${j.id}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-bold">{j.title}</div>
                  <StatusBadge status={j.status} />
                </div>
                <div className="text-xs text-muted">{j.department}</div>
                <div className="flex items-center gap-3 text-xs text-muted mt-1">
                  <span className="flex items-center gap-1"><MapPin size={12} /> {j.location}</span>
                  <span>{j.employment_type}</span>
                </div>
                <div className="text-xs mt-1">
                  {j.currency === "USD" ? "$" : "₹"}{j.salary_min.toLocaleString()} - {j.currency === "USD" ? "$" : "₹"}{j.salary_max.toLocaleString()}
                </div>
                <div className="flex gap-2 mt-1.5 text-[10px]">
                  <span className="badge badge-slate">{j.applicants} applied</span>
                  <span className="badge badge-teal">{j.shortlisted} shortlist</span>
                  <span className="badge badge-orange">{j.interviewing} interviewing</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelected(null)} />
          <div className="fixed left-1/2 -translate-x-1/2 top-0 z-50 h-full w-full max-w-[480px] bg-surface overflow-y-auto animate-rise">
            <div className="sticky top-0 bg-surface p-4 border-b border-black/5 flex items-center justify-between">
              <div>
                <h3 className="font-bold">{selected.name}</h3>
                <div className="text-xs text-muted">{selected.applied_role}</div>
              </div>
              <button data-testid="close-candidate-btn" onClick={() => setSelected(null)} className="btn btn-ghost py-1 text-xs">Close</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="badge badge-orange">⭐ {selected.rating}</span>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="text-xs grid grid-cols-2 gap-2">
                  <div><b>Experience:</b> {selected.experience_years} yrs</div>
                  <div><b>Notice:</b> {selected.notice_period_days}d</div>
                  <div className="col-span-2"><b>Expected:</b> {selected.currency} {selected.expected_salary.toLocaleString()}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selected.skills?.map((s: string, i: number) => <span key={i} className="badge badge-teal text-[10px]">{s}</span>)}
                </div>
                {selected.notes && <p className="text-xs italic mt-2">{selected.notes}</p>}
              </div>
              <div className="card p-3">
                <div className="text-xs font-bold mb-2">Move candidate to:</div>
                <div className="grid grid-cols-2 gap-2">
                  {PIPELINE.map(s => (
                    <button key={s} data-testid={`move-${s}-btn`} onClick={() => updateStatus(selected.id, s)}
                      className={`text-xs py-1.5 rounded-lg capitalize ${selected.status === s ? "bg-[color:var(--teal-700)] text-white" : "bg-surface-2"}`}>
                      {s.replace(/-/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => toast.success("Interview scheduled (demo)")} className="btn btn-accent w-full justify-center">Schedule interview</button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
