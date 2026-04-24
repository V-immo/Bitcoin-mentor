"use client";

// AppWalkthrough — spotlight-tour die langs echte pagina-elementen beweegt.
// Start automatisch na voltooide onboarding (PENDING_KEY gezet).
// Kan altijd handmatig geopend worden via de ? knop.

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { X, type LucideIcon, Home, GraduationCap, Radar, TrendingUp, User, MessageCircle, HelpCircle } from "lucide-react";

const DONE_KEY    = "walkthrough-v5";
const PENDING_KEY = "walkthrough-pending";
const PAD         = 10; // spotlight padding rondom element (px)

type Step = {
  icon: LucideIcon;
  title: string;
  text: string;
  accent: string;
  selector?: string; // CSS-selector voor het te highlighten element
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
    text: "Dagelijkse quizzes die meegroeien met jouw niveau — van beginner tot expert. Hoe meer je leert, hoe beter ik je coach.",
    accent: "#8b5cf6",
    selector: 'a.app-nav-link[href="/leren"]',
  },
  {
    icon: Radar,
    title: "Scanner",
    text: "Hier zie je welke assets klaar zijn voor een setup. Score 70+ = technisch interessant. Klik een asset aan en ik analyseer hem direct.",
    accent: "#f59e0b",
    selector: 'a.app-nav-link[href="/scanner"]',
  },
  {
    icon: TrendingUp,
    title: "Handelen",
    text: "Paper trading met nepgeld — leer zonder risico. Stel altijd een stop-loss in. Na elke trade geef ik je feedback.",
    accent: "#22c55e",
    selector: 'a.app-nav-link[href="/trade"]',
  },
  {
    icon: User,
    title: "Profiel",
    text: "Stel hier je tradingstijl, maximaal risico en dagverlies in. Hoe beter je profiel, hoe scherper mijn coaching.",
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
    text: "Wil je deze tour later nog een keer bekijken? Druk op de ? knop rechtsonder, of druk op de ? toets op je toetsenbord.",
    accent: "#e91e63",
  },
];

type Rect = { x: number; y: number; w: number; h: number };

function getRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return {
    x: r.left - PAD,
    y: r.top  - PAD,
    w: r.width  + PAD * 2,
    h: r.height + PAD * 2,
  };
}

export default function AppWalkthrough() {
  const { data: session } = useSession();
  const [step, setStep]         = useState(0);
  const [visible, setVisible]   = useState(false);
  const [entered, setEntered]   = useState(false);
  const [rect, setRect]         = useState<Rect | null>(null);
  const [vw, setVw]             = useState(0);
  const [vh, setVh]             = useState(0);

  // Herbereken rect als stap of venstergrootte verandert
  const recalc = useCallback((s: number) => {
    setVw(window.innerWidth);
    setVh(window.innerHeight);
    const sel = STEPS[s]?.selector;
    setRect(sel ? getRect(sel) : null);
  }, []);

  useEffect(() => {
    if (!visible) return;
    recalc(step);
    const onResize = () => recalc(step);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [visible, step, recalc]);

  // Auto-start na onboarding
  useEffect(() => {
    if (!session?.user) return;
    const pending = localStorage.getItem(PENDING_KEY);
    const done    = localStorage.getItem(DONE_KEY);
    if (pending === "1" && !done) {
      localStorage.removeItem(PENDING_KEY);
      setTimeout(() => open(0), 1200);
    }

    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (e.key === "?" || e.key === "h") open(0);
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function open(s = 0) {
    setStep(s);
    setVw(window.innerWidth);
    setVh(window.innerHeight);
    const sel = STEPS[s]?.selector;
    setRect(sel ? getRect(sel) : null);
    setVisible(true);
    setTimeout(() => setEntered(true), 30);
  }

  function close() {
    setEntered(false);
    setTimeout(() => { setVisible(false); setRect(null); }, 240);
    localStorage.setItem(DONE_KEY, "done");
  }

  function goTo(s: number) {
    setStep(s);
    const sel = STEPS[s]?.selector;
    setRect(sel ? getRect(sel) : null);
  }

  function next() {
    if (step >= STEPS.length - 1) { close(); return; }
    goTo(step + 1);
  }
  function prev() { if (step > 0) goTo(step - 1); }

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  // Tooltip positie berekenen op basis van spotlight-rect
  function tooltipStyle(): React.CSSProperties {
    if (!rect || vw === 0) {
      // Geen element → gecentreerd midden in beeld
      return { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)" };
    }

    const TW = Math.min(340, vw - 32); // tooltip breedte
    const BELOW_SPACE = vh - (rect.y + rect.h + PAD);
    const ABOVE_SPACE = rect.y - PAD;

    // Horizontaal: gecentreerd op het element, geclamped binnen scherm
    const cx    = rect.x + rect.w / 2;
    let left    = cx - TW / 2;
    left        = Math.max(16, Math.min(left, vw - TW - 16));

    if (BELOW_SPACE >= 180 || BELOW_SPACE >= ABOVE_SPACE) {
      // Onder het element
      return { position: "fixed", left, top: rect.y + rect.h + PAD + 8, width: TW };
    } else {
      // Boven het element
      return { position: "fixed", left, bottom: vh - rect.y + PAD + 8, width: TW };
    }
  }

  return (
    <>
      {/* Help knop — alleen als ingelogd en tour niet open */}
      {session?.user && !visible && (
        <button className="walkthrough-help-btn" onClick={() => open(0)} title="App tour (? toets)">?</button>
      )}

      {visible && (
        <div
          className={`walkthrough-overlay${entered ? " entered" : ""}`}
          onClick={close}
          aria-modal="true"
          role="dialog"
        >
          {/* SVG spotlight overlay — donker met transparant gat rondom element */}
          <svg
            className="walkthrough-svg"
            width={vw}
            height={vh}
            style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
          >
            <defs>
              <mask id="wt-mask">
                {/* Alles donker */}
                <rect width={vw} height={vh} fill="white" />
                {/* Gat rondom het element */}
                {rect && (
                  <rect
                    className="spotlight-hole"
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    rx={10}
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width={vw}
              height={vh}
              fill="rgba(0,0,0,0.78)"
              mask="url(#wt-mask)"
            />
            {/* Spotlight border glow rondom element */}
            {rect && (
              <rect
                className="spotlight-ring"
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                rx={10}
                fill="none"
                stroke={current.accent}
                strokeWidth={2}
                opacity={0.7}
              />
            )}
          </svg>

          {/* Tooltip card */}
          <div
            className={`walkthrough-card${entered ? " entered" : ""}`}
            style={tooltipStyle()}
            onClick={e => e.stopPropagation()}
          >
            {/* Sluit */}
            <button className="walkthrough-close" onClick={close}><X size={15} /></button>

            {/* Stap teller */}
            <div className="walkthrough-step-counter">{step + 1} / {STEPS.length}</div>

            {/* Icoon */}
            <div className="walkthrough-icon-wrap" style={{ background: `${current.accent}18`, border: `1px solid ${current.accent}30` }}>
              <current.icon size={22} style={{ color: current.accent }} />
            </div>

            {/* Tekst */}
            <h2 className="walkthrough-title">{current.title}</h2>
            <p className="walkthrough-text">{current.text}</p>

            {/* Progress dots */}
            <div className="walkthrough-dots">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  className={`walkthrough-dot${i === step ? " active" : i < step ? " done" : ""}`}
                  onClick={() => goTo(i)}
                  aria-label={`Stap ${i + 1}`}
                />
              ))}
            </div>

            {/* Navigatie */}
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
              <button className="walkthrough-skip" onClick={close}>Overslaan</button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
