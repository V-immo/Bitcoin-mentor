"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";

function escape(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineToHtml(text: string): string {
    return escape(text)
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function markdownToHtml(text: string): string {
    const lines = text.split("\n");
    const out: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (/^\d+\.\s/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
                items.push(lines[i].replace(/^\d+\.\s/, ""));
                i++;
            }
            out.push(`<ol style="padding-left:18px;margin:6px 0">${items.map(item => `<li>${inlineToHtml(item)}</li>`).join("")}</ol>`);
            continue;
        }

        if (/^[-*]\s/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^[-*]\s/.test(lines[i])) {
                items.push(lines[i].replace(/^[-*]\s/, ""));
                i++;
            }
            out.push(`<ul style="padding-left:18px;margin:6px 0">${items.map(item => `<li>${inlineToHtml(item)}</li>`).join("")}</ul>`);
            continue;
        }

        if (line.trim() === "") {
            out.push(`<div style="height:6px"></div>`);
        } else {
            out.push(`<div>${inlineToHtml(line)}</div>`);
        }
        i++;
    }

    return out.join("");
}

type Message = {
    role: "user" | "assistant";
    content: string;
};

type Props = {
    marketContext: string;
    asset: string;
};

const QUICK_QUESTIONS = [
    "Geef een volledige briefing",
    "Moet ik nu kopen?",
    "Zet een trade met mij op",
    "Hoe gaat mijn open trade?",
    "Is dit een goed asset om te leren traden?",
    "Welk asset zou jij kiezen vandaag?",
    "Geef me 3 scenario's",
    "Wat is mijn stop-loss strategie?",
    "Leg de RSI uit",
    "Hoe werkt R/R?",
];

export default function MentorChat({ marketContext, asset }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [userSending, setUserSending] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [quizProfile, setQuizProfile] = useState({ level: 1, weakTopics: [] as string[] });
    const bottomRef = useRef<HTMLDivElement>(null);
    const didAutoBriefRef = useRef(false);

    const saveMessages = useCallback(async (msgs: Message[]) => {
        try {
            // Bewaar max 40 berichten
            const toSave = msgs.slice(-40);
            await fetch(`/api/me/chat?asset=${encodeURIComponent(asset)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: toSave }),
            });
        } catch { /* ignore */ }
    }, [asset]);

    // Laad geschiedenis en quiz profiel bij mount en bij asset-wijziging
    useEffect(() => {
        let cancelled = false;
        setLoaded(false);
        setMessages([]);
        didAutoBriefRef.current = false;

        async function loadAll() {
            // Quiz profiel ophalen
            try {
                const res = await fetch("/api/me/quiz");
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled && data) {
                        setQuizProfile({
                            level: data.level ?? 1,
                            weakTopics: data.weakTopics ?? [],
                        });
                    }
                }
            } catch { /* ignore */ }

            // Chat geschiedenis ophalen
            try {
                const res = await fetch(`/api/me/chat?asset=${encodeURIComponent(asset)}`);
                if (res.ok) {
                    const data = await res.json();
                    const saved: Message[] = data?.messages ?? [];
                    if (!cancelled && saved.length > 0) {
                        setMessages(saved);
                        didAutoBriefRef.current = true; // sla auto-briefing over als er al geschiedenis is
                    }
                }
            } catch { /* ignore */ }

            if (!cancelled) setLoaded(true);
        }

        loadAll();
        return () => { cancelled = true; };
    }, [asset]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-briefing zodra marktdata beschikbaar is — alleen als er nog geen geschiedenis is
    useEffect(() => {
        if (didAutoBriefRef.current || !marketContext || loading || !loaded) return;
        didAutoBriefRef.current = true;
        sendInternal("Hoi Marcus! Ik open het scherm. Doe een korte analyse: 1) Wat is de trend nu — omhoog, omlaag of zijwaarts? 2) Is dit een goed moment voor een paper trade of moet ik wachten? 3) Wat is het eerste concrete ding dat ik nu moet doen? Wees direct — als de setup goed is, zeg het. Als niet, leg uit waarom. Spreek als een coach, niet als een leesboek.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [marketContext, loaded]);

    async function clearChat() {
        setMessages([]);
        didAutoBriefRef.current = false;
        await saveMessages([]);
    }

    // Intern: stuur zonder user-bericht in de chat te tonen (voor auto-briefing)
    async function sendInternal(text: string) {
        if (!text.trim()) return;
        setLoading(true);
        const next: Message[] = [{ role: "user", content: text.trim() }];
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: next, marketContext, traderLevel: quizProfile.level, weakTopics: quizProfile.weakTopics }),
            });
            const json = await res.json();
            const finalMessages: Message[] = [{ role: "assistant", content: json.reply || "Geen antwoord." }];
            setMessages(finalMessages);
            await saveMessages(finalMessages);
        } catch {
            setMessages([{ role: "assistant", content: "Verbindingsfout bij opstarten." }]);
        } finally {
            setLoading(false);
        }
    }

    async function send(text: string) {
        if (!text.trim() || userSending) return;

        const userMsg: Message = { role: "user", content: text.trim() };
        const next = [...messages, userMsg];
        setMessages(next);
        setInput("");
        setLoading(true);
        setUserSending(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: next, marketContext, traderLevel: quizProfile.level, weakTopics: quizProfile.weakTopics }),
            });
            const json = await res.json();
            const finalMessages: Message[] = [
                ...next,
                { role: "assistant", content: json.reply || "Geen antwoord." },
            ];
            setMessages(finalMessages);
            await saveMessages(finalMessages);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Verbindingsfout. Probeer opnieuw." },
            ]);
        } finally {
            setLoading(false);
            setUserSending(false);
        }
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        send(input);
    }

    return (
        <section className="terminal-side-card terminal-chat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="terminal-label">Vraag de mentor</div>
                {messages.length > 0 && (
                    <button
                        className="terminal-btn terminal-btn-muted"
                        onClick={clearChat}
                        style={{ fontSize: 11, padding: "2px 8px", height: 24 }}
                        title="Wis gesprek en start opnieuw"
                    >
                        Wis chat
                    </button>
                )}
            </div>

            <div className="terminal-chat-messages">
                {messages.length === 0 && (
                    <div className="terminal-chat-empty">
                        Stel een vraag over de markt, je trade of strategie.
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`terminal-chat-msg ${msg.role === "user"
                                ? "terminal-chat-user"
                                : "terminal-chat-assistant"
                            }`}
                    >
                        {msg.role === "assistant"
                            ? <div dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />
                            : msg.content}
                    </div>
                ))}

                {loading && (
                    <div className="terminal-chat-msg terminal-chat-assistant">
                        <span className="terminal-chat-typing">Denkt na...</span>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div className="terminal-chat-quick">
                {QUICK_QUESTIONS.map((q) => (
                    <button
                        key={q}
                        type="button"
                        className="terminal-chat-chip"
                        onClick={() => send(q)}
                        disabled={userSending}
                    >
                        {q}
                    </button>
                ))}
            </div>

            <form className="terminal-chat-form" onSubmit={handleSubmit}>
                <input
                    className="terminal-terminal-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Stel een vraag..."
                    disabled={loading}
                />
                <button
                    type="submit"
                    className="terminal-btn terminal-btn-primary"
                    disabled={loading || !input.trim()}
                >
                    →
                </button>
            </form>
        </section>
    );
}
