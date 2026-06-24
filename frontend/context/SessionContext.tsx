'use client';

import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { api } from "../lib/api";
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

type DemoCred = { email: string; password: string; name: string; role: string };

export type SessionContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (args: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: AuthUser["role"]) => Promise<void>;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const IS_DEV = process.env.NODE_ENV !== "production";

export function SessionProvider({ children }: PropsWithChildren) {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Demo creds fetched once from backend — no hardcoded passwords in the bundle.
  const demoCredsRef = useRef<DemoCred[]>([]);

  const fetchMe = useCallback(async () => {
    try {
      // Auth cookie is sent automatically by the browser; 401 means no session.
      const me = await api.get<AuthUser>("/api/auth/me");
      setUser(me);
      dispatch(setCredentials({ user: me }));
    } catch {
      // No active session — fall through to unauthenticated state.
      setUser(null);
      dispatch(clearCredentials());
    }
  }, [dispatch]);

  // One-time bootstrap: hydrate session + load demo creds for the role switcher.
  useEffect(() => {
    const aborted = { value: false };
    (async () => {
      const [, demos] = await Promise.allSettled([
        fetchMe(),
        api.get<DemoCred[]>("/api/auth/demo-users"),
      ]);
      if (aborted.value) return;
      if (demos.status === "fulfilled") demoCredsRef.current = demos.value;
      setLoading(false);
    })();
    return () => { aborted.value = true; };
  }, [fetchMe]);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const res = await api.post<{ user: AuthUser }>("/api/auth/login", { email, password });
    // No client-side token handling — the httpOnly cookie is set by the server.
    setUser(res.user);
    dispatch(setCredentials({ user: res.user }));
  }, [dispatch]);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (err) {
      // Server-side cookie cleanup is best-effort. Surface it in dev only;
      // local sign-out always proceeds so the user isn't trapped.
      if (IS_DEV) {
        // eslint-disable-next-line no-console
        console.warn("[auth] logout endpoint failed, continuing client-side cleanup:", err);
      }
    }
    setUser(null);
    dispatch(clearCredentials());
    router.replace("/login");
  }, [dispatch, router]);

  const switchRole = useCallback(async (role: AuthUser["role"]) => {
    // Pick the FIRST demo account matching this role; deliberately ignores the
    // onboarding alt account so /switch-role/employee lands on Sarah, not Alex.
    const creds = demoCredsRef.current.find(c => c.role === role && !c.email.startsWith("alex"));
    if (!creds) return;
    await login({ email: creds.email, password: creds.password });
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

  // Memoize the context value so consumers don't re-render every time
  // SessionProvider itself re-renders.
  const value = useMemo<SessionContextValue>(() => ({
    user, loading, login, logout, switchRole, refresh: fetchMe,
  }), [user, loading, login, logout, switchRole, fetchMe]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
