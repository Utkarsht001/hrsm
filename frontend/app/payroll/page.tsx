'use client';

import { useEffect, useState } from "react";
import { AppShell } from "../../components/shell/AppShell";
import { PageHeader, SectionTitle, Loader, StatusBadge, Empty } from "../../components/ui/Primitives";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { DollarSign, Download, FileCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function PayrollPage() {
  const { user } = useSession();
  const [payslips, setPayslips] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    api.get<any[]>("/api/payroll/payslips").then(setPayslips);
    if (user && ["hr", "admin"].includes(user.role)) {
      api.get("/api/payroll/compliance").then(setCompliance).catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  return (
    <AppShell>
      <PageHeader title="Payroll & Compliance" subtitle="Payslips, taxes, & statutory" icon={DollarSign} />

      {/* Compliance dashboard (HR/Admin) */}
      {compliance && (
        <>
          <SectionTitle title="Compliance dashboard" />
          <div className="space-y-2 mb-4">
            {compliance.items.map((c: any, i: number) => (
              <div key={i} className="card p-3 flex items-center justify-between" data-testid={`compliance-${i}`}>
                <div>
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-xs text-muted">{c.country} · Due {c.due_date}</div>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Payslips */}
      <SectionTitle title="My payslips" />
      {payslips.length === 0 ? <Empty title="No payslips yet" /> : (
        <div className="space-y-2">
          {payslips.map(p => (
            <button
              key={p.id}
              data-testid={`payslip-${p.id}`}
              onClick={() => setSelected(p)}
              className="card p-3 w-full text-left hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">{p.pay_period}</div>
                  <div className="text-xs text-muted">Paid {p.pay_date} · {p.country}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-[color:var(--teal-700)]">
                    {p.currency === "USD" ? "$" : "₹"}{p.net.toLocaleString()}
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelected(null)} />
          <div className="fixed left-1/2 -translate-x-1/2 top-0 z-50 h-full w-full max-w-[480px] bg-surface overflow-y-auto animate-rise">
            <div className="sticky top-0 bg-surface p-4 border-b border-black/5 flex items-center justify-between">
              <div>
                <h3 className="font-bold">{selected.pay_period}</h3>
                <div className="text-xs text-muted">Pay date {selected.pay_date}</div>
              </div>
              <button data-testid="close-payslip-btn" onClick={() => setSelected(null)} className="btn btn-ghost py-1 text-xs">Close</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="card p-4 text-white" style={{ background: "linear-gradient(135deg, #0f766e 0%, #134e4a 100%)" }}>
                <div className="text-xs opacity-80">Net pay</div>
                <div className="text-3xl font-extrabold">{selected.currency === "USD" ? "$" : "₹"}{selected.net.toLocaleString()}</div>
                <div className="text-xs opacity-80 mt-1">Gross {selected.currency === "USD" ? "$" : "₹"}{selected.gross.toLocaleString()} · Deductions {selected.currency === "USD" ? "$" : "₹"}{selected.total_deductions.toLocaleString()}</div>
              </div>

              <div className="card p-4">
                <h4 className="font-bold mb-2 text-sm">Earnings</h4>
                {Object.entries(selected.earnings).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs py-1 border-b border-black/5 last:border-0">
                    <span className="capitalize">{k.replace(/_/g, " ")}</span>
                    <span className="font-semibold">{selected.currency === "USD" ? "$" : "₹"}{(v as number).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="card p-4">
                <h4 className="font-bold mb-2 text-sm">Deductions</h4>
                {Object.entries(selected.deductions).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs py-1 border-b border-black/5 last:border-0">
                    <span className="capitalize">{k.replace(/_/g, " ")}</span>
                    <span className="font-semibold text-[color:var(--orange-700)]">-{selected.currency === "USD" ? "$" : "₹"}{(v as number).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="card p-4">
                <h4 className="font-bold mb-2 text-sm">Employer contributions</h4>
                {Object.entries(selected.employer_contributions).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs py-1 border-b border-black/5 last:border-0">
                    <span className="capitalize">{k.replace(/_/g, " ")}</span>
                    <span className="font-semibold">{selected.currency === "USD" ? "$" : "₹"}{(v as number).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <button data-testid="download-payslip-btn" onClick={() => toast.success("Payslip PDF generated (demo)")} className="btn btn-primary w-full justify-center">
                <Download size={16} /> Download payslip
              </button>
              <button onClick={() => toast.success("Tax document download started (demo)")} className="btn btn-ghost w-full justify-center">
                <FileCheck size={16} /> Tax documents
              </button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
