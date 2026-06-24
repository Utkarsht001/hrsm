'use client';

import { useEffect, useState } from "react";
import { AppShell } from "../../components/shell/AppShell";
import { PageHeader, SectionTitle, Loader, StatusBadge, Empty } from "../../components/ui/Primitives";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { Briefcase, Plus, Check, X } from "lucide-react";
import toast from "react-hot-toast";

const LEAVE_TYPES = ["casual", "sick", "personal", "maternity", "paternity", "lwp", "comp-off"];

export default function LeavePage() {
  const { user } = useSession();
  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState("casual");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");

  async function load() {
    const [b, r] = await Promise.all([
      api.get<any[]>("/api/leave/balances"),
      api.get<any[]>("/api/leave/requests"),
    ]);
    setBalances(b);
    setRequests(r);
    if (user && ["manager", "hr", "admin"].includes(user.role)) {
      api.get<any[]>("/api/leave/approvals").then(setApprovals).catch(() => {});
    }
  }
  useEffect(() => { load(); }, [user]);

  async function submit() {
    if (!start || !end || !reason) { toast.error("Fill all fields"); return; }
    try {
      await api.post("/api/leave/requests", { type, start_date: start, end_date: end, reason });
      toast.success("Leave request submitted");
      setShowForm(false); setStart(""); setEnd(""); setReason("");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function act(id: string, action: "approve" | "reject") {
    const comments = prompt(`Comments for ${action}:`) || "";
    await api.post(`/api/leave/requests/${id}/action`, { action, comments });
    toast.success(action === "approve" ? "Approved" : "Rejected");
    load();
  }

  if (!user) return null;

  return (
    <AppShell>
      <PageHeader title="Leave Management" subtitle="Request time off & approvals" icon={Briefcase} />

      {/* Balances */}
      <SectionTitle title="Your balances" subtitle="2026" action={
        <button data-testid="new-leave-btn" onClick={() => setShowForm(true)} className="btn btn-primary py-1.5 text-xs"><Plus size={14} /> Request</button>
      } />
      <div className="grid grid-cols-2 gap-2 mb-4">
        {balances.map(b => (
          <div key={b.id} className="card p-3" data-testid={`balance-${b.type}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-bold capitalize">{b.type.replace("-", " ")}</div>
              <span className="text-2xl font-extrabold text-[color:var(--teal-700)]">{b.available}</span>
            </div>
            <div className="text-[10px] text-muted">Total {b.total} · Used {b.used} · Pending {b.pending}</div>
          </div>
        ))}
      </div>

      {/* Approvals (managers) */}
      {approvals.length > 0 && (
        <>
          <SectionTitle title="Pending approvals" />
          <div className="space-y-2 mb-4">
            {approvals.map(r => (
              <div key={r.id} className="card p-3" data-testid={`approval-${r.id}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold">{r.user_name}</div>
                  <span className="badge badge-teal capitalize">{r.type}</span>
                </div>
                <div className="text-xs text-muted">{r.start_date} → {r.end_date} ({r.total_days} days)</div>
                <div className="text-xs italic mt-1">"{r.reason}"</div>
                <div className="flex gap-2 mt-2">
                  <button data-testid={`approve-${r.id}-btn`} onClick={() => act(r.id, "approve")} className="btn btn-primary py-1 text-xs flex-1 justify-center"><Check size={12} /> Approve</button>
                  <button data-testid={`reject-${r.id}-btn`} onClick={() => act(r.id, "reject")} className="btn btn-ghost py-1 text-xs flex-1 justify-center text-red-600"><X size={12} /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* My requests */}
      <SectionTitle title="My requests" />
      {requests.length === 0 ? <Empty title="No requests yet" hint="Tap Request to submit time off" /> : (
        <div className="space-y-2">
          {requests.map(r => (
            <div key={r.id} className="card p-3" data-testid={`request-${r.id}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="badge badge-teal capitalize">{r.type}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-sm font-semibold">{r.start_date} → {r.end_date}</div>
              <div className="text-xs text-muted">{r.total_days} day(s) · {r.reason}</div>
              {r.approver_comments && <div className="text-xs italic mt-1">Note: {r.approver_comments}</div>}
            </div>
          ))}
        </div>
      )}

      {/* New leave form modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 w-full max-w-[480px] bg-surface rounded-t-2xl p-5 animate-rise">
            <h3 className="font-bold text-lg mb-3">New leave request</h3>
            <label className="text-xs text-muted">Type</label>
            <select data-testid="leave-type-select" value={type} onChange={e => setType(e.target.value)} className="input mt-1 mb-3">
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-muted">Start</label>
                <input data-testid="leave-start-input" type="date" value={start} onChange={e => setStart(e.target.value)} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted">End</label>
                <input data-testid="leave-end-input" type="date" value={end} onChange={e => setEnd(e.target.value)} className="input mt-1" />
              </div>
            </div>
            <label className="text-xs text-muted">Reason</label>
            <textarea data-testid="leave-reason-input" value={reason} onChange={e => setReason(e.target.value)} className="input mt-1 mb-3" placeholder="Brief reason…" />
            <div className="flex gap-2">
              <button data-testid="leave-submit-btn" onClick={submit} className="btn btn-primary flex-1 justify-center">Submit request</button>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
