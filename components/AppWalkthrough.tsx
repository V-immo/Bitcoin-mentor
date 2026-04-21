"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Brain, Radio, LayoutDashboard, TrendingUp, GraduationCap, Calendar, ClipboardList, BarChart3, MessageSquare, Target, type LucideIcon } from "lucide-react";

const STORAGE_KEY = "walkthrough-v3";

const STEPS: { icon: LucideIcon; title: string; text: string; route: string | null; selector: string | null }[] = [
  {
    icon: Brain,
    title: "Welkom — ik ben Marcus",
    text: "Ik ben jouw persoonlijke tradingcoach. Geen valse beloftes, geen hype. Ik leer je nadenken vóór je handelt. Laten we beginnen.",
    route: null,
    selector: null,
  },
  {
    icon: Radio,
    title: "De Scanner",
    text: "Hier zie je welke assets klaar zijn voor een setup. Score 70+ betekent een technisch interessant moment. Klik een asset aan — ik analyseer hem voor je.",
    route: "/scanner",
    selector: "table, .scanner-grid, main > div",
  },
  {
    icon: LayoutDashboard,
    title: "Jouw Dashboard",
    text: "Elke ochtend stuur ik je een persoonlijk bericht en een marktbriefing. Check dit als eerste wanneer je de app opent — het zet je in de juiste mindset.",
    route: "/dashboard",
    selector: ".dash-briefing-card, .dash-layout",
  },
  {
    icon: TrendingUp,
    title: "Paper Trading",
    text: "Hier handel je met nepgeld. Stel altijd een stop-loss in. Ik controleer na elke trade of je je plan hebt gevolgd — eerlijk en direct.",
    route: "/trade",
    selector: "main, .container-page",
  },
  {
    icon: GraduationCap,
    title: "Leren",
    text: "Dagelijkse quizzes. Groeien van level 1 naar 5. Hoe meer je weet, hoe beter mijn coaching op jou afgestemd is. Doe het elke dag — ook als je weinig tijd hebt.",
    route: "/leren",
    selector: "main, .container-page",
  },
  {
    icon: Calendar,
    title: "De Agenda",
    text: "Log je trades, je emoties, je gedachten. Ik gebruik dit om patronen te herkennen — wanneer handel je het beste? Wanneer mak je impulsieve beslissingen?",
    route: "/agenda",
    selector: "main, .container-page",
  },
  {
    icon: ClipboardList,
    title: "Jouw Tradingplan",
    text: "Dit is de basis. Vul je regels in: max risico, entry-condities, exit-condities. Zonder plan ben je aan het gokken — met plan ben je aan het traden.",
    route: "/profiel",
    selector: "main, .container-page",
  },
  {
    icon: BarChart3,
    title: "Stats & Signalen",
    text: "Je winrate per weekdag, gedragspatronen, revenge-trading detectie. En live signalen die je kunt volgen of analyseren. Kennis van jezelf is het grootste voordeel.",
    route: "/stats",
    selector: "main, .container-page",
  },
  {
    icon: MessageSquare,
    title: "Ik ben altijd bereikbaar",
    text: "Die roze M-knop rechtsonder — dat ben ik. Vraag me alles over de markt, jouw trade, of je plan. Ik ben er 24/7.",
    route: null,
    selector: ".float-marcus-btn",
  },
  {
    icon: Target,
    title: "Klaar om te beginnen",
    text: "Begin bij je tradingplan in Profiel. Daarna je eerste paper trade. Verwacht geen snelle winsten — verwacht groei. Ik ben er bij elke stap.",
    route: null,
    selector: null,
  },
];

type Rect = { top: number; left: number; width: number; height: number };

export default function AppWalkthrough() {
  const router = useRouter();
  const [step, setStep] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null);
  const rafRef = useRef<number | null>(null);
  const navigatingRef = useRef(false);

  // Live positie-tracking van het target element
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!visible || step === null) { setHighlightRect(null); return; }
    const selector = STEPS[step]?.selector;
    if (!selector) { setHighlightRect(null); return; }

    let missed = 0;
    function update() {
      const el = document.querySelector(selector as string);
      if (!el) {
        missed++;
        if (missed < 20) rafRef.current = requestAnimationFrame(update); // wacht max ~330ms
        else setHighlightRect(null);
        return;
      }
      missed = 0;
      const r = el.getBoundingClientRect();
      setHighlightRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      rafRef.current = requestAnimationFrame(update);
    }
    rafRef.current = requestAnimationFrame(update);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [visible, step]);

  // Auto-start bij eerste bezoek
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setTimeout(() => { setStep(0); setVisible(true); }, 1200);

    function onKey(e: KeyboardEvent) {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (e.key === "?" || e.key === "h") { setStep(0); setVisible(true); }
      if (e.key === "Escape") setVisible(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function goTo(newStep: number) {
    if (newStep >= STEPS.length) { finish(); return; }
    if (navigatingRef.current) return;

    const target = STEPS[newStep];
    if (target.route) {
      navigatingRef.current = true;
      router.push(target.route);
      await new Promise(r => setTimeout(r, 600));
      navigatingRef.current = false;
    }
    setStep(newStep);
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, "done");
    setVisible(false);
  }

  function skip() {
    localStorage.setItem(STORAGE_KEY, "done");
    setVisible(false);
  }

  const current = step !== null ? STEPS[step] : null;
  const pct = step !== null ? Math.round(((step + 1) / STEPS.length) * 100) : 0;
  const PAD = 8;

  return (
    <>
      {/* ❓ help knop */}
      {!visible && (
        <button
          onClick={() => { setStep(0); setVisible(true); }}
          title="App tour starten (? toets)"
          style={{
            position: "fixed", bottom: 90, left: 20, zIndex: 9990,
            width: 34, height: 34, borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.4)",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >?</button>
      )}

      {visible && current && (
        <>
          {/* Neon roze glow highlight */}
          {highlightRect && (
            <div style={{
              position: "fixed",
              top: highlightRect.top - PAD,
              left: highlightRect.left - PAD,
              width: highlightRect.width + PAD * 2,
              height: highlightRect.height + PAD * 2,
              borderRadius: 14,
              border: "2px solid var(--primary)",
              boxShadow: "0 0 0 1px rgba(233,30,99,0.3), 0 0 16px 4px rgba(233,30,99,0.55), 0 0 40px 10px rgba(233,30,99,0.3)",
              pointerEvents: "none",
              zIndex: 9998,
              animation: "tourPulse 2s ease-in-out infinite",
            }} />
          )}

          {/* Navigatiebalk onderaan */}
          <div style={{
            position: "fixed",
            bottom: 0, left: 0, right: 0,
            zIndex: 9999,
            background: "var(--surface, #1a0d1e)",
            borderTop: "2px solid rgba(233,30,99,0.5)",
            boxShadow: "0 -4px 24px rgba(233,30,99,0.15)",
            padding: "14px 20px 18px",
          }}>
            <div style={{ height: 3, background: "rgba(233,30,99,0.15)", borderRadius: 99, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #e91e63, #ff4081)", borderRadius: 99, transition: "width 0.3s" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "linear-gradient(135deg, #e91e63, #ff4081)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0, boxShadow: "0 0 10px rgba(233,30,99,0.4)",
                }}>M</div>
                <current.icon size={22} style={{ flexShrink: 0, color: "var(--text-secondary)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text, #fce8f0)" }}>{current.title}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{step! + 1}/{STEPS.length}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 }}>
                  {current.text}
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                <button onClick={skip} style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "6px 8px", whiteSpace: "nowrap" }}>
                  Overslaan
                </button>
                {step! > 0 && (
                  <button onClick={() => goTo(step! - 1)} style={{ fontSize: 13, padding: "7px 14px", borderRadius: 8, background: "rgba(233,30,99,0.1)", color: "var(--primary)", border: "1px solid rgba(233,30,99,0.3)", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}>
                    ← Terug
                  </button>
                )}
                <button onClick={() => goTo(step! + 1)} style={{ fontSize: 13, padding: "7px 18px", borderRadius: 8, background: "var(--primary)", color: "var(--text)", border: "none", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {step === STEPS.length - 1 ? "Klaar" : "Volgende →"}
                </button>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes tourPulse {
              0%, 100% { box-shadow: 0 0 0 1px rgba(233,30,99,0.3), 0 0 16px 4px rgba(233,30,99,0.55), 0 0 40px 10px rgba(233,30,99,0.3); }
              50% { box-shadow: 0 0 0 2px rgba(233,30,99,0.6), 0 0 28px 8px rgba(233,30,99,0.8), 0 0 60px 16px rgba(233,30,99,0.45); }
            }
          `}</style>
        </>
      )}
    </>
  );
}
