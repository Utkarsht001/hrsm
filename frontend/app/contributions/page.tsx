'use client';

import { useEffect, useState } from "react";
import { AppShell } from "../../components/shell/AppShell";
import { PageHeader, SectionTitle, StatusBadge, Empty } from "../../components/ui/Primitives";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { Sparkles, Plus, Trophy, Crown, Award, Check, X } from "lucide-react";
import toast from "react-hot-toast";

export default function ContributionsPage() {
  const { user } = useSession();
  const [feed, setFeed] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("innovation");
  const [points, setPoints] = useState(50);
  const [tab, setTab] = useState<"feed" | "available" | "leaderboard">("feed");

  async function load() {
    const [f, i, lb] = await Promise.all([
      api.get<any[]>("/api/contributions"),
      api.get<any[]>("/api/contributions/items"),
      api.get<any[]>("/api/contributions/leaderboard"),
    ]);
    setFeed(f); setItems(i); setLeaderboard(lb);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!title) { toast.error("Title required"); return; }
    await api.post("/api/contributions", { title, description, category, suggested_points: points });
    toast.success("Contribution proposed");
    setShowForm(false); setTitle(""); setDescription("");
    load();
  }

  async function claim(id: string) {
    await api.post(`/api/contributions/items/${id}/claim`);
    toast.success("Item claimed!");
    load();
  }

  async function act(id: string, action: "approve" | "reject") {
    const fp = action === "approve" ? parseInt(prompt("Final points to award:", "100") || "0") : 0;
    const comments = prompt("Comments:") || "";
    await api.post(`/api/contributions/${id}/action`, { action, final_points: fp, comments });
    toast.success("Done");
    load();
  }

  if (!user) return null;
  const canApprove = ["manager", "hr", "admin"].includes(user.role);

  return (
    <AppShell>
      <PageHeader title="Contributions" subtitle="Earn points, claim work, climb the leaderboard" icon={Sparkles} accent="orange" />

      <div className="flex gap-1 mb-3 bg-surface-2 rounded-xl p-1">
        {(["feed", "available", "leaderboard"] as const).map(t => (
          <button
            key={t}
            data-testid={`contrib-tab-${t}`}
            onClick={() => setTab(t)}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg capitalize ${tab === t ? "bg-[color:var(--teal-700)] text-white" : "text-muted"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "feed" && (
        <>
          <div className="flex justify-end mb-2">
            <button data-testid="new-contrib-btn" onClick={() => setShowForm(true)} className="btn btn-primary py-1.5 text-xs"><Plus size={14} /> Propose</button>
          </div>
          {feed.length === 0 ? <Empty title="No contributions yet" /> : (
            <div className="space-y-2">
              {feed.map(c => (
                <div key={c.id} className="card p-3" data-testid={`contrib-${c.id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-bold">{c.title}</div>
                    <span className="badge badge-orange text-[10px]">{c.points || c.suggested_points} pts</span>
                  </div>
                  <div className="text-xs text-muted">{c.user_name} · {c.category} · {c.impact} impact</div>
                  <p className="text-xs mt-1">{c.description}</p>
                  <div className="flex gap-2 mt-2 items-center">
                    <StatusBadge status={c.status} />
                    {c.tags?.map((t: string, i: number) => <span key={i} className="badge badge-slate text-[10px]">#{t}</span>)}
                  </div>
                  {canApprove && c.approval_status === "pending" && (
                    <div className="flex gap-2 mt-2">
                      <button data-testid={`approve-contrib-${c.id}`} onClick={() => act(c.id, "approve")} className="btn btn-primary py-1 text-xs flex-1 justify-center"><Check size={12} /> Approve</button>
                      <button data-testid={`reject-contrib-${c.id}`} onClick={() => act(c.id, "reject")} className="btn btn-ghost py-1 text-xs flex-1 justify-center text-red-600"><X size={12} /> Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "available" && (
        items.length === 0 ? <Empty title="No items available" /> : (
          <div className="space-y-2">
            {items.map(it => (
              <div key={it.id} className="card p-3" data-testid={`item-${it.id}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-bold">{it.title}</div>
                  <span className="badge badge-orange text-[10px]">{it.suggested_points} pts</span>
                </div>
                <div className="text-xs text-muted capitalize">{it.category.replace(/-/g, " ")}</div>
                <button data-testid={`claim-${it.id}-btn`} onClick={() => claim(it.id)} className="btn btn-accent py-1 text-xs w-full justify-center mt-2">Claim</button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "leaderboard" && (
        leaderboard.length === 0 ? <Empty title="No leaderboard data" /> : (
          <div className="space-y-2">
            {leaderboard.map(l => (
              <div key={l.user_id} className="card p-3 flex items-center gap-3" data-testid={`lb-${l.user_id}`}>
                <div className="text-2xl font-extrabold w-8 text-center">
                  {l.rank === 1 ? <Crown className="text-yellow-500 mx-auto" /> : `#${l.rank}`}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{l.name}</div>
                  <div className="text-xs text-muted">{l.contributions} contributions · ⭐ {l.average_rating}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-[color:var(--orange-600)]">{l.total_points}</div>
                  <div className="text-[10px] text-muted">points</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 w-full max-w-[480px] bg-surface rounded-t-2xl p-5 animate-rise">
            <h3 className="font-bold mb-3">Propose contribution</h3>
            <label className="text-xs text-muted">Title</label>
            <input data-testid="contrib-title-input" value={title} onChange={e => setTitle(e.target.value)} className="input mt-1 mb-3" />
            <label className="text-xs text-muted">Description</label>
            <textarea data-testid="contrib-desc-input" value={description} onChange={e => setDescription(e.target.value)} className="input mt-1 mb-3" />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-muted">Category</label>
                <select data-testid="contrib-category-select" value={category} onChange={e => setCategory(e.target.value)} className="input mt-1">
                  {["innovation", "process-improvement", "cost-saving", "revenue-generation", "quality", "customer-satisfaction", "team-building", "other"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted">Points</label>
                <input data-testid="contrib-points-input" type="number" value={points} onChange={e => setPoints(parseInt(e.target.value))} className="input mt-1" />
              </div>
            </div>
            <button data-testid="contrib-submit-btn" onClick={submit} className="btn btn-primary w-full justify-center">Submit proposal</button>
          </div>
        </>
      )}
    </AppShell>
  );
}
