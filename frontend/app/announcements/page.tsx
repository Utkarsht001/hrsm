'use client';

import { useEffect, useState } from "react";
import { AppShell } from "../../components/shell/AppShell";
import { PageHeader, SectionTitle, Empty } from "../../components/ui/Primitives";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { Megaphone, Plus, Eye, Heart, Check, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["hr-update", "event", "policy", "celebration", "compliance", "general"];

export default function AnnouncementsPage() {
  const { user } = useSession();
  const [list, setList] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [visibility, setVisibility] = useState("global");

  async function load() {
    const d = await api.get<any[]>("/api/announcements");
    setList(d);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!title || !content) { toast.error("Fill required fields"); return; }
    await api.post("/api/announcements", { title, content, category, priority, visibility, target: [] });
    toast.success("Announcement published");
    setShowForm(false); setTitle(""); setContent("");
    load();
  }

  async function acknowledge(id: string) {
    await api.post(`/api/announcements/${id}/acknowledge`);
    toast.success("Acknowledged");
    load();
  }

  if (!user) return null;
  const canPost = ["hr", "admin"].includes(user.role);

  return (
    <AppShell>
      <PageHeader title="Announcements" subtitle="Company-wide communications" icon={Megaphone} />
      <SectionTitle
        title="Latest"
        action={canPost ? <button data-testid="new-ann-btn" onClick={() => setShowForm(true)} className="btn btn-primary py-1.5 text-xs"><Plus size={14} /> Post</button> : undefined}
      />
      {list.length === 0 ? <Empty title="No announcements" /> : (
        <div className="space-y-2">
          {list.map(a => (
            <div key={a.id} className="card p-4" data-testid={`ann-${a.id}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`badge ${a.priority === "high" ? "badge-danger" : a.priority === "medium" ? "badge-orange" : "badge-slate"} text-[10px] capitalize`}>{a.priority}</span>
                <span className="badge badge-teal text-[10px] capitalize">{a.category.replace("-", " ")}</span>
              </div>
              <div className="text-sm font-bold mb-1">{a.title}</div>
              <p className="text-xs text-ink leading-relaxed">{a.content}</p>
              <div className="text-[10px] text-muted mt-2">
                By {a.author_name} {a.expiry && `· expires ${a.expiry}`}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                <span className="flex items-center gap-1"><Eye size={12} /> {a.views}</span>
                <span className="flex items-center gap-1"><Heart size={12} /> {a.likes}</span>
                <span className="flex items-center gap-1"><Check size={12} /> {a.acknowledgments}</span>
                <span className="flex items-center gap-1"><MessageCircle size={12} /> {a.comments_count}</span>
              </div>
              {(a.category === "policy" || a.category === "compliance") && (
                <button data-testid={`ack-${a.id}-btn`} onClick={() => acknowledge(a.id)} className="btn btn-primary py-1 text-xs w-full justify-center mt-2"><Check size={12} /> Acknowledge</button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 w-full max-w-[480px] bg-surface rounded-t-2xl p-5 animate-rise">
            <h3 className="font-bold mb-3">New announcement</h3>
            <label className="text-xs text-muted">Title</label>
            <input data-testid="ann-title-input" value={title} onChange={e => setTitle(e.target.value)} className="input mt-1 mb-3" />
            <label className="text-xs text-muted">Content</label>
            <textarea data-testid="ann-content-input" value={content} onChange={e => setContent(e.target.value)} className="input mt-1 mb-3" rows={4} />
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className="text-[10px] text-muted">Category</label>
                <select data-testid="ann-category-select" value={category} onChange={e => setCategory(e.target.value)} className="input mt-1 text-xs">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted">Priority</label>
                <select data-testid="ann-priority-select" value={priority} onChange={e => setPriority(e.target.value)} className="input mt-1 text-xs">
                  <option>low</option><option>medium</option><option>high</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted">Visibility</label>
                <select data-testid="ann-visibility-select" value={visibility} onChange={e => setVisibility(e.target.value)} className="input mt-1 text-xs">
                  <option>global</option><option>department</option><option>location</option>
                </select>
              </div>
            </div>
            <button data-testid="ann-submit-btn" onClick={submit} className="btn btn-primary w-full justify-center">Publish</button>
          </div>
        </>
      )}
    </AppShell>
  );
}
