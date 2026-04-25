"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
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
  { icon: Brain,           title: "Welkom — ik ben Marcus",   accent: "#e91e63",
    text: "Jouw persoonlijke tradingcoach. Geen hype, geen valse beloftes. Ik leer je nadenken vóór je handelt." },
  { icon: LayoutDashboard, title: "Dashboard",                 accent: "#3b82f6",
    selector: 'a[href="/dashboard"]',
    text: "Start hier elke dag. Persoonlijke marktbriefing, dagelijkse missies en voortgang in één overzicht." },
  { icon: Radar,           title: "Scanner",                   accent: "#f59e0b",
    selector: 'a[href="/scanner"]',
    text: "Welke assets zijn klaar voor een setup? Score 70+ = technisch interessant. Klik aan voor mijn analyse." },
  { icon: TrendingUp,      title: "Handelen",                  accent: "#22c55e",
    selector: 'a[href="/trade"]',
    text: "Paper trading met nepgeld — leer zonder risico. Stel altijd een stop-loss in. Na elke trade geef ik feedback." },
  { icon: GraduationCap,   title: "Leren",                     accent: "#8b5cf6",
    selector: 'a[href="/leren"]',
    text: "Dagelijkse quizzes die meegroeien met jouw niveau. Hoe meer je weet, hoe scherper mijn coaching." },
  { icon: BarChart3,       title: "Account & meer",            accent: "#06b6d4",
    selector: ".app-nav-account-btn",
    text: "Via het accountmenu vind je Stats, Brokers, Nieuws en meer. Zelfkennis is je grootste voordeel." },
  { icon: MessageSquare,   title: "Ik ben altijd bereikbaar",  accent: "#e91e63",
    selector: ".float-marcus-btn",
    text: "De M-knop rechtsonder — dat ben ik. Vraag me alles: markt, trade, plan. 24/7." },
];

type Rect = { x: number; y: number; w: number; h: number };

function getRect(selector: string): Rect | null {
  // Probeer exacte selector, dan alleen a[href=...] variant
  const candidates = [selector, selector.startsWith("a.") ? selector.replace(/^a\.[^\[]+/, "a") : null].filter(Boolean) as string[];
  for (const sel of candidates) {
    try {
      const els = Array.from(document.querySelectorAll<HTMLElement>(sel));
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
        }
      }
    } catch { /* */ }
  }
  return null;
}

export default function AppWalkthrough() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const tourAllowed = pathname !== "/" && !pathname.startsWith("/auth/");

  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [rect, setRect]       = useState<Rect | null>(null);
  const [vw, setVw]           = useState(0);
  const [vh, setVh]           = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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

  useEffect(() => {
    if (!session?.user || !tourAllowed) return;
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
  }, [session, tourAllowed]);

  function openTour(s = 0) {
    setStep(s);
    setVw(window.innerWidth);
    setVh(window.innerHeight);
    const sel = STEPS[s]?.selector;
    setRect(sel ? getRect(sel) : null);
    setVisible(true);
    setTimeout(() => setEntered(true), 30);
  }

  function closeTour() {
    setEntered(false);
    setTimeout(() => { setVisible(false); setRect(null); }, 240);
    localStorage.setItem(DONE_KEY, "done");
  }

  function goTo(s: number) {
    setStep(s);
    const sel = STEPS[s]?.selector;
    setRect(sel ? getRect(sel) : null);
  }

  function next() { if (step >= STEPS.length - 1) { closeTour(); return; } goTo(step + 1); }
  function prev() { if (step > 0) goTo(step - 1); }

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  function cardStyle(): React.CSSProperties {
    if (!rect || vw === 0) return { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)" };
    const TW    = Math.min(340, vw - 32);
    const cx    = rect.x + rect.w / 2;
    let   left  = Math.max(16, Math.min(cx - TW / 2, vw - TW - 16));
    const below = vh - (rect.y + rect.h + PAD);
    const above = rect.y - PAD;
    if (below >= 180 || below >= above) return { position: "fixed", left, top:    rect.y + rect.h + PAD + 8, width: TW };
    else                                return { position: "fixed", left, bottom: vh - rect.y + PAD + 8,     width: TW };
  }

  const overlay = (
    <div
      className={`walkthrough-overlay${entered ? " entered" : ""}`}
      onClick={closeTour}
      aria-modal="true"
      role="dialog"
    >
      {/* SVG spotlight — donkere overlay met transparant gat rondom het element */}
      <svg
        width={vw} height={vh}
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9900 }}
      >
        <defs>
          <mask id="wt-mask">
            <rect width={vw} height={vh} fill="white" />
            {rect && <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={10} fill="black" />}
          </mask>
        </defs>
        <rect width={vw} height={vh} fill="rgba(0,0,0,0.80)" mask="url(#wt-mask)" />
        {rect && (
          <rect
            x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={10}
            fill="none" stroke={current.accent} strokeWidth={2} opacity={0.85}
          />
        )}
      </svg>

      {/* Kaart */}
      <div
        className={`walkthrough-card${entered ? " entered" : ""}`}
        style={{ ...cardStyle(), zIndex: 9901 }}
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
              onClick={() => goTo(i)}
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
    </div>
  );

  return (
    <>
      {session?.user && !visible && tourAllowed && (
        <button className="walkthrough-help-btn" onClick={() => openTour(0)} title="App tour (? toets)">?</button>
      )}
      {mounted && visible && createPortal(overlay, document.body)}
    </>
  );
}
