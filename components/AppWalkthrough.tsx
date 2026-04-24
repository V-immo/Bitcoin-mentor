"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { X, Home, GraduationCap, Radar, TrendingUp, User, MessageCircle, HelpCircle, type LucideIcon } from "lucide-react";

const DONE_KEY    = "walkthrough-v5";
const PENDING_KEY = "walkthrough-pending";
const PAD         = 10;

type Step = {
  icon: LucideIcon;
  title: string;
  text: string;
  accent: string;
  selector?: string;
};

const STEPS: Step[] = [
  {
    icon: Home,
    title: "Welkom bij Bitcoin Mentor",
    text: "Ik ben Marcus — jouw persoonlijke trading coach. Deze tour laat je zien wat elk onderdeel doet. Volg de highlight.",
    accent: "#e91e63",
  },
  {
    icon: Home,
    title: "Dashboard",
    text: "Start hier elke dag. Je krijgt mijn persoonlijke marktbriefing, dagelijkse missies en een overzicht van je voortgang.",
    accent: "#3b82f6",
    selector: 'a.app-nav-link[href="/dashboard"]',
  },
  {
    icon: GraduationCap,
    title: "Leren",
    text: "Dagelijkse quizzes die meegroeien met jouw niveau. Hoe meer je leert, hoe beter ik je coach.",
    accent: "#8b5cf6",
    selector: 'a.app-nav-link[href="/leren"]',
  },
  {
    icon: Radar,
    title: "Scanner",
    text: "Hier zie je welke assets klaar zijn voor een setup. Score 70+ = technisch interessant. Klik een asset aan voor mijn analyse.",
    accent: "#f59e0b",
    selector: 'a.app-nav-link[href="/scanner"]',
  },
  {
    icon: TrendingUp,
    title: "Handelen",
    text: "Paper trading met nepgeld — leer zonder risico. Stel altijd een stop-loss in. Na elke trade geef ik feedback.",
    accent: "#22c55e",
    selector: 'a.app-nav-link[href="/trade"]',
  },
  {
    icon: User,
    title: "Profiel",
    text: "Stel hier je tradingstijl en maximaal risico in. Hoe beter je profiel, hoe scherper mijn coaching.",
    accent: "#06b6d4",
    selector: 'a.app-nav-link[href="/profiel"]',
  },
  {
    icon: MessageCircle,
    title: "Marcus — altijd bereikbaar",
    text: "De M-knop rechtsonder — dat ben ik. Vraag me alles: marktanalyse, je trade, je plan. 24/7 beschikbaar.",
    accent: "#e91e63",
    selector: ".float-marcus-btn",
  },
  {
    icon: HelpCircle,
    title: "Tour opnieuw starten",
    text: "Wil je deze tour later nog bekijken? Druk op de ? knop rechtsonder, of druk de ? toets op je toetsenbord.",
    accent: "#e91e63",
  },
];

type Spot = { top: number; left: number; width: number; height: number };

function measureEl(selector: string): Spot | null {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return {
    top:    r.top    - PAD,
    left:   r.left   - PAD,
    width:  r.width  + PAD * 2,
    height: r.height + PAD * 2,
  };
}

export default function AppWalkthrough() {
  const { data: session } = useSession();
  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [spot, setSpot]       = useState<Spot | null>(null);
  const rafRef                = useRef<number | null>(null);

  const applyStep = useCallback((s: number) => {
    setStep(s);
    const sel = STEPS[s]?.selector;
    if (sel) {
      // RAF zodat DOM gesettled is
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setSpot(measureEl(sel));
      });
    } else {
      setSpot(null);
    }
  }, []);

  // Herbereken bij resize
  useEffect(() => {
    if (!visible) return;
    const onResize = () => applyStep(step);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [visible, step, applyStep]);

  // Auto-start na onboarding + keyboard shortcut
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
    applyStep(s);
    setVisible(true);
    setTimeout(() => setEntered(true), 30);
  }

  function closeTour() {
    setEntered(false);
    setTimeout(() => { setVisible(false); setSpot(null); }, 240);
    localStorage.setItem(DONE_KEY, "done");
  }

  function next() { if (step >= STEPS.length - 1) { closeTour(); return; } applyStep(step + 1); }
  function prev() { if (step > 0) applyStep(step - 1); }

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  // Bereken tooltip positie
  function cardStyle(): React.CSSProperties {
    if (!spot) {
      return { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(340px, calc(100vw - 32px))" };
    }
    const TW  = Math.min(340, window.innerWidth - 32);
    const cx  = spot.left + spot.width / 2;
    let left  = cx - TW / 2;
    left      = Math.max(16, Math.min(left, window.innerWidth - TW - 16));
    const below = window.innerHeight - (spot.top + spot.height) - 12;
    if (below >= 160) {
      return { position: "fixed", left, top: spot.top + spot.height + 12, width: TW };
    }
    return { position: "fixed", left, bottom: window.innerHeight - spot.top + 12, width: TW };
  }

  const vw = typeof window !== "undefined" ? window.innerWidth  : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;

  return (
    <>
      {session?.user && !visible && (
        <button className="walkthrough-help-btn" onClick={() => openTour(0)} title="App tour (? toets)">?</button>
      )}

      {visible && (
        <div className={`walkthrough-overlay${entered ? " entered" : ""}`} onClick={closeTour}>

          {/* 4-delige overlay rondom het element */}
          {spot ? (
            <>
              {/* Boven */}
              <div className="wt-shade" style={{ top: 0, left: 0, right: 0, height: spot.top }} />
              {/* Onder */}
              <div className="wt-shade" style={{ top: spot.top + spot.height, left: 0, right: 0, bottom: 0 }} />
              {/* Links */}
              <div className="wt-shade" style={{ top: spot.top, left: 0, width: spot.left, height: spot.height }} />
              {/* Rechts */}
              <div className="wt-shade" style={{ top: spot.top, left: spot.left + spot.width, right: 0, height: spot.height }} />
              {/* Gekleurde ring rondom element */}
              <div
                className="wt-ring"
                style={{
                  top: spot.top, left: spot.left,
                  width: spot.width, height: spot.height,
                  borderColor: current.accent,
                }}
              />
            </>
          ) : (
            /* Geen element → volledig donker */
            <div className="wt-shade" style={{ inset: 0 }} />
          )}

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
                <button
                  key={i}
                  className={`walkthrough-dot${i === step ? " active" : i < step ? " done" : ""}`}
                  onClick={() => applyStep(i)}
                  aria-label={`Stap ${i + 1}`}
                />
              ))}
            </div>

            <div className="walkthrough-nav">
              {step > 0
                ? <button className="walkthrough-btn-back" onClick={prev}>← Terug</button>
                : <div />
              }
              <button className="walkthrough-btn-next" onClick={next} style={{ background: current.accent }}>
                {isLast ? "Klaar →" : "Volgende →"}
              </button>
            </div>

            {!isLast && (
              <button className="walkthrough-skip" onClick={closeTour}>Overslaan</button>
            )}
          </div>
        </div>
      )}
      {/* suppress unused var warning */}
      <span style={{ display: "none" }}>{vw}{vh}</span>
    </>
  );
}
