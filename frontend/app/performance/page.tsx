'use client';

import { useEffect, useState } from "react";
import { AppShell } from "../../components/shell/AppShell";
import { PageHeader, SectionTitle, StatusBadge, Empty } from "../../components/ui/Primitives";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { Target, Plus, Star, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";

export default function PerformancePage() {
  const { user } = useSession();
  const [goals, setGoals] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [weight, setWeight] = useState(25);

  async function load() {
    const [g, r] = await Promise.all([api.get<any[]>("/api/goals"), api.get<any[]>("/api/reviews")]);
    setGoals(g);
    setReviews(r);
  }
  useEffect(() => { load(); }, []);

  async function createGoal() {
    if (!title || !dueDate) { toast.error("Title and due date required"); return; }
    await api.post("/api/goals", { title, description, due_date: dueDate, weight });
    toast.success("Goal created");
    setShowForm(false); setTitle(""); setDescription(""); setDueDate("");
    load();
  }

  async function updateProgress(goal: any, delta: number) {
    const next = Math.max(0, Math.min(100, (goal.progress || 0) + delta));
    await api.patch(`/api/goals/${goal.id}`, { progress: next });
    load();
  }

  if (!user) return null;

  return (
    <AppShell>
      <PageHeader title="Performance & Goals" subtitle="OKRs, reviews & growth" icon={Target} />

      <SectionTitle title="Goals & OKRs" action={
        <button data-testid="new-goal-btn" onClick={() => setShowForm(true)} className="btn btn-primary py-1.5 text-xs"><Plus size={14} /> Goal</button>
      } />
      {goals.length === 0 ? <Empty title="No goals yet" hint="Set quarterly goals to track impact" /> : (
        <div className="space-y-3 mb-4">
          {goals.map(g => (
            <div key={g.id} className="card p-3" data-testid={`goal-${g.id}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-bold">{g.title}</div>
                <span className="badge badge-teal text-[10px] capitalize">{g.type}</span>
              </div>
              <div className="text-xs text-muted">{g.description}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-muted">Weight {g.weight}% · Due {g.due_date}</span>
                <StatusBadge status={g.status} />
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progress</span><span className="font-bold">{g.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[color:var(--teal-700)]" style={{ width: `${g.progress}%` }} />
                </div>
              </div>
              <div className="flex gap-1 mt-2">
                <button data-testid={`goal-down-${g.id}`} onClick={() => updateProgress(g, -10)} className="btn btn-ghost py-1 text-xs">-10%</button>
                <button data-testid={`goal-up-${g.id}`} onClick={() => updateProgress(g, 10)} className="btn btn-primary py-1 text-xs">+10%</button>
              </div>
              {g.key_results?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-black/5 space-y-1">
                  {g.key_results.map((kr: any) => (
                    <div key={kr.title} className="text-xs flex justify-between">
                      <span>{kr.title}</span>
                      <span className="font-semibold">{kr.current}/{kr.target}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <SectionTitle title="Reviews" />
      {reviews.length === 0 ? <Empty title="No reviews yet" /> : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="card p-4" data-testid={`review-${r.id}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-bold">{r.period}</div>
                  <div className="text-xs text-muted capitalize">{r.type} review</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[color:var(--orange-500)]">
                    {[1,2,3,4,5].map(i => <Star key={i} size={14} fill={i <= Math.round(r.overall_rating) ? "currentColor" : "none"} />)}
                  </div>
                  <div className="text-sm font-bold">{r.overall_rating}/5</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {Object.entries(r.category_ratings || {}).map(([k, v]: any) => (
                  <div key={k} className="text-xs">
                    <span className="capitalize text-muted">{k}</span>
                    <div className="font-bold">{v}/5</div>
                  </div>
                ))}
              </div>
              <div className="text-xs">
                <div className="font-semibold mb-1">Strengths</div>
                <ul className="list-disc list-inside text-muted">{r.strengths?.map((s: string) => <li key={s}>{s}</li>)}</ul>
                <div className="font-semibold mt-2 mb-1">Areas to improve</div>
                <ul className="list-disc list-inside text-muted">{r.improvements?.map((s: string) => <li key={s}>{s}</li>)}</ul>
                <div className="font-semibold mt-2 mb-1">Recommendation</div>
                <p className="italic">{r.recommendations}</p>
                <div className="mt-2 text-muted">Goals achieved: <b>{r.goals_achieved}/{r.goals_total}</b></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 w-full max-w-[480px] bg-surface rounded-t-2xl p-5 animate-rise">
            <h3 className="font-bold mb-3">New goal</h3>
            <label className="text-xs text-muted">Title</label>
            <input data-testid="goal-title-input" value={title} onChange={e => setTitle(e.target.value)} className="input mt-1 mb-3" />
            <label className="text-xs text-muted">Description</label>
            <textarea data-testid="goal-description-input" value={description} onChange={e => setDescription(e.target.value)} className="input mt-1 mb-3" />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-muted">Due date</label>
                <input data-testid="goal-due-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted">Weight %</label>
                <input data-testid="goal-weight-input" type="number" value={weight} onChange={e => setWeight(parseInt(e.target.value))} className="input mt-1" />
              </div>
            </div>
            <button data-testid="goal-submit-btn" onClick={createGoal} className="btn btn-primary w-full justify-center">Create goal</button>
          </div>
        </>
      )}
    </AppShell>
  );
}
