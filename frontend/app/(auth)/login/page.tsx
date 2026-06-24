'use client';

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../context/SessionContext";
import { api } from "../../../lib/api";
import toast from "react-hot-toast";
import { Bot, Sparkles } from "lucide-react";

type DemoUser = { email: string; password: string; name: string; role: string };

export default function LoginPage() {
  const router = useRouter();
  const { login } = useSession();
  const [email, setEmail] = useState("admin@workflow.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);

  useEffect(() => {
    api.get<DemoUser[]>("/api/auth/demo-users").then(setDemoUsers).catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      toast.success("Welcome back!");
      router.replace("/");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(u: DemoUser) {
    setEmail(u.email);
    setPassword(u.password);
  }

  return (
    <div className="bg-app min-h-screen flex items-center justify-center p-4">
      <div className="mobile-shell flex flex-col py-10 px-6 !pb-10" style={{ minHeight: "100vh" }}>
        {/* Brand */}
        <div className="mt-6 mb-8 animate-rise">
          <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg" style={{ background: "linear-gradient(135deg, #0d9488 0%, #134e4a 100%)" }}>W</div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted">Global HRMS</div>
              <h1 className="text-2xl font-extrabold text-ink tracking-tight">WorkFlow</h1>
            </div>
          </div>
          <p className="text-sm text-muted leading-relaxed mt-4">
            The single platform for your entire employee journey — onboarding, attendance, payroll, growth, and recognition.
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-[color:var(--teal-700)] font-medium">
            <Sparkles size={12} /> Powered by Claude HR Copilot
          </div>
        </div>

        <form onSubmit={onSubmit} className="card p-5 space-y-4 animate-rise" data-testid="login-form">
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Email</label>
            <input
              data-testid="login-email-input"
              type="email"
              className="input mt-1"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Password</label>
            <input
              data-testid="login-password-input"
              type="password"
              className="input mt-1"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button
            data-testid="login-submit-btn"
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full justify-center"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {demoUsers.length > 0 && (
          <div className="mt-5 card p-4 animate-rise" data-testid="demo-accounts">
            <div className="flex items-center gap-2 mb-3">
              <Bot size={14} className="text-[color:var(--orange-500)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-ink">Demo accounts — one click sign in</span>
            </div>
            <div className="space-y-2">
              {demoUsers.map((u, i) => (
                <button
                  key={u.email}
                  data-testid={`demo-login-${u.role}-btn`}
                  onClick={() => fillDemo(u)}
                  className="w-full text-left p-2.5 rounded-lg bg-surface-2 hover:bg-[color:var(--teal-50)] transition border border-transparent hover:border-[color:var(--teal-500)]/30 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold text-ink">{u.name}</div>
                    <div className="text-[11px] text-muted">{u.email}</div>
                  </div>
                  <span className="badge badge-teal capitalize">{u.role}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
