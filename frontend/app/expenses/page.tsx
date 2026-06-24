'use client';

import { useEffect, useState } from "react";
import { AppShell } from "../../components/shell/AppShell";
import { PageHeader, SectionTitle, StatusBadge, Empty } from "../../components/ui/Primitives";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { Receipt, Plus, Check, X } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["travel", "food", "accommodation", "communication", "medical", "office-supplies", "other"];

export default function ExpensesPage() {
  const { user } = useSession();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("travel");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  async function load() {
    const e = await api.get<any[]>("/api/expenses");
    setExpenses(e);
    if (user && ["manager", "hr", "admin"].includes(user.role)) {
      api.get<any[]>("/api/expenses/approvals").then(setApprovals).catch(() => {});
    }
  }
  useEffect(() => { load(); }, [user]);

  async function submit() {
    if (!amount || !description) { toast.error("Fill required fields"); return; }
    try {
      await api.post("/api/expenses", { category, amount: parseFloat(amount), currency, description, date });
      toast.success("Expense submitted");
      setShowForm(false); setAmount(""); setDescription("");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function act(id: string, action: "approve" | "reject") {
    const comments = prompt(`Comments for ${action}:`) || "";
    await api.post(`/api/expenses/${id}/action`, { action, comments });
    toast.success(action === "approve" ? "Approved" : "Rejected");
    load();
  }

  if (!user) return null;

  return (
    <AppShell>
      <PageHeader title="Expenses & Reimbursements" subtitle="Submit claims & track reimbursements" icon={Receipt} />

      {approvals.length > 0 && (
        <>
          <SectionTitle title="Pending approvals" />
          <div className="space-y-2 mb-4">
            {approvals.map(r => (
              <div key={r.id} className="card p-3" data-testid={`exp-approval-${r.id}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold">{r.user_name}</div>
                  <span className="font-bold text-[color:var(--teal-700)]">{r.currency} {r.amount}</span>
                </div>
                <div className="text-xs text-muted">{r.category} · {r.date}</div>
                <div className="text-xs mt-1">"{r.description}"</div>
                {r.policy_validation && (
                  <div className={`text-xs mt-1 ${r.policy_validation.within_limit ? "text-green-600" : "text-orange-600"}`}>
                    {r.policy_validation.message}
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <button data-testid={`approve-exp-${r.id}-btn`} onClick={() => act(r.id, "approve")} className="btn btn-primary py-1 text-xs flex-1 justify-center"><Check size={12} /> Approve</button>
                  <button data-testid={`reject-exp-${r.id}-btn`} onClick={() => act(r.id, "reject")} className="btn btn-ghost py-1 text-xs flex-1 justify-center text-red-600"><X size={12} /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle title="My expenses" action={
        <button data-testid="new-exp-btn" onClick={() => setShowForm(true)} className="btn btn-primary py-1.5 text-xs"><Plus size={14} /> New</button>
      } />
      {expenses.length === 0 ? <Empty title="No expenses yet" /> : (
        <div className="space-y-2">
          {expenses.map(e => (
            <div key={e.id} className="card p-3" data-testid={`expense-${e.id}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="badge badge-teal capitalize">{e.category}</span>
                <span className="font-bold text-[color:var(--teal-700)]">{e.currency} {e.amount}</span>
              </div>
              <div className="text-sm font-semibold">{e.description}</div>
              <div className="text-xs text-muted">{e.date}</div>
              <div className="flex items-center justify-between mt-1">
                <StatusBadge status={e.status} />
                {e.policy_validation && (
                  <span className={`text-[10px] ${e.policy_validation.within_limit ? "text-green-600" : "text-orange-600"}`}>
                    {e.policy_validation.message}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 w-full max-w-[480px] bg-surface rounded-t-2xl p-5 animate-rise">
            <h3 className="font-bold mb-3">Submit expense</h3>
            <label className="text-xs text-muted">Category</label>
            <select data-testid="exp-category-select" value={category} onChange={e => setCategory(e.target.value)} className="input mt-1 mb-3">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="col-span-2">
                <label className="text-xs text-muted">Amount</label>
                <input data-testid="exp-amount-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted">Currency</label>
                <select data-testid="exp-currency-select" value={currency} onChange={e => setCurrency(e.target.value)} className="input mt-1">
                  <option>USD</option><option>INR</option><option>EUR</option><option>GBP</option>
                </select>
              </div>
            </div>
            <label className="text-xs text-muted">Description</label>
            <textarea data-testid="exp-description-input" value={description} onChange={e => setDescription(e.target.value)} className="input mt-1 mb-3" />
            <label className="text-xs text-muted">Date</label>
            <input data-testid="exp-date-input" type="date" value={date} onChange={e => setDate(e.target.value)} className="input mt-1 mb-3" />
            <div className="flex gap-2">
              <button data-testid="exp-submit-btn" onClick={submit} className="btn btn-primary flex-1 justify-center">Submit</button>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
