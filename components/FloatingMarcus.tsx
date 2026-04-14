"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

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

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
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

  useEffect(() => {
    if (hidden) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, hidden]);

  useEffect(() => {
    if (hidden) return;
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, hidden]);

  // Fetch nudge data voor notificatie-badge (als overlay gesloten is)
  useEffect(() => {
    if (hidden || open) return;
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
        setHasNotification(hasMsg);
        setIsDistressedNotif(!!data.isDistressed);
      })
      .catch(() => {});
  }, [hidden, open]);

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

    if (!text) return;

    setMessages([{ role: "assistant", content: text }]);
    if (type === "evening")  localStorage.setItem("marcus-evening-dismissed",  today);
    if (type === "morning")  localStorage.setItem("marcus-morning-dismissed",  today);
    if (type === "weekly")   localStorage.setItem("marcus-weekly-dismissed",   weekKey);
    if (type === "nudge")    localStorage.setItem("marcus-nudge-dismissed",    today);
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

  // TTS via ElevenLabs (premium) of browser fallback
  async function speakText(text: string) {
    if (!voiceEnabled || typeof window === "undefined") return;
    stopSpeaking();
    const clean = stripHtml(text).slice(0, 800);
    if (!clean) return;

    setSpeaking(true);
    try {
      // Probeer ElevenLabs server route
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
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
                <div className="float-marcus-status">
                  {speaking ? "Spreekt…" : streaming ? "Typt…" : "Online"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {/* Voice toggle */}
              <button
                onClick={toggleVoice}
                title={voiceEnabled ? "Stem uitzetten" : "Stem aanzetten"}
                style={{
                  background: voiceEnabled ? "rgba(233,30,99,0.15)" : "transparent",
                  border: `1px solid ${voiceEnabled ? "#e91e63" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 8, padding: "4px 8px", cursor: "pointer",
                  color: voiceEnabled ? "#e91e63" : "var(--text-muted)",
                  fontSize: 14, lineHeight: 1,
                }}
              >
                {voiceEnabled ? "🔊" : "🔇"}
              </button>
              {/* Stop speaking */}
              {speaking && (
                <button
                  onClick={stopSpeaking}
                  style={{
                    background: "rgba(233,30,99,0.12)", border: "1px solid rgba(233,30,99,0.3)",
                    borderRadius: 8, padding: "4px 8px", cursor: "pointer",
                    color: "#e91e63", fontSize: 12,
                  }}
                >
                  ■ Stop
                </button>
              )}
              <button className="float-marcus-close" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

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
                  <span dangerouslySetInnerHTML={{ __html: mdToHtml(m.content) || "▋" }} />
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
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: listening ? "rgba(233,30,99,0.2)" : "var(--surface)",
                border: `1px solid ${listening ? "#e91e63" : "var(--border)"}`,
                cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                animation: listening ? "marcus-notify 1.2s ease-in-out infinite" : "none",
              }}
            >
              {listening ? "🎤" : "🎙"}
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
            background: isDistressedNotif ? "#e91e63" : "#fff",
            boxShadow: isDistressedNotif
              ? "0 0 0 0 rgba(233,30,99,0.7)"
              : "0 0 6px 2px rgba(233,30,99,0.8)",
            border: "2px solid #e91e63",
            display: "block",
            animation: isDistressedNotif ? "marcus-distress 1.2s ease-in-out infinite" : "none",
          }} />
        )}
      </button>

      <style>{`
        .float-marcus-avatar.speaking {
          animation: marcus-speaking 1s ease-in-out infinite;
        }
        @keyframes marcus-speaking {
          0%, 100% { box-shadow: 0 0 0 0 rgba(233,30,99,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(233,30,99,0); }
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
