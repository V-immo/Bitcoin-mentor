"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  X, Home, GraduationCap, Radar, TrendingUp,
  User, MessageCircle, HelpCircle, type LucideIcon,
} from "lucide-react";

const DONE_KEY    = "walkthrough-v5";
const PENDING_KEY = "walkthrough-pending";
const PAD         = 10;

type Step = { icon: LucideIcon; title: string; text: string; accent: string; selector?: string };

const STEPS: Step[] = [
  { icon: Home,          title: "Welkom bij Bitcoin Mentor",  accent: "#e91e63",
    text: "Ik ben Marcus — jouw persoonlijke trading coach. Deze tour laat je zien wat elk onderdeel doet. Volg de highlight." },
  { icon: Home,          title: "Dashboard",                   accent: "#3b82f6", selector: '[href="/dashboard"]',
    text: "Start hier elke dag. Mijn persoonlijke marktbriefing, dagelijkse missies en overzicht van je voortgang." },
  { icon: GraduationCap, title: "Leren",                       accent: "#8b5cf6", selector: '[href="/leren"]',
    text: "Dagelijkse quizzes die meegroeien met jouw niveau. Hoe meer je leert, hoe beter ik je coach." },
  { icon: Radar,         title: "Scanner",                     accent: "#f59e0b", selector: '[href="/scanner"]',
    text: "Welke assets zijn klaar voor een setup? Score 70+ = technisch interessant. Klik een asset aan voor mijn analyse." },
  { icon: TrendingUp,    title: "Handelen",                    accent: "#22c55e", selector: '[href="/trade"]',
    text: "Paper trading met nepgeld — leer zonder risico. Stel altijd een stop-loss in. Na elke trade geef ik feedback." },
  { icon: User,          title: "Profiel",                     accent: "#06b6d4", selector: '[href="/profiel"]',
    text: "Stel hier je tradingstijl en maximaal risico in. Hoe beter je profiel, hoe scherper mijn coaching." },
  { icon: MessageCircle, title: "Marcus — altijd bereikbaar",  accent: "#e91e63", selector: ".float-marcus-btn",
    text: "De M-knop rechtsonder — dat ben ik. Vraag me alles: marktanalyse, je trade, je plan. 24/7 beschikbaar." },
  { icon: HelpCircle,    title: "Tour opnieuw starten",        accent: "#e91e63",
    text: "Wil je deze tour later nog bekijken? Druk op de ? knop rechtsonder of druk de ? toets op je toetsenbord." },
];

type Spot = { top: number; left: number; width: number; height: number };
// Off-screen standaard — box-shadow bedekt dan heel het scherm
const NO_SPOT: Spot = { top: -300, left: -300, width: 2, height: 2 };

function measureEl(selector: string): Spot {
  // Probeer opgegeven selector, val terug op nav balk als element verborgen is (mobiel)
  const candidates = [selector, "nav.app-nav", ".app-nav"];
  for (const sel of candidates) {
    try {
      const els = document.querySelectorAll<HTMLElement>(sel);
      for (const el of Array.from(els)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
        }
      }
    } catch { /* */ }
  }
  return NO_SPOT;
}

export default function AppWalkthrough() {
  const { data: session } = useSession();
  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [spot, setSpot]       = useState<Spot>(NO_SPOT);
  const rafRef                = useRef<number | null>(null);

  const applyStep = useCallback((s: number) => {
    setStep(s);
    const sel = STEPS[s]?.selector;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setSpot(sel ? measureEl(sel) : NO_SPOT);
    });
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onResize = () => applyStep(step);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [visible, step, applyStep]);

  useEffect(() => {
    if (!session?.user) return;
    const pending = localStorage.getItem(PENDING_KEY);
    const done    = localStorage.getItem(DONE_KEY);
    if (pending === "1" && !done) {
      localStorage.removeItem(PENDING_KEY);
      setTimeout(() => openTour(0), 1200);
    }
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (e.key === "?" || e.key === "h") openTour(0);
      if (e.key === "Escape") closeTour();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function openTour(s = 0) {
    setStep(s);
    setSpot(NO_SPOT);
    setVisible(true);
    setTimeout(() => {
      setEntered(true);
      applyStep(s);
    }, 30);
  }

  function closeTour() {
    setEntered(false);
    setTimeout(() => { setVisible(false); setSpot(NO_SPOT); }, 260);
    localStorage.setItem(DONE_KEY, "done");
  }

  function next() { if (step >= STEPS.length - 1) { closeTour(); return; } applyStep(step + 1); }
  function prev() { if (step > 0) applyStep(step - 1); }

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  // Tooltip positie
  function cardStyle(): React.CSSProperties {
    const W   = typeof window !== "undefined" ? window.innerWidth  : 800;
    const H   = typeof window !== "undefined" ? window.innerHeight : 600;
    const TW  = Math.min(340, W - 32);
    const isSpot = spot !== NO_SPOT && spot.width > 0;

    if (!isSpot) return { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: TW };

    const cx   = spot.left + spot.width / 2;
    let left   = cx - TW / 2;
    left       = Math.max(16, Math.min(left, W - TW - 16));
    const below = H - (spot.top + spot.height) - 12;
    if (below >= 160) return { position: "fixed", left, top: spot.top + spot.height + 12, width: TW };
    return { position: "fixed", left, bottom: H - spot.top + 12, width: TW };
  }

  const isSpot = spot.width > 2; // groter dan de NO_SPOT fallback

  return (
    <>
      {session?.user && !visible && (
        <button className="walkthrough-help-btn" onClick={() => openTour(0)} title="App tour (? toets)">?</button>
      )}

      {visible && (
        <>
          {/* Klik-catcher voor sluiten (transparant, achterste laag) */}
          <div className={`walkthrough-overlay${entered ? " entered" : ""}`} onClick={closeTour} />

          {/* Spotlight div — box-shadow bedekt de rest van het scherm */}
          <div
            className="wt-spotlight"
            style={{
              top:    spot.top,
              left:   spot.left,
              width:  spot.width,
              height: spot.height,
              borderColor: isSpot ? current.accent : "transparent",
              boxShadow: `0 0 0 9999px rgba(0,0,0,0.82)${isSpot ? `, 0 0 0 3px ${current.accent}` : ""}`,
            }}
          />

          {/* Tooltip card */}
          <div
            className={`walkthrough-card${entered ? " entered" : ""}`}
            style={cardStyle()}
            onClick={e => e.stopPropagation()}
          >
            <button className="walkthrough-close" onClick={closeTour}><X size={15} /></button>
            <div className="walkthrough-step-counter">{step + 1} / {STEPS.length}</div>
            <div className="walkthrough-icon-wrap" style={{ background: `${current.accent}18`, border: `1px solid ${current.accent}30` }}>
              <current.icon size={22} style={{ color: current.accent }} />
            </div>
            <h2 className="walkthrough-title">{current.title}</h2>
            <p className="walkthrough-text">{current.text}</p>
            <div className="walkthrough-dots">
              {STEPS.map((_, i) => (
                <button key={i} className={`walkthrough-dot${i === step ? " active" : i < step ? " done" : ""}`}
                  onClick={() => applyStep(i)} aria-label={`Stap ${i + 1}`} />
              ))}
            </div>
            <div className="walkthrough-nav">
              {step > 0
                ? <button className="walkthrough-btn-back" onClick={prev}>← Terug</button>
                : <div />}
              <button className="walkthrough-btn-next" onClick={next} style={{ background: current.accent }}>
                {isLast ? "Klaar →" : "Volgende →"}
              </button>
            </div>
            {!isLast && <button className="walkthrough-skip" onClick={closeTour}>Overslaan</button>}
          </div>
        </>
      )}
    </>
  );
}
