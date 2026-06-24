'use client';

import { useEffect, useState } from "react";
import { AppShell } from "../../components/shell/AppShell";
import { PageHeader, SectionTitle, StatusBadge, Empty, Loader } from "../../components/ui/Primitives";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { FileText, Plus, Upload, Check, X } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["identity", "employment", "work-auth", "tax", "education", "other"];

export default function DocumentsPage() {
  const { user } = useSession();
  const [docs, setDocs] = useState<any[]>([]);
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("identity");
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");

  async function load() {
    const d = await api.get<any[]>("/api/documents");
    setDocs(d);
    if (user && ["hr", "admin"].includes(user.role)) {
      // HR sees all docs - reuse users listing & docs
      const users = await api.get<any[]>("/api/users");
      const all: any[] = [];
      for (const u of users) {
        // For now we only fetch their own + show via my_documents. Simplification.
      }
      setAllDocs([]);
    }
  }
  useEffect(() => { load(); }, [user]);

  async function upload() {
    if (!name) { toast.error("Add a name"); return; }
    try {
      await api.post("/api/documents", { category, name, expiry: expiry || null });
      toast.success("Document uploaded");
      setShowForm(false); setName(""); setExpiry("");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function setStatus(id: string, action: "verify" | "reject") {
    const reason = action === "reject" ? (prompt("Rejection reason:") || "") : "";
    await api.post(`/api/documents/${id}/status`, { action, reason });
    toast.success(`Document ${action === "verify" ? "verified" : "rejected"}`);
    load();
  }

  if (!user) return null;
  const canVerify = ["hr", "admin"].includes(user.role);

  return (
    <AppShell>
      <PageHeader title="Documents" subtitle="Identity, employment & tax records" icon={FileText} />
      <SectionTitle title="My documents" action={
        <button data-testid="new-doc-btn" onClick={() => setShowForm(true)} className="btn btn-primary py-1.5 text-xs"><Plus size={14} /> Upload</button>
      } />
      {docs.length === 0 ? <Empty title="No documents yet" /> : (
        <div className="space-y-2">
          {docs.map(d => (
            <div key={d.id} className="card p-3" data-testid={`doc-${d.id}`}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-sm font-semibold">{d.name}</div>
                  <div className="text-xs text-muted capitalize">{d.category.replace("-", " ")}</div>
                </div>
                <StatusBadge status={d.status} />
              </div>
              {d.expiry && <div className="text-xs text-muted">Expires {d.expiry}</div>}
              {d.rejection_reason && <div className="text-xs text-red-600 mt-1">Reason: {d.rejection_reason}</div>}
              {canVerify && d.status === "uploaded" && (
                <div className="flex gap-2 mt-2">
                  <button data-testid={`verify-${d.id}-btn`} onClick={() => setStatus(d.id, "verify")} className="btn btn-primary py-1 text-xs flex-1 justify-center"><Check size={12} /> Verify</button>
                  <button data-testid={`reject-doc-${d.id}-btn`} onClick={() => setStatus(d.id, "reject")} className="btn btn-ghost py-1 text-xs flex-1 justify-center text-red-600"><X size={12} /> Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 w-full max-w-[480px] bg-surface rounded-t-2xl p-5 animate-rise">
            <h3 className="font-bold mb-3">Upload document</h3>
            <label className="text-xs text-muted">Category</label>
            <select data-testid="doc-category-select" value={category} onChange={e => setCategory(e.target.value)} className="input mt-1 mb-3">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <label className="text-xs text-muted">Document name</label>
            <input data-testid="doc-name-input" value={name} onChange={e => setName(e.target.value)} className="input mt-1 mb-3" placeholder="e.g., Driver License" />
            <label className="text-xs text-muted">Expiry (optional)</label>
            <input data-testid="doc-expiry-input" type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="input mt-1 mb-3" />
            <div className="flex gap-2">
              <button data-testid="doc-upload-btn" onClick={upload} className="btn btn-primary flex-1 justify-center"><Upload size={14} /> Upload</button>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
