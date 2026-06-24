const RAW = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
export const BACKEND_URL = RAW.replace(/\/$/, "");

// Token storage strategy:
// Primary auth: httpOnly cookie set by backend on /api/auth/login (XSS-safe,
// browser sends automatically on same-origin requests).
// Fallback: short-lived Bearer token in localStorage — only consulted when the
// cookie isn't present (e.g., legacy clients, cross-origin previews). The
// session module still calls /api/auth/me on bootstrap so a stale localStorage
// value is rejected server-side, not trusted.
const TOKEN_KEY = "wf_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers,
    credentials: "include", // send httpOnly auth cookie on same-origin
  });
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const detail = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data as T;
}

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}

export const api = {
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del: <T = any>(path: string) => request<T>(path, { method: "DELETE" }),
};
