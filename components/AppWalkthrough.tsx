"use client";

// AppWalkthrough — clean card-modal tour zonder pagina-navigatie.
// Start ALLEEN automatisch nadat de onboarding is afgerond (PENDING_KEY gezet in onboarding/page.tsx).
// Kan altijd handmatig geopend worden via de ? knop (alleen als ingelogd).

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Brain, LayoutDashboard, Radio, TrendingUp,
  GraduationCap, BarChart3, MessageSquare, X,
  type LucideIcon,
} from "lucide-react";

const DONE_KEY    = "walkthrough-v4";
const PENDING_KEY = "walkthrough-pending";

type Step = { icon: LucideIcon; title: string; text: string; accent: string };

const STEPS: Step[] = [
  {
    icon: Brain,
    title: "Welkom — ik ben Marcus",
    text: "Ik ben jouw persoonlijke tradingcoach. Geen valse beloftes, geen hype. Ik leer je nadenken vóór je handelt. Elke dag een stukje beter.",
    accent: "#e91e63",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    text: "Start hier elke dag. Je krijgt een persoonlijke marktbriefing van mij, je dagelijkse missies en een overzicht van de markt. Zet je in de juiste mindset.",
    accent: "#3b82f6",
  },
  {
    icon: Radio,
    title: "Scanner",
    text: "Bekijk welke assets klaar zijn voor een setup. Score 70+ = technisch interessant moment. Klik een asset aan en ik analyseer hem direct voor jou.",
    accent: "#f59e0b",
  },
  {
    icon: TrendingUp,
    title: "Paper Trading",
    text: "Handel met nepgeld — leer zonder risico. Stel altijd een stop-loss in. Na elke trade geef ik je feedback: heb je je plan gevolgd?",
    accent: "#22c55e",
  },
  {
    icon: GraduationCap,
    title: "Leren",
    text: "Dagelijkse quizzes die meegroeien met jouw niveau. Van level 1 naar 6. Hoe meer je weet, hoe scherper mijn coaching op jou is afgestemd.",
    accent: "#8b5cf6",
  },
  {
    icon: BarChart3,
    title: "Stats",
    text: "Jouw winrate, gedragspatronen, beste en slechtste dagen. Kennis van jezelf is het grootste voordeel dat een trader kan hebben.",
    accent: "#06b6d4",
  },
  {
    icon: MessageSquare,
    title: "Ik ben altijd bereikbaar",
    text: "De M-knop rechtsonder — dat ben ik. Vraag me alles over de markt, je trade of je plan. Ik ben er 24/7. Geen domme vragen.",
    accent: "#e91e63",
  },
];

export default function AppWalkthrough() {
  const { data: session } = useSession();
  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    const pending = localStorage.getItem(PENDING_KEY);
    const done    = localStorage.getItem(DONE_KEY);
    if (pending === "1" && !done) {
      localStorage.removeItem(PENDING_KEY);
      setTimeout(() => { setStep(0); setVisible(true); setTimeout(() => setEntered(true), 30); }, 1200);
    }

    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (e.key === "?" || e.key === "h") { setStep(0); setVisible(true); setTimeout(() => setEntered(true), 30); }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function open() { setStep(0); setVisible(true); setTimeout(() => setEntered(true), 30); }

  function close() {
    setEntered(false);
    setTimeout(() => setVisible(false), 240);
    localStorage.setItem(DONE_KEY, "done");
  }

  function next() {
    if (step >= STEPS.length - 1) { close(); return; }
    setStep(s => s + 1);
  }

  function prev() { if (step > 0) setStep(s => s - 1); }

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  return (
    <>
      {/* Help knop — alleen voor ingelogde gebruikers */}
      {session?.user && !visible && (
        <button className="walkthrough-help-btn" onClick={open} title="App tour (? toets)">?</button>
      )}

      {visible && (
        <div className={`walkthrough-backdrop${entered ? " entered" : ""}`} onClick={close}>
          <div className={`walkthrough-modal${entered ? " entered" : ""}`} onClick={e => e.stopPropagation()}>

            {/* Sluit */}
            <button className="walkthrough-close" onClick={close}><X size={16} /></button>

            {/* Stap label */}
            <div className="walkthrough-step-counter">{step + 1} / {STEPS.length}</div>

            {/* Icoon */}
            <div className="walkthrough-icon-wrap" style={{ background: `${current.accent}18`, border: `1px solid ${current.accent}30` }}>
              <current.icon size={30} style={{ color: current.accent }} />
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
                  onClick={() => setStep(i)}
                  aria-label={`Stap ${i + 1}`}
                />
              ))}
            </div>

            {/* Navigatie */}
            <div className="walkthrough-nav">
              {step > 0 ? (
                <button className="walkthrough-btn-back" onClick={prev}>← Terug</button>
              ) : (
                <div />
              )}
              <button className="walkthrough-btn-next" onClick={next}>
                {isLast ? "Klaar, aan de slag →" : "Volgende →"}
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
