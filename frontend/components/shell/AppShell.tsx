'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren, useState } from "react";
import { useSession } from "../../context/SessionContext";
import {
  Home, Calendar, Briefcase, Sparkles, Award, Users, GraduationCap, Megaphone,
  BarChart3, ChevronDown, LogOut, Bot, MessageCircle, FileText, DollarSign,
  Receipt, Target, UserPlus, Trophy, ClipboardList
} from "lucide-react";
import { useUiStore } from "../../stores/uiStore";
import { CopilotPanel } from "./CopilotPanel";

type NavItem = { href: string; label: string; icon: any };

const ROLE_NAV: Record<string, NavItem[]> = {
  employee: [
    { href: "/", label: "Home", icon: Home },
    { href: "/attendance", label: "Attendance", icon: Calendar },
    { href: "/performance", label: "Performance", icon: Target },
    { href: "/training", label: "Training", icon: GraduationCap },
    { href: "/contributions", label: "Contributions", icon: Sparkles },
  ],
  manager: [
    { href: "/", label: "Home", icon: Home },
    { href: "/team", label: "Team", icon: Users },
    { href: "/leave", label: "Leave", icon: Briefcase },
    { href: "/performance", label: "Performance", icon: Target },
    { href: "/training", label: "Training", icon: GraduationCap },
  ],
  hr: [
    { href: "/", label: "Home", icon: Home },
    { href: "/recruitment", label: "Hiring", icon: UserPlus },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/training", label: "Training", icon: GraduationCap },
    { href: "/announcements", label: "Posts", icon: Megaphone },
  ],
  admin: [
    { href: "/", label: "Home", icon: Home },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/team", label: "Team", icon: Users },
    { href: "/training", label: "Training", icon: GraduationCap },
    { href: "/announcements", label: "Posts", icon: Megaphone },
  ],
};

// All accessible modules (for role switcher menu + secondary nav)
const ALL_MODULES: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/attendance", label: "Attendance", icon: Calendar },
  { href: "/leave", label: "Leave", icon: Briefcase },
  { href: "/payroll", label: "Payroll", icon: DollarSign },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/performance", label: "Performance", icon: Target },
  { href: "/contributions", label: "Contributions", icon: Sparkles },
  { href: "/training", label: "Training", icon: GraduationCap },
  { href: "/recruitment", label: "Recruitment", icon: UserPlus },
  { href: "/recognition", label: "Recognition", icon: Trophy },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
  { href: "/team", label: "Team", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { user, logout, switchRole } = useSession();
  const { isCopilotOpen, toggleCopilot } = useUiStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!user) return null;
  const nav = ROLE_NAV[user.role] || ROLE_NAV.employee;

  return (
    <div className="bg-app min-h-screen">
      <div className="mobile-shell">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur border-b border-black/5">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              data-testid="open-modules-drawer-btn"
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2"
            >
              <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md" style={{ background: "linear-gradient(135deg, #0d9488 0%, #134e4a 100%)" }}>W</div>
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-wider text-muted">WorkFlow</div>
                <div className="text-xs font-semibold text-ink leading-tight">Global HRMS</div>
              </div>
            </button>

            <div className="flex items-center gap-1">
              <button
                data-testid="open-copilot-btn"
                onClick={toggleCopilot}
                className="h-9 w-9 rounded-full bg-[color:var(--orange-500)] text-white flex items-center justify-center shadow-md hover:scale-105 transition"
                aria-label="Open HR Copilot"
              >
                <Bot size={18} />
              </button>
              <div className="relative">
                <button
                  data-testid="user-menu-btn"
                  onClick={() => setMenuOpen(v => !v)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-surface-2"
                >
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                    style={{ background: user.avatar_color || "var(--teal-700)" }}
                  >
                    {user.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </div>
                  <ChevronDown size={14} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-64 card p-3 z-30">
                    <div className="text-xs text-muted">Signed in as</div>
                    <div className="font-semibold text-ink truncate">{user.name}</div>
                    <div className="text-xs text-muted truncate">{user.email}</div>
                    <div className="mt-1 mb-3">
                      <span className="badge badge-teal capitalize">{user.role}</span>
                    </div>
                    <div className="text-[11px] uppercase text-muted font-semibold mb-1">Switch role (demo)</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["employee", "manager", "hr", "admin"] as const).map(r => (
                        <button
                          key={r}
                          data-testid={`switch-role-${r}-btn`}
                          onClick={() => { setMenuOpen(false); switchRole(r); }}
                          className={`text-xs py-1.5 rounded-md capitalize ${user.role === r ? "bg-[color:var(--teal-700)] text-white" : "bg-surface-2"}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <div className="divider my-3" />
                    <button
                      data-testid="logout-btn"
                      onClick={() => { setMenuOpen(false); logout(); }}
                      className="w-full text-left text-sm text-red-600 flex items-center gap-2 hover:bg-red-50 px-2 py-1.5 rounded"
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="px-4 py-4">
          {children}
        </main>

        {/* Bottom nav */}
        <nav className="bottom-nav" data-testid="bottom-nav">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
            return (
              <Link key={href} href={href} data-testid={`nav-${label.toLowerCase()}-link`} className={active ? "active" : ""}>
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Modules drawer */}
        {drawerOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setDrawerOpen(false)} />
            <div className="fixed left-1/2 -translate-x-1/2 top-0 z-50 h-full w-full max-w-[480px] bg-surface animate-rise overflow-y-auto">
              <div className="p-4 flex items-center justify-between border-b border-black/5">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">All Modules</div>
                  <div className="font-bold text-ink">Quick navigation</div>
                </div>
                <button data-testid="close-drawer-btn" onClick={() => setDrawerOpen(false)} className="btn btn-ghost py-1.5 px-3 text-xs">Close</button>
              </div>
              <div className="grid grid-cols-3 gap-3 p-4">
                {ALL_MODULES.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    data-testid={`drawer-link-${label.toLowerCase()}`}
                    onClick={() => setDrawerOpen(false)}
                    className="card p-3 flex flex-col items-center justify-center gap-1.5 text-center hover:shadow-md transition aspect-square"
                  >
                    <div className="h-10 w-10 rounded-xl bg-[color:var(--teal-50)] text-[color:var(--teal-700)] flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <div className="text-xs font-medium leading-tight">{label}</div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Copilot panel */}
        {isCopilotOpen && <CopilotPanel onClose={toggleCopilot} />}
      </div>
    </div>
  );
}
