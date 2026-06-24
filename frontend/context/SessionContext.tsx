'use client';

import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { api, setToken, clearToken, getToken } from "../lib/api";
import { setCredentials, clearCredentials } from "../store/authSlice";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "employee" | "manager" | "hr" | "admin";
  designation?: string;
  department?: string;
  country?: string;
  is_onboarding?: boolean;
  manager_id?: string | null;
  joining_date?: string;
  avatar_color?: string;
};

export type SessionContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (args: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: AuthUser["role"]) => Promise<void>;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const ROLE_ACCOUNTS: Record<string, { email: string; password: string }> = {
  employee: { email: "sarah@workflow.com", password: "sarah123" },
  manager:  { email: "michael@workflow.com", password: "michael123" },
  hr:       { email: "priya@workflow.com", password: "priya123" },
  admin:    { email: "admin@workflow.com", password: "admin123" },
};

export function SessionProvider({ children }: PropsWithChildren) {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const tok = getToken();
    if (!tok) { setUser(null); return; }
    try {
      const me = await api.get<AuthUser>("/api/auth/me");
      setUser(me);
      dispatch(setCredentials({ user: me }));
    } catch {
      clearToken();
      setUser(null);
      dispatch(clearCredentials());
    }
  }, [dispatch]);

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, [fetchMe]);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const res = await api.post<{ accessToken: string; user: AuthUser }>("/api/auth/login", { email, password });
    setToken(res.accessToken);
    setUser(res.user);
    dispatch(setCredentials({ user: res.user }));
  }, [dispatch]);

  const logout = useCallback(async () => {
    clearToken();
    setUser(null);
    dispatch(clearCredentials());
    router.replace("/login");
  }, [dispatch, router]);

  const switchRole = useCallback(async (role: AuthUser["role"]) => {
    const creds = ROLE_ACCOUNTS[role];
    if (!creds) return;
    await login(creds);
  }, [login]);

  // Route guard - redirect to login if no user and not on /login
  useEffect(() => {
    if (loading) return;
    const isPublic = pathname?.startsWith("/login");
    if (!user && !isPublic) {
      router.replace("/login");
    } else if (user && isPublic) {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);

  return (
    <SessionContext.Provider value={{ user, loading, login, logout, switchRole, refresh: fetchMe }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
