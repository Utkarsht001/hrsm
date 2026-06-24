const RAW = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
export const BACKEND_URL = RAW.replace(/\/$/, "");

// Auth is exclusively httpOnly cookie based.
// • Backend `/api/auth/login` (and `/register`) sets `access_token` with
//   `HttpOnly; Secure; SameSite=lax` — JavaScript cannot read it (XSS-safe).
// • The browser auto-sends the cookie on same-origin requests; we add
//   `credentials: 'include'` so it also rides on any cross-origin call.
// • No tokens are stored in localStorage / sessionStorage anymore.

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
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
