'use client';

import { useEffect, useState } from "react";
import { AppShell } from "../../components/shell/AppShell";
import { PageHeader, SectionTitle, Empty } from "../../components/ui/Primitives";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { Trophy, Plus, Heart, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["excellence", "team-player", "innovation", "leadership", "customer-focus"];

export default function RecognitionPage() {
  const { user } = useSession();
  const [feed, setFeed] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [category, setCategory] = useState("excellence");
  const [message, setMessage] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  async function load() {
    const [f, u] = await Promise.all([api.get<any[]>("/api/recognition"), api.get<any[]>("/api/users")]);
    setFeed(f); setUsers(u.filter((x: any) => x.id !== user?.id));
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function send() {
    if (!recipient || !message) { toast.error("Pick someone & write a message"); return; }
    await api.post("/api/recognition", { recipient_id: recipient, category, message, visibility });
    toast.success("Kudos sent! 🎉");
    setShowForm(false); setMessage(""); setRecipient("");
    load();
  }

  async function like(id: string) {
    await api.post(`/api/recognition/${id}/like`);
    load();
  }

  return (
    <AppShell>
      <PageHeader title="Recognition" subtitle="Celebrate teammates" icon={Trophy} accent="orange" />
      <SectionTitle title="Kudos feed" action={
        <button data-testid="new-recog-btn" onClick={() => setShowForm(true)} className="btn btn-accent py-1.5 text-xs"><Plus size={14} /> Send</button>
      } />
      {feed.length === 0 ? <Empty title="No kudos yet" hint="Be the first to recognize a teammate" /> : (
        <div className="space-y-2">
          {feed.map(r => (
            <div key={r.id} className="card p-3" data-testid={`recog-${r.id}`}>
              <div className="flex items-start gap-2.5">
                <div className="h-9 w-9 rounded-full bg-[color:var(--orange-50)] text-[color:var(--orange-600)] flex items-center justify-center"><Trophy size={16} /></div>
                <div className="flex-1">
                  <div className="text-xs">
                    <span className="font-bold">{r.sender_name}</span> recognized <span className="font-bold">{r.recipient_name}</span>
                  </div>
                  <span className="badge badge-orange text-[10px] capitalize">{r.category.replace("-", " ")}</span>
                  <p className="text-sm mt-1.5">{r.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                    <button data-testid={`like-${r.id}-btn`} onClick={() => like(r.id)} className="flex items-center gap-1 hover:text-red-500"><Heart size={12} /> {r.likes}</button>
                    <span className="flex items-center gap-1"><MessageCircle size={12} /> {r.comments_count}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 w-full max-w-[480px] bg-surface rounded-t-2xl p-5 animate-rise">
            <h3 className="font-bold mb-3">Send recognition</h3>
            <label className="text-xs text-muted">Recipient</label>
            <select data-testid="recog-recipient-select" value={recipient} onChange={e => setRecipient(e.target.value)} className="input mt-1 mb-3">
              <option value="">Select…</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <label className="text-xs text-muted">Category</label>
            <select data-testid="recog-category-select" value={category} onChange={e => setCategory(e.target.value)} className="input mt-1 mb-3">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <label className="text-xs text-muted">Message</label>
            <textarea data-testid="recog-message-input" value={message} onChange={e => setMessage(e.target.value)} className="input mt-1 mb-3" placeholder="What did they do well?" />
            <div className="flex gap-2 mb-3">
              {(["public", "private"] as const).map(v => (
                <button key={v} data-testid={`vis-${v}-btn`} onClick={() => setVisibility(v)} className={`btn flex-1 ${visibility === v ? "btn-primary" : "btn-ghost"}`}>
                  {v}
                </button>
              ))}
            </div>
            <button data-testid="recog-submit-btn" onClick={send} className="btn btn-accent w-full justify-center">Send kudos</button>
          </div>
        </>
      )}
    </AppShell>
  );
}
