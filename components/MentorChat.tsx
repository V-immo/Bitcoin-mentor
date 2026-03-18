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
    { label: "Wat doen we vandaag?", prompt: "Marcus, wat gaan we vandaag doen? Stel een concrete oefening of taak voor die me dichter bij zelfstandig traden brengt. Kijk naar de markt en kies iets praktisch: een trade opzetten, een patroon analyseren, of een concept oefenen. Wees specifiek en stap voor stap." },
    { label: "Geef een briefing", prompt: "Geef een volledige briefing" },
    { label: "Moet ik nu kopen?", prompt: "Moet ik nu kopen?" },
    { label: "Zet trade op met mij", prompt: "Zet een trade op met mij — begeleid me stap voor stap: entry, stop-loss, target en hoeveel ik inzet." },
    { label: "Vergelijk alle assets", prompt: "Vergelijk alle assets die nu in het systeem zitten. Welke ziet er technisch het sterkst uit? Welke zou jij kiezen en waarom? Geef een top 3 met uitleg." },
    { label: "Hoe gaat mijn trade?", prompt: "Hoe gaat mijn open trade?" },
    { label: "3 scenario's", prompt: "Geef me 3 scenario's voor dit asset: bullish, bearish en sideways. Wat doe ik in elk scenario?" },
    { label: "Stop-loss strategie", prompt: "Wat is mijn stop-loss strategie voor dit asset? Leg uit waarom die stop-loss logisch is." },
    { label: "Leg RSI uit", prompt: "Leg de RSI uit aan de hand van de huidige waarde van dit asset." },
    { label: "Hoe werkt R/R?", prompt: "Hoe werkt risk/reward? Bereken het voor mijn huidige situatie." },
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
        sendInternal("Ik open het scherm. Geef me een directe analyse van dit asset: 1) Wat is de trend nu — omhoog, omlaag of zijwaarts? 2) Is dit een goed moment voor een paper trade in onze app of moet ik wachten? 3) Wat is het eerste concrete ding dat ik nu moet doen in de app? Verwijs naar de grafiek en de tabbladen hier. Wees direct en spreek als een coach.");
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
                        key={q.label}
                        type="button"
                        className={`terminal-chat-chip${q.label === "Wat doen we vandaag?" ? " terminal-chat-chip-primary" : ""}`}
                        onClick={() => send(q.prompt)}
                        disabled={userSending}
                    >
                        {q.label === "Wat doen we vandaag?" ? "⭐ " : ""}{q.label}
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
