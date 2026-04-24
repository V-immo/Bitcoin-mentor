"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Edit2, Clock, Volume2, VolumeX, Mic, MicOff, X } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

type NudgeData = {
  nudge: string | null;
  morningGreeting: string | null;
  eveningReview: string | null;
  weeklyReport: string | null;
  distressAlert: string | null;
  isDistressed: boolean;
  streak: number;
  active: boolean;
};

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function mdToHtml(text: string): string {
  return escape(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .split("\n").map(l => `<div>${l || "&nbsp;"}</div>`).join("");
}

// Strip HTML/markdown voor TTS (voorlezing)
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

const EXCLUDED_PATHS = ["/auth"];

export default function FloatingMarcus() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const [nudgeData, setNudgeData] = useState<NudgeData | null>(null);
  const [isDistressedNotif, setIsDistressedNotif] = useState(false);

  // Spraak state
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Trade debrief — triggered via custom DOM event vanuit TerminalPaperPanel
  const [pendingDebrief, setPendingDebrief] = useState<string | null>(null);

  // Chat sessies (geschiedenis)
  type ChatSession = { id: number; summary: string; messageCount: number; createdAt: string };
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const hidden = !session?.user || EXCLUDED_PATHS.some(p => pathname.startsWith(p));

  // Spraak instellingen ophalen
  useEffect(() => {
    if (hidden) return;
    const saved = localStorage.getItem("marcus-voice-enabled");
    if (saved === "true") setVoiceEnabled(true);
  }, [hidden]);

  // Laad history: localStorage DIRECT (synchroon), daarna server als die meer heeft
  useEffect(() => {
    if (hidden) return;
    // Stap 1: localStorage direct inladen — geen wachttijd, geen lege chat
    let localMessages: Message[] = [];
    try {
      const saved = localStorage.getItem("marcus-chat-history");
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (parsed.length > 0) {
          localMessages = parsed;
          setMessages(parsed);
        }
      }
    } catch { /* leeg */ }

    // Stap 2: server checken — overschrijf alleen als server meer berichten heeft (andere devices)
    fetch("/api/me/chat-history")
      .then(r => r.ok ? r.json() : null)
      .then((d: { messages?: Message[] } | null) => {
        const serverMsgs = d?.messages ?? [];
        if (serverMsgs.length > localMessages.length) {
          setMessages(serverMsgs);
          // Sync naar localStorage zodat volgende keer direct beschikbaar
          try {
            localStorage.setItem("marcus-chat-history", JSON.stringify(serverMsgs.slice(-30)));
          } catch { /* quota */ }
        }
      })
      .catch(() => { /* server offline, localStorage is al geladen */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  // Sla laatste 30 berichten op — server (cross-device) + localStorage (fallback)
  useEffect(() => {
    if (messages.length === 0) return;
    // localStorage altijd
    try {
      localStorage.setItem("marcus-chat-history", JSON.stringify(messages.slice(-30)));
    } catch { /* quota */ }
    // Server debounced (niet bij elke token tijdens streaming)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      fetch("/api/me/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages.slice(-30) }),
      }).catch(() => {});
    }, 2000);
  }, [messages]);

  useEffect(() => {
    if (hidden) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, hidden, open]);

  useEffect(() => {
    if (hidden) return;
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, hidden]);

  // Fetch nudge data — ook als overlay open is (voor auto-open logica)
  useEffect(() => {
    if (hidden) return;
    const today = new Date().toISOString().slice(0, 10);
    const weekKey = `week${Math.floor(Date.now() / (7 * 86400000))}`;
    fetch("/api/me/nudge")
      .then(r => r.ok ? r.json() : null)
      .then((data: NudgeData | null) => {
        if (!data) return;
        setNudgeData(data);
        const nudgeDismissed   = localStorage.getItem("marcus-nudge-dismissed") === today;
        const morningDismissed = localStorage.getItem("marcus-morning-dismissed") === today;
        const eveningDismissed = localStorage.getItem("marcus-evening-dismissed") === today;
        const weeklyDismissed  = localStorage.getItem("marcus-weekly-dismissed") === weekKey;
        const hasMsg =
          !!data.distressAlert ||
          (!!data.weeklyReport  && !weeklyDismissed)  ||
          (!!data.eveningReview && !eveningDismissed)  ||
          (!!data.morningGreeting && !morningDismissed) ||
          (!!data.nudge && !nudgeDismissed);
        if (!open) {
          setHasNotification(hasMsg);
          setIsDistressedNotif(!!data.isDistressed);
        }

        // Auto-open bij distress: altijd, direct
        if (data.isDistressed && !open) {
          setTimeout(() => setOpen(true), 1200);
          return;
        }

        // Auto-open bij morning greeting als nog niet gezien vandaag
        if (data.morningGreeting && !morningDismissed && !open) {
          setTimeout(() => setOpen(true), 4000);
          return;
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  // Proactief bericht tonen als overlay opent met lege chat
  useEffect(() => {
    if (!open || messages.length > 0 || !nudgeData) return;
    const today = new Date().toISOString().slice(0, 10);
    const weekKey = `week${Math.floor(Date.now() / (7 * 86400000))}`;

    let text: string | null = null;
    let type = "";

    if (nudgeData.distressAlert) {
      text = nudgeData.distressAlert; type = "distress";
    } else if (nudgeData.weeklyReport && localStorage.getItem("marcus-weekly-dismissed") !== weekKey) {
      text = nudgeData.weeklyReport; type = "weekly";
    } else if (nudgeData.eveningReview && localStorage.getItem("marcus-evening-dismissed") !== today) {
      text = nudgeData.eveningReview; type = "evening";
    } else if (nudgeData.morningGreeting && localStorage.getItem("marcus-morning-dismissed") !== today) {
      text = nudgeData.morningGreeting; type = "morning";
    } else if (nudgeData.nudge && localStorage.getItem("marcus-nudge-dismissed") !== today) {
      text = nudgeData.nudge; type = "nudge";
    }

    // Nieuw: welkomstbericht voor gloednieuwe gebruikers (nog nooit een bericht gehad)
    if (!text && !localStorage.getItem("marcus-first-message-shown")) {
      text = `Ik ben Marcus, jouw persoonlijke trading coach. Ik begeleid je stap voor stap — van je eerste trade tot een consistente strategie.

Begin hier: kies je tradingstijl in /profiel, vul je tradingplan in (max risico, max dagverlies), en doe je eerste quiz in /leren zodat ik je niveau ken.

Stel me gerust een vraag over Bitcoin, trading of hoe je moet starten.`;
      type = "welcome";
    }

    if (!text) return;

    setMessages([{ role: "assistant", content: text }]);
    if (type === "evening")  localStorage.setItem("marcus-evening-dismissed",  today);
    if (type === "morning")  localStorage.setItem("marcus-morning-dismissed",  today);
    if (type === "weekly")   localStorage.setItem("marcus-weekly-dismissed",   weekKey);
    if (type === "nudge")    localStorage.setItem("marcus-nudge-dismissed",    today);
    if (type === "welcome")  localStorage.setItem("marcus-first-message-shown", "true");
    // distress: nooit dismissen — toon elke keer opnieuw

    // Auto-voorlezen als voice aan staat
    const voiceOn = localStorage.getItem("marcus-voice-enabled") === "true";
    if (voiceOn) setTimeout(() => speakText(text!), 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) setHasNotification(false);
  }, [open]);

  // Stop spraak als overlay dicht
  useEffect(() => {
    if (!open && typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      recognitionRef.current?.stop();
      setListening(false);
    }
  }, [open]);

  // Leren-opdracht: check localStorage voor prompt vanuit MarcusCurriculum (user-initiated)
  useEffect(() => {
    if (hidden) return;
    const prompt = localStorage.getItem("btcmentor-marcus-prompt");
    if (prompt) {
      localStorage.removeItem("btcmentor-marcus-prompt");
      setPendingDebrief(prompt);
      setOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, pathname]);

  // Auto-verstuur zonder gebruikers-bubble (curriculum / quiz auto-prompts)
  useEffect(() => {
    if (!open || !pendingDebrief || loading) return;
    const msg = pendingDebrief;
    setPendingDebrief(null);
    sendSilent(msg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingDebrief, loading]);

  // TTS via ElevenLabs (premium) of browser fallback
  async function speakText(text: string) {
    if (!voiceEnabled || typeof window === "undefined") return;
    stopSpeaking();
    const clean = stripHtml(text).slice(0, 800);
    if (!clean) return;

    setSpeaking(true);
    try {
      // Probeer ElevenLabs server route
      // Taal detecteren uit HTML lang attribuut (nl/en)
      const lang = document.documentElement.lang?.startsWith("en") ? "en" : "nl";
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, lang }),
      });

      if (res.ok && res.status !== 204 && res.body) {
        // ElevenLabs audio beschikbaar — speel af via Audio API
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
        audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); };
        await audio.play();
        return;
      }
    } catch { /* val terug op browser TTS */ }

    // Browser TTS fallback
    if (!window.speechSynthesis) { setSpeaking(false); return; }
    const utt = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      (v.lang.startsWith("nl") || v.lang.startsWith("en")) &&
      (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("man") ||
       v.name.toLowerCase().includes("george") || v.name.toLowerCase().includes("daniel") ||
       v.name.toLowerCase().includes("reed") || v.name.toLowerCase().includes("liam"))
    ) || voices.find(v => v.lang.startsWith("nl")) || voices[0];
    if (preferred) utt.voice = preferred;
    utt.lang = preferred?.lang ?? "nl-NL";
    utt.rate = 0.92; utt.pitch = 0.85; utt.volume = 1;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    synthRef.current = utt;
    window.speechSynthesis.speak(utt);
  }

  function stopSpeaking() {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
    }
  }

  // STT: Microfoon luisteren
  function startListening() {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Je browser ondersteunt geen spraakherkenning. Gebruik Chrome of Edge.");
      return;
    }
    stopSpeaking();
    const recognition = new SpeechRecognition();
    recognition.lang = "nl-NL";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: { results: { transcript: string }[][] }) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) send(transcript.trim());
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function toggleVoice() {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem("marcus-voice-enabled", String(next));
    if (!next) stopSpeaking();
  }

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setStreaming(true);
    stopSpeaking();

    const placeholder: Message = { role: "assistant", content: "" };
    setMessages(m => [...m, placeholder]);

    abortRef.current = new AbortController();
    let full = "";
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

      // Pro-gate: 429 met JSON body
      if (res.status === 429) {
        const err = await res.json().catch(() => ({})) as { reply?: string; proGate?: boolean };
        full = err.reply ?? "Je hebt het daglimiet bereikt. Upgrade naar Marcus Pro voor onbeperkte coaching.";
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: full };
          return copy;
        });
        setLoading(false); setStreaming(false);
        return;
      }

      if (!res.ok || !res.body) throw new Error("fout");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

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
        full = "Marcus is even niet beschikbaar. Probeer opnieuw.";
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: full };
          return copy;
        });
      }
    } finally {
      setLoading(false);
      setStreaming(false);
      // Spreek het antwoord voor als voice aan staat
      if (full && voiceEnabled) speakText(full);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading, voiceEnabled]);

  // sendSilent — stuurt context naar Marcus zonder zichtbare gebruikers-bubble
  const sendSilent = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const contextMessages = [...messages, { role: "user" as const, content: text.trim() }];
    setLoading(true);
    setStreaming(true);
    stopSpeaking();

    const placeholder: Message = { role: "assistant", content: "" };
    setMessages(m => [...m, placeholder]);

    abortRef.current = new AbortController();
    let full = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: contextMessages,
          asset: "BTCUSDT",
          appContext: { activeTab: "floating" },
        }),
        signal: abortRef.current.signal,
      });

      if (res.status === 429) {
        const err = await res.json().catch(() => ({})) as { reply?: string };
        full = err.reply ?? "Je hebt het daglimiet bereikt. Upgrade naar Marcus Pro voor onbeperkte coaching.";
        setMessages(m => { const copy = [...m]; copy[copy.length - 1] = { role: "assistant", content: full }; return copy; });
        setLoading(false); setStreaming(false);
        return;
      }

      if (!res.ok || !res.body) throw new Error("fout");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setMessages(m => { const copy = [...m]; copy[copy.length - 1] = { role: "assistant", content: full }; return copy; });
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") {
        full = "Marcus is even niet beschikbaar. Probeer opnieuw.";
        setMessages(m => { const copy = [...m]; copy[copy.length - 1] = { role: "assistant", content: full }; return copy; });
      }
    } finally {
      setLoading(false);
      setStreaming(false);
      if (full && voiceEnabled) speakText(full);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading, voiceEnabled]);

  // Nieuwe chat starten — huidige chat archiveren
  async function newChat() {
    if (messages.length === 0) return;
    try {
      await fetch("/api/me/chat-history/archive", { method: "POST" });
    } catch { /* offline — toch wissen */ }
    setMessages([]);
    try { localStorage.setItem("marcus-chat-history", "[]"); } catch { /* */ }
    setShowSessions(false);
  }

  // Sessies laden voor het geschiedenispaneel
  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const r = await fetch("/api/me/chat-history/sessions");
      const d = await r.json() as { sessions: ChatSession[] };
      setSessions(d.sessions ?? []);
    } catch { /* */ } finally {
      setSessionsLoading(false);
    }
  }

  // Sessie herstellen — laadt oude berichten terug als actieve chat
  async function restoreSession(id: number) {
    try {
      const r = await fetch("/api/me/chat-history/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await r.json() as { messages: Message[] };
      if (d.messages?.length > 0) {
        setMessages(d.messages);
        try { localStorage.setItem("marcus-chat-history", JSON.stringify(d.messages.slice(-30))); } catch { /* */ }
        // Sync naar actieve chat op server
        fetch("/api/me/chat-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: d.messages }),
        }).catch(() => {});
      }
    } catch { /* */ }
    setShowSessions(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  if (hidden) return null;

  return (
    <>
      {open && (
        <div className="float-marcus-overlay">
          <div className="float-marcus-header">
            <div className="float-marcus-header-left">
              <div className={`float-marcus-avatar${speaking ? " speaking" : ""}`}>M</div>
              <div>
                <div className="float-marcus-name">Marcus</div>
                <div className="float-marcus-status" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {speaking
                    ? <><span className="marcus-sound-dots"><span /><span /><span /><span /></span> Spreekt</>
                    : streaming
                      ? <><span className="marcus-typing-dots" style={{ display: "inline-flex" }}><span /><span /><span /></span> Typt</>
                      : "Online"
                  }
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {/* Nieuwe chat */}
              {messages.length > 0 && (
                <button
                  onClick={newChat}
                  title="Nieuwe chat starten"
                  className="float-marcus-icon-btn"
                >
                  <Edit2 size={14} />
                </button>
              )}
              {/* Geschiedenis */}
              <button
                onClick={() => { setShowSessions(v => { if (!v) loadSessions(); return !v; }); }}
                title="Vorige gesprekken"
                className={`float-marcus-icon-btn${showSessions ? " active" : ""}`}
              >
                <Clock size={14} />
              </button>
              {/* Voice toggle */}
              <button
                onClick={toggleVoice}
                title={voiceEnabled ? "Stem uitzetten" : "Stem aanzetten"}
                className={`float-marcus-icon-btn${voiceEnabled ? " active" : ""}`}
              >
                {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
              {/* Stop speaking */}
              {speaking && (
                <button
                  onClick={stopSpeaking}
                  style={{
                    background: "rgba(233,30,99,0.12)", border: "1px solid rgba(233,30,99,0.3)",
                    borderRadius: 8, padding: "4px 8px", cursor: "pointer",
                    color: "var(--primary)", fontSize: 12,
                  }}
                >
                  ■ Stop
                </button>
              )}
              <button className="float-marcus-close" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
          </div>

          {/* Vorige gesprekken paneel */}
          {showSessions && (
            <div style={{
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(0,0,0,0.2)",
              maxHeight: 220, overflowY: "auto",
            }}>
              <div style={{ padding: "8px 14px 4px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.04em" }}>
                VORIGE GESPREKKEN
              </div>
              {sessionsLoading && (
                <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)" }}>Laden…</div>
              )}
              {!sessionsLoading && sessions.length === 0 && (
                <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)" }}>Geen opgeslagen gesprekken.</div>
              )}
              {sessions.map(s => {
                const date = new Date(s.createdAt + (s.createdAt.includes("T") ? "" : "T00:00:00"));
                const label = date.toLocaleDateString("nl-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
                return (
                  <button
                    key={s.id}
                    onClick={() => restoreSession(s.id)}
                    style={{
                      width: "100%", textAlign: "left", background: "transparent",
                      border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)",
                      padding: "8px 14px", cursor: "pointer", display: "flex",
                      flexDirection: "column", gap: 2,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                      {s.summary || "Gesprek zonder tekst"}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {label} · {s.messageCount} berichten
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="float-marcus-messages">
            {messages.length === 0 && (
              <div className="float-marcus-empty">
                Vraag Marcus alles over trading, de markt of de app.
                {voiceEnabled && <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>🎤 Spreek via de microfoonknop</div>}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`float-marcus-msg float-marcus-msg-${m.role}`}>
                {m.role === "assistant" ? (
                  m.content === "" && streaming && i === messages.length - 1
                    ? <span className="marcus-typing-dots"><span /><span /><span /></span>
                    : <span dangerouslySetInnerHTML={{ __html: mdToHtml(m.content) }} />
                ) : (
                  m.content
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="float-marcus-input-row">
            {/* Microfoon knop */}
            <button
              onClick={startListening}
              disabled={loading || listening}
              title="Spreek je vraag in"
              className={`float-marcus-mic-btn${listening ? " active" : ""}`}
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <textarea
              ref={inputRef}
              className="float-marcus-input"
              placeholder={listening ? "Luisteren…" : "Vraag Marcus iets…"}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading || listening}
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
        className={`float-marcus-btn${open ? " active" : speaking ? " speaking" : hasNotification ? " notify" : ""}`}
        onClick={() => setOpen(v => !v)}
        title={speaking ? "Marcus spreekt…" : hasNotification ? "Marcus heeft een bericht voor je" : "Vraag Marcus"}
        aria-label="Marcus openen"
      >
        M
        {/* Sound wave dots — zichtbaar als Marcus spreekt en chat gesloten is */}
        {speaking && !open && (
          <span className="marcus-btn-sound">
            <span /><span /><span /><span />
          </span>
        )}
        {hasNotification && !open && !speaking && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            width: 12, height: 12, borderRadius: "50%",
            background: isDistressedNotif ? "var(--primary)" : "#fff",
            boxShadow: isDistressedNotif
              ? "0 0 0 0 rgba(233,30,99,0.7)"
              : "0 0 6px 2px rgba(233,30,99,0.8)",
            border: "2px solid var(--primary)",
            display: "block",
            animation: isDistressedNotif ? "marcus-distress 1.2s ease-in-out infinite" : "none",
          }} />
        )}
      </button>

      <style>{`
        /* Avatar pulse tijdens spreken */
        .float-marcus-avatar.speaking {
          animation: marcus-speaking 1s ease-in-out infinite;
        }
        @keyframes marcus-speaking {
          0%, 100% { box-shadow: 0 0 0 0 rgba(233,30,99,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(233,30,99,0); }
        }

        /* Floating button — spreading rings tijdens spreken */
        .float-marcus-btn.speaking {
          animation: marcus-btn-speak 1.4s ease-in-out infinite;
          background: linear-gradient(135deg, #e91e63 0%, #c2185b 100%) !important;
        }
        @keyframes marcus-btn-speak {
          0%, 100% { box-shadow: 0 0 0 0 rgba(233,30,99,0.6), 0 4px 20px rgba(233,30,99,0.4); }
          50% { box-shadow: 0 0 0 10px rgba(233,30,99,0), 0 4px 20px rgba(233,30,99,0.4); }
        }

        /* Sound wave balletjes op de button */
        .marcus-btn-sound {
          position: absolute;
          bottom: -14px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 3px;
          align-items: flex-end;
          height: 12px;
        }
        .marcus-btn-sound span {
          width: 3px;
          border-radius: 2px;
          background: #e91e63;
          animation: marcus-wave 0.8s ease-in-out infinite;
        }
        .marcus-btn-sound span:nth-child(1) { animation-delay: 0s;    height: 5px; }
        .marcus-btn-sound span:nth-child(2) { animation-delay: 0.15s; height: 10px; }
        .marcus-btn-sound span:nth-child(3) { animation-delay: 0.3s;  height: 7px; }
        .marcus-btn-sound span:nth-child(4) { animation-delay: 0.45s; height: 4px; }
        @keyframes marcus-wave {
          0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
          50%       { transform: scaleY(1);   opacity: 1; }
        }

        /* Sound wave in header status */
        .marcus-sound-dots {
          display: inline-flex;
          align-items: flex-end;
          gap: 2px;
          height: 12px;
        }
        .marcus-sound-dots span {
          width: 3px;
          border-radius: 2px;
          background: #e91e63;
          animation: marcus-wave 0.7s ease-in-out infinite;
        }
        .marcus-sound-dots span:nth-child(1) { animation-delay: 0s;    height: 4px; }
        .marcus-sound-dots span:nth-child(2) { animation-delay: 0.12s; height: 8px; }
        .marcus-sound-dots span:nth-child(3) { animation-delay: 0.24s; height: 6px; }
        .marcus-sound-dots span:nth-child(4) { animation-delay: 0.36s; height: 3px; }

        /* Typing dots (3 springende bolletjes) */
        .marcus-typing-dots {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .marcus-typing-dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(233,30,99,0.8);
          animation: marcus-bounce 1.2s ease-in-out infinite;
        }
        .marcus-typing-dots span:nth-child(1) { animation-delay: 0s; }
        .marcus-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .marcus-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes marcus-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }

        @keyframes marcus-distress {
          0%   { box-shadow: 0 0 0 0 rgba(233,30,99,0.8); }
          70%  { box-shadow: 0 0 0 8px rgba(233,30,99,0); }
          100% { box-shadow: 0 0 0 0 rgba(233,30,99,0); }
        }
      `}</style>
    </>
  );
}
