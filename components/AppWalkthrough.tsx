"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import {
  Brain, LayoutDashboard, Radar, TrendingUp,
  GraduationCap, BarChart3, MessageSquare, X,
  type LucideIcon,
} from "lucide-react";

const DONE_KEY    = "walkthrough-v5";
const PENDING_KEY = "walkthrough-pending";
const PAD         = 10;

type Step = { icon: LucideIcon; title: string; text: string; accent: string; selector?: string };

const STEPS: Step[] = [
  { icon: Brain,           title: "Welkom — ik ben Marcus",    accent: "#e91e63",
    text: "Jouw persoonlijke tradingcoach. Geen hype, geen valse beloftes. Ik leer je nadenken vóór je handelt." },
  { icon: LayoutDashboard, title: "Dashboard",                  accent: "#3b82f6", selector: '[data-tour="dashboard"]',
    text: "Start hier elke dag. Persoonlijke marktbriefing, dagelijkse missies en voortgang in één overzicht." },
  { icon: Radar,           title: "Scanner",                    accent: "#f59e0b", selector: '[data-tour="scanner"]',
    text: "Welke assets zijn klaar voor een setup? Score 70+ = technisch interessant. Klik aan voor mijn analyse." },
  { icon: TrendingUp,      title: "Handelen",                   accent: "#22c55e", selector: '[data-tour="trade"]',
    text: "Paper trading met nepgeld — leer zonder risico. Stel altijd een stop-loss in. Na elke trade geef ik feedback." },
  { icon: GraduationCap,   title: "Leren",                      accent: "#8b5cf6", selector: '[data-tour="leren"]',
    text: "Dagelijkse quizzes die meegroeien met jouw niveau. Hoe meer je weet, hoe scherper mijn coaching." },
  { icon: BarChart3,       title: "Stats & meer",               accent: "#06b6d4", selector: ".app-nav-account-btn",
    text: "Via het accountmenu vind je Stats, Brokers, Nieuws en meer. Zelfkennis is je grootste voordeel." },
  { icon: MessageSquare,   title: "Ik ben altijd bereikbaar",   accent: "#e91e63", selector: ".float-marcus-btn",
    text: "De M-knop rechtsonder — dat ben ik. Vraag me alles: markt, trade, plan. 24/7." },
];

type Spot = { top: number; left: number; width: number; height: number };

function measureEl(selector: string): Spot | null {
  try {
    const els = document.querySelectorAll<HTMLElement>(selector);
    for (const el of Array.from(els)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        return {
          top:    r.top    - PAD,
          left:   r.left   - PAD,
          width:  r.width  + PAD * 2,
          height: r.height + PAD * 2,
        };
      }
    }
  } catch { /* */ }
  return null;
}

export default function AppWalkthrough() {
  const { data: session } = useSession();
  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [spot, setSpot]       = useState<Spot | null>(null);
  const [vw, setVw]           = useState(0);
  const [vh, setVh]           = useState(0);
  const rafRef                = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const applyStep = useCallback((s: number) => {
    setStep(s);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const sel = STEPS[s]?.selector;
      setSpot(sel ? measureEl(sel) : null);
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

  const W = vw || (typeof window !== "undefined" ? window.innerWidth  : 1440);
  const H = vh || (typeof window !== "undefined" ? window.innerHeight : 900);

  // Clip-path: alles in px zodat CSS transition werkt.
  // No-spot: 0×0 gat in het midden = volledig donker scherm.
  // Met spot: rechthoekig gat op de positie van het element.
  const hL = spot ? spot.left              : W / 2;
  const hT = spot ? spot.top               : H / 2;
  const hR = spot ? spot.left + spot.width : W / 2;
  const hB = spot ? spot.top + spot.height : H / 2;

  const clipPath =
    `polygon(evenodd,` +
    `0px 0px,${W}px 0px,${W}px ${H}px,0px ${H}px,` +          // buitenste rechthoek (volledig scherm)
    `${hL}px ${hT}px,${hL}px ${hB}px,${hR}px ${hB}px,${hR}px ${hT}px)`;  // gat

  // Tooltip positie
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
      {/* Donkere overlay met clip-path gat — toont element door het gat heen */}
      <div
        style={{
          position:   "fixed",
          inset:      0,
          zIndex:     9900,
          background: "rgba(0,0,0,0.82)",
          clipPath,
          transition: "clip-path 0.35s cubic-bezier(0.4,0,0.2,1)",
          pointerEvents: "none",
        }}
      />

      {/* Kliklaag: sluit tour als buiten de kaart geklikt */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9899 }}
        onClick={closeTour}
      />

      {/* Gekleurde ring rond het element */}
      <div
        style={{
          position:      "fixed",
          zIndex:        9901,
          pointerEvents: "none",
          top:           spot ? spot.top               : H / 2,
          left:          spot ? spot.left              : W / 2,
          width:         spot ? spot.width             : 0,
          height:        spot ? spot.height            : 0,
          opacity:       spot ? 1 : 0,
          border:        `2px solid ${current.accent}`,
          borderRadius:  10,
          transition:    "top .35s ease,left .35s ease,width .35s ease,height .35s ease,opacity .25s ease,border-color .25s ease",
        }}
      />

      {/* Tooltip card */}
      <div
        className={`walkthrough-card${entered ? " entered" : ""}`}
        style={{ ...cardStyle(), position: "fixed", zIndex: 9902 }}
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
              onClick={() => applyStep(i)}
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
