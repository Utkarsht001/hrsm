'use client';

import { useEffect, useState } from "react";
import { AppShell } from "../../components/shell/AppShell";
import { PageHeader, SectionTitle, StatusBadge, Empty } from "../../components/ui/Primitives";
import { api } from "../../lib/api";
import { GraduationCap, Award, Play, FileText as FileIcon, ClipboardList } from "lucide-react";
import toast from "react-hot-toast";

const ICONS: Record<string, any> = { video: Play, document: FileIcon, quiz: ClipboardList, interactive: GraduationCap };

export default function TrainingPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  async function load() {
    const m = await api.get<any[]>("/api/training");
    setModules(m);
    if (selected) {
      const fresh = m.find(x => x.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }
  useEffect(() => { load(); }, []);

  async function completeItem(idx: number) {
    if (!selected) return;
    await api.post(`/api/training/${selected.id}/complete-item`, { content_index: idx });
    toast.success("Item completed");
    load();
  }

  return (
    <AppShell>
      <PageHeader title="Training & Learning" subtitle="Mandatory & optional learning" icon={GraduationCap} />
      <SectionTitle title="My modules" />
      {modules.length === 0 ? <Empty title="No modules assigned" /> : (
        <div className="space-y-2">
          {modules.map(m => (
            <button
              key={m.id}
              data-testid={`module-${m.id}`}
              onClick={() => setSelected(m)}
              className="card p-3 w-full text-left hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-bold">{m.title}</div>
                {m.mandatory && <span className="badge badge-danger text-[10px]">Mandatory</span>}
              </div>
              <div className="text-xs text-muted">{m.category} · {m.duration_min} min · Due {m.due_date}</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[color:var(--teal-700)]" style={{ width: `${m.progress || 0}%` }} />
                </div>
                <span className="text-xs font-bold w-10 text-right">{m.progress || 0}%</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <StatusBadge status={m.status} />
                {m.certificate && m.status === "completed" && (
                  <span className="badge badge-orange text-[10px] flex items-center gap-1"><Award size={10} /> Certified</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelected(null)} />
          <div className="fixed left-1/2 -translate-x-1/2 top-0 z-50 h-full w-full max-w-[480px] bg-surface overflow-y-auto animate-rise">
            <div className="sticky top-0 bg-surface p-4 border-b border-black/5 flex items-center justify-between">
              <div>
                <h3 className="font-bold">{selected.title}</h3>
                <div className="text-xs text-muted">{selected.category} · {selected.duration_min}m</div>
              </div>
              <button data-testid="close-module-btn" onClick={() => setSelected(null)} className="btn btn-ghost py-1 text-xs">Close</button>
            </div>
            <div className="p-4 space-y-2">
              <div className="card p-3 mb-2">
                <div className="text-xs text-muted">Progress</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-[color:var(--teal-700)]" style={{ width: `${selected.progress || 0}%` }} />
                  </div>
                  <span className="text-sm font-bold">{selected.progress || 0}%</span>
                </div>
              </div>
              {(selected.content || []).map((c: any, i: number) => {
                const Icon = ICONS[c.type] || FileIcon;
                return (
                  <div key={i} className="card p-3" data-testid={`content-${i}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className="text-[color:var(--teal-700)]" />
                        <div>
                          <div className="text-sm font-semibold">{c.title}</div>
                          <div className="text-xs text-muted capitalize">{c.type} · {c.duration_min}m</div>
                        </div>
                      </div>
                      {c.completed ? (
                        <span className="badge badge-success text-[10px]">Done</span>
                      ) : (
                        <button data-testid={`complete-content-${i}`} onClick={() => completeItem(i)} className="btn btn-primary py-1 text-xs">Mark complete</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
