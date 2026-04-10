"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

type Message = { role: "user" | "assistant"; content: string };

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function mdToHtml(text: string): string {
  return escape(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .split("\n").map(l => `<div>${l || "&nbsp;"}</div>`).join("");
}

// Pagina's waar de zwevende knop NIET getoond wordt
const EXCLUDED_PATHS = ["/leren", "/auth"];

export default function FloatingMarcus() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Verberg op uitgesloten pagina's en als niet ingelogd
  const hidden = !session?.user || EXCLUDED_PATHS.some(p => pathname.startsWith(p));

  // Hooks altijd aanroepen (vóór conditional return — React rules of hooks)
  useEffect(() => {
    if (hidden) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, hidden]);

  useEffect(() => {
    if (hidden) return;
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, hidden]);

  // Check of Marcus een bericht klaar heeft (nudge / ochtendgroet)
  useEffect(() => {
    if (hidden || open) return;
    const today = new Date().toISOString().slice(0, 10);
    const nudgeDismissed = typeof window !== "undefined" && localStorage.getItem("marcus-nudge-dismissed") === today;
    const greetingDismissed = typeof window !== "undefined" && localStorage.getItem("marcus-greeting-dismissed") === today;
    const eveningDismissed = typeof window !== "undefined" && localStorage.getItem("marcus-evening-dismissed") === today;
    const hour = new Date().getHours();

    // Avond check (na 16u) of nudge/greeting nog niet gelezen
    if ((hour >= 16 && !eveningDismissed) || !nudgeDismissed || !greetingDismissed) {
      // Snelle check of er iets is
      fetch("/api/me/nudge")
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          const hasMsg = (data.nudge && !nudgeDismissed) || (data.morningGreeting && !greetingDismissed) || (hour >= 16 && !eveningDismissed);
          setHasNotification(!!hasMsg);
        })
        .catch(() => {});
    }
  }, [hidden, open]);

  // Notificatie wissen zodra chat opengaat
  useEffect(() => {
    if (open) setHasNotification(false);
  }, [open]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setStreaming(true);

    const placeholder: Message = { role: "assistant", content: "" };
    setMessages(m => [...m, placeholder]);

    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          asset: "BTCUSDT",
          appContext: { activeTab: "floating" },
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("fout");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: full };
          return copy;
        });
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") {
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: "Marcus is even niet beschikbaar. Probeer opnieuw." };
          return copy;
        });
      }
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }, [messages, loading]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  if (hidden) return null;

  return (
    <>
      {/* Chat overlay */}
      {open && (
        <div className="float-marcus-overlay">
          <div className="float-marcus-header">
            <div className="float-marcus-header-left">
              <div className="float-marcus-avatar">M</div>
              <div>
                <div className="float-marcus-name">Marcus</div>
                <div className="float-marcus-status">{streaming ? "Typt…" : "Online"}</div>
              </div>
            </div>
            <button className="float-marcus-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="float-marcus-messages">
            {messages.length === 0 && (
              <div className="float-marcus-empty">
                Vraag Marcus alles over trading, de markt of de app.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`float-marcus-msg float-marcus-msg-${m.role}`}>
                {m.role === "assistant" ? (
                  <span dangerouslySetInnerHTML={{ __html: mdToHtml(m.content) || "▋" }} />
                ) : (
                  m.content
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="float-marcus-input-row">
            <textarea
              ref={inputRef}
              className="float-marcus-input"
              placeholder="Vraag Marcus iets…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
            />
            <button
              className="float-marcus-send"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Zwevende knop */}
      <button
        className={`float-marcus-btn${open ? " active" : hasNotification ? " notify" : ""}`}
        onClick={() => setOpen(v => !v)}
        title={hasNotification ? "Marcus heeft een bericht voor je" : "Vraag Marcus"}
        aria-label="Marcus openen"
      >
        M
        {hasNotification && !open && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            width: 12, height: 12, borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 0 6px 2px rgba(233,30,99,0.8)",
            border: "2px solid #e91e63",
            display: "block",
          }} />
        )}
      </button>
    </>
  );
}
