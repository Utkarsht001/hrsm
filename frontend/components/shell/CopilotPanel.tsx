'use client';

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Send, X, Bot, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";

type Msg = { role: "user" | "assistant"; text: string; ts: number };

export function CopilotPanel({ onClose }: { onClose: () => void }) {
  const { user } = useSession();
  const pathname = usePathname();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: `Hi ${user?.name?.split(" ")[0] || "there"}! I'm your HR Copilot. Ask me anything — leave policy, payroll questions, your onboarding next steps, or how to clock in. I'm aware you're on the ${pathname || "home"} screen.`, ts: Date.now() }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId] = useState(() => `copilot-${user?.id}-${Date.now()}`);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(prompt?: string) {
    const text = (prompt ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text, ts: Date.now() }]);
    setBusy(true);
    try {
      const ctx = {
        currentView: pathname || "/",
        userRole: user?.role,
        isOnboarding: user?.is_onboarding,
      };
      const res = await api.post<{ reply: string }>("/api/copilot/chat", {
        message: text,
        session_id: sessionId,
        context: ctx,
      });
      setMessages(m => [...m, { role: "assistant", text: res.reply, ts: Date.now() }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: "assistant", text: `Sorry — I hit a snag (${e.message}). Try again in a moment.`, ts: Date.now() }]);
    } finally {
      setBusy(false);
    }
  }

  const suggestions = user?.is_onboarding
    ? ["What's my next onboarding task?", "How do I upload documents?", "Who is my buddy?"]
    : ["How much leave do I have left?", "When is my next payslip?", "How do I submit an expense?"];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div
        className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 w-full max-w-[480px] bg-surface rounded-t-2xl shadow-2xl animate-rise flex flex-col"
        style={{ height: "82vh" }}
        data-testid="copilot-panel"
      >
        <div className="flex items-center justify-between p-4 border-b border-black/5 text-white rounded-t-2xl" style={{ background: "linear-gradient(90deg, #0f766e 0%, #134e4a 100%)" }}>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-[color:var(--orange-500)] flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div>
              <div className="font-bold text-sm">HR Copilot</div>
              <div className="text-[10px] opacity-80 flex items-center gap-1"><Sparkles size={10} /> Claude Sonnet 4.5</div>
            </div>
          </div>
          <button data-testid="close-copilot-btn" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[color:var(--surface-2)]">
          {messages.map((m) => (
            <div key={m.ts} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === "user" ? "bg-[color:var(--teal-700)] text-white rounded-br-sm" : "bg-white text-ink rounded-bl-sm shadow-sm"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm shadow-sm">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 bg-[color:var(--teal-700)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 bg-[color:var(--teal-700)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 bg-[color:var(--teal-700)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-black/5 bg-surface">
          <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
            {suggestions.map((s) => (
              <button
                key={s}
                data-testid={`copilot-suggestion-${s.slice(0, 12).replace(/[^a-z0-9]/gi, "-")}`}
                onClick={() => send(s)}
                disabled={busy}
                className="text-xs whitespace-nowrap px-3 py-1.5 rounded-full bg-[color:var(--teal-50)] text-[color:var(--teal-900)] hover:bg-[color:var(--teal-100)]"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              data-testid="copilot-input"
              className="input"
              placeholder="Ask the HR Copilot…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              disabled={busy}
            />
            <button
              data-testid="copilot-send-btn"
              onClick={() => send()}
              disabled={busy || !input.trim()}
              className="btn btn-primary !px-3"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
