"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import {
  Brain, LayoutDashboard, Radar, TrendingUp,
  GraduationCap, BarChart3, MessageSquare, X,
  type LucideIcon,
} from "lucide-react";

const DONE_KEY    = "walkthrough-v5";
const PENDING_KEY = "walkthrough-pending";

type Step = { icon: LucideIcon; title: string; text: string; accent: string; selector?: string };

const STEPS: Step[] = [
  { icon: Brain,           title: "Welkom — ik ben Marcus",    accent: "#e91e63",
    text: "Jouw persoonlijke tradingcoach. Geen hype, geen valse beloftes. Ik leer je nadenken vóór je handelt." },
  { icon: LayoutDashboard, title: "Dashboard",                  accent: "#3b82f6",
    selector: '[data-tour="dashboard"]',
    text: "Start hier elke dag. Persoonlijke marktbriefing, dagelijkse missies en voortgang in één overzicht." },
  { icon: Radar,           title: "Scanner",                    accent: "#f59e0b",
    selector: '[data-tour="scanner"]',
    text: "Welke assets zijn klaar voor een setup? Score 70+ = technisch interessant. Klik aan voor mijn analyse." },
  { icon: TrendingUp,      title: "Handelen",                   accent: "#22c55e",
    selector: '[data-tour="trade"]',
    text: "Paper trading met nepgeld — leer zonder risico. Stel altijd een stop-loss in. Na elke trade geef ik feedback." },
  { icon: GraduationCap,   title: "Leren",                      accent: "#8b5cf6",
    selector: '[data-tour="leren"]',
    text: "Dagelijkse quizzes die meegroeien met jouw niveau. Hoe meer je weet, hoe scherper mijn coaching." },
  { icon: BarChart3,       title: "Account & meer",             accent: "#06b6d4",
    selector: ".app-nav-account-btn",
    text: "Via het accountmenu vind je Stats, Brokers, Nieuws en meer. Zelfkennis is je grootste voordeel." },
  { icon: MessageSquare,   title: "Ik ben altijd bereikbaar",   accent: "#e91e63",
    selector: ".float-marcus-btn",
    text: "De M-knop rechtsonder — dat ben ik. Vraag me alles: markt, trade, plan. 24/7." },
];

type Spot = { top: number; left: number; width: number; height: number };

export default function AppWalkthrough() {
  const { data: session } = useSession();
  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [spot, setSpot]       = useState<Spot | null>(null);
  const [vw, setVw]           = useState(0);
  const [vh, setVh]           = useState(0);
  const [mounted, setMounted] = useState(false);

  // Refs voor DOM-manipulatie
  const raisedNavRef  = useRef<HTMLElement | null>(null);
  const ringedElRef   = useRef<HTMLElement | null>(null);
  const savedElCss    = useRef("");

  useEffect(() => {
    setMounted(true);
    const upd = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  // Verwijder highlight van vorig element
  function clearHighlight() {
    if (raisedNavRef.current) {
      raisedNavRef.current.style.removeProperty("z-index");
      raisedNavRef.current = null;
    }
    if (ringedElRef.current) {
      ringedElRef.current.style.cssText = savedElCss.current;
      ringedElRef.current = null;
    }
  }

  // Zet highlight op element voor stap s, geeft positie terug voor kaart
  function applyHighlight(s: number): Spot | null {
    clearHighlight();
    const sel = STEPS[s]?.selector;
    if (!sel) return null;

    // Probeer: exacte selector → hamburger → hele nav
    const fallbacks = [sel, ".nav-hamburger", "nav.app-nav"];
    for (const candidate of fallbacks) {
      try {
        const els = document.querySelectorAll<HTMLElement>(candidate);
        for (const el of Array.from(els)) {
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;

          // Zet nav boven de overlay (z-index 9900)
          const nav = document.querySelector<HTMLElement>("nav.app-nav");
          if (nav) {
            nav.style.setProperty("z-index", "9902", "important");
            raisedNavRef.current = nav;
          }

          // Voeg gekleurde ring toe aan het specifieke element
          savedElCss.current = el.style.cssText;
          el.style.setProperty("outline",        `3px solid ${STEPS[s].accent}`, "important");
          el.style.setProperty("outline-offset", "3px",  "important");
          el.style.setProperty("border-radius",  "8px",  "important");
          ringedElRef.current = el;

          return { top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 };
        }
      } catch { /* */ }
    }
    return null;
  }

  // Ga naar stap s
  function goToStep(s: number) {
    const sp = applyHighlight(s);
    setStep(s);
    setSpot(sp);
  }

  function openTour(s = 0) {
    goToStep(s);
    setVisible(true);
    setTimeout(() => setEntered(true), 30);
  }

  function closeTour() {
    clearHighlight();
    setEntered(false);
    setTimeout(() => { setVisible(false); setSpot(null); }, 240);
    localStorage.setItem(DONE_KEY, "done");
  }

  function next() { if (step >= STEPS.length - 1) { closeTour(); return; } goToStep(step + 1); }
  function prev() { if (step > 0) goToStep(step - 1); }

  // Cleanup bij unmount
  useEffect(() => () => clearHighlight(), []);

  // Keyboard + pending tour
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

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  const W = vw || (typeof window !== "undefined" ? window.innerWidth  : 1440);
  const H = vh || (typeof window !== "undefined" ? window.innerHeight : 900);

  // Kaart-positie
  function cardStyle(): React.CSSProperties {
    const TW = Math.min(360, W - 32);
    if (!spot) return { left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: TW };
    const cx   = spot.left + spot.width / 2;
    let   left = cx - TW / 2;
    left = Math.max(16, Math.min(left, W - TW - 16));
    const below = H - (spot.top + spot.height) - 16;
    if (below >= 180) return { left, top: spot.top + spot.height + 16, width: TW };
    return { left, bottom: H - spot.top + 16, width: TW };
  }

  const overlay = visible ? (
    <>
      {/* Donkere overlay — nav staat BOVEN dit (z-index 9902 > 9900) */}
      <div style={{
        position:   "fixed",
        inset:      0,
        zIndex:     9900,
        background: "rgba(0,0,0,0.82)",
        cursor:     "pointer",
      }} onClick={closeTour} />

      {/* Kaart staat boven nav (9903 > 9902) */}
      <div
        className={`walkthrough-card${entered ? " entered" : ""}`}
        style={{ ...cardStyle(), position: "fixed", zIndex: 9903 }}
        onClick={e => e.stopPropagation()}
      >
        <button className="walkthrough-close" onClick={closeTour}><X size={15} /></button>
        <div className="walkthrough-step-counter">{step + 1} / {STEPS.length}</div>
        <div className="walkthrough-icon-wrap" style={{ background: `${current.accent}18`, border: `1px solid ${current.accent}30` }}>
          <current.icon size={26} style={{ color: current.accent }} />
        </div>
        <h2 className="walkthrough-title">{current.title}</h2>
        <p className="walkthrough-text">{current.text}</p>
        <div className="walkthrough-dots">
          {STEPS.map((_, i) => (
            <button key={i}
              className={`walkthrough-dot${i === step ? " active" : i < step ? " done" : ""}`}
              onClick={() => goToStep(i)}
              aria-label={`Stap ${i + 1}`}
            />
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
  ) : null;

  return (
    <>
      {session?.user && !visible && (
        <button className="walkthrough-help-btn" onClick={() => openTour(0)} title="App tour (? toets)">?</button>
      )}
      {mounted && visible && createPortal(overlay, document.body)}
    </>
  );
}
