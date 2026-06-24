'use client';
import { ReactNode } from "react";

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-3 mt-2">
      <div>
        <h2 className="font-extrabold text-lg text-ink leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, icon: Icon, accent = "teal" }: { title: string; subtitle?: string; icon?: any; accent?: "teal" | "orange" }) {
  const bg = accent === "teal"
    ? "linear-gradient(135deg, #0f766e 0%, #134e4a 100%)"
    : "linear-gradient(135deg, #f97316 0%, #c2410c 100%)";
  return (
    <div className="rounded-2xl text-white p-5 mb-4 grain shadow-soft animate-rise" style={{ background: bg }}>
      <div className="flex items-center gap-2.5">
        {Icon && <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center"><Icon size={18} /></div>}
        <div>
          <h1 className="font-extrabold text-xl tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs opacity-85 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export function Stat({ label, value, hint, accent = "teal" }: { label: string; value: ReactNode; hint?: string; accent?: "teal" | "orange" | "slate" }) {
  const cls = accent === "teal" ? "text-[color:var(--teal-700)]" : accent === "orange" ? "text-[color:var(--orange-600)]" : "text-ink";
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">{label}</div>
      <div className={`text-xl font-extrabold ${cls}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted">{hint}</div>}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card p-6 text-center text-muted">
      <div className="font-semibold text-ink">{title}</div>
      {hint && <div className="text-xs mt-1">{hint}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const cls =
    ["approved", "verified", "completed", "paid", "present", "hired"].includes(s) ? "badge-success"
    : ["pending", "pending-approval", "proposal-pending", "in-progress", "draft", "uploaded", "submitted"].includes(s) ? "badge-warn"
    : ["rejected", "absent", "missing", "cancelled"].includes(s) ? "badge-danger"
    : "badge-slate";
  return <span className={`badge ${cls} capitalize`}>{s.replace(/-/g, " ")}</span>;
}

export function Loader() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="h-6 w-6 rounded-full border-2 border-[color:var(--teal-500)] border-t-transparent animate-spin" />
    </div>
  );
}
