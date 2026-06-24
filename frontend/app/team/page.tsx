'use client';

import { useEffect, useState } from "react";
import { AppShell } from "../../components/shell/AppShell";
import { PageHeader, Empty } from "../../components/ui/Primitives";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { Users } from "lucide-react";

export default function TeamPage() {
  const { user } = useSession();
  const [team, setTeam] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    api.get<any[]>("/api/team").then(setTeam).catch(() => {});
  }, [user]);

  if (!user) return null;

  return (
    <AppShell>
      <PageHeader title="Team" subtitle="Your people" icon={Users} />
      {team.length === 0 ? <Empty title="No team members visible" /> : (
        <div className="space-y-2">
          {team.map(t => (
            <div key={t.id} className="card p-3 flex items-center gap-3" data-testid={`team-${t.id}`}>
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: t.avatar_color || "#0d9488" }}>
                {t.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{t.name}</div>
                <div className="text-xs text-muted truncate">{t.designation} · {t.department}</div>
                <div className="text-[10px] text-muted">{t.email}</div>
              </div>
              <span className="badge badge-teal capitalize text-[10px]">{t.role}</span>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
