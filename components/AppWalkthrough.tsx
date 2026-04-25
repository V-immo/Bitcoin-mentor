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
  const [dbg, setDbg]         = useState("—");   // DEBUG — verwijder na diagnose

  // Refs voor DOM-manipulatie (alleen voor nav/element omhoog brengen)
  const raisedNavRef     = useRef<HTMLElement | null>(null);
  const raisedNavOrigCss = useRef("");
  const raisedElRef      = useRef<HTMLElement | null>(null);
  const raisedElOrigCss  = useRef("");

  useEffect(() => {
    setMounted(true);
    const upd = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  // Herstel nav/element z-index en backdrop-filter
  function clearHighlight() {
    if (raisedNavRef.current) {
      raisedNavRef.current.style.cssText = raisedNavOrigCss.current;
      raisedNavRef.current = null;
      raisedNavOrigCss.current = "";
    }
    if (raisedElRef.current) {
      raisedElRef.current.style.cssText = raisedElOrigCss.current;
      raisedElRef.current = null;
      raisedElOrigCss.current = "";
    }
  }

  // Breng het juiste element boven de overlay, geeft positie terug voor de highlight-ring + kaart
  function applyHighlight(s: number): Spot | null {
    clearHighlight();
    const sel = STEPS[s]?.selector;
    if (!sel) { setDbg(`s${s}: geen selector`); return null; }

    const fallbacks = [sel, ".nav-hamburger", "nav", "body"];
    const lines: string[] = [`s${s} | vp:${window.innerWidth}x${window.innerHeight}`];

    for (const candidate of fallbacks) {
      try {
        const els = document.querySelectorAll<HTMLElement>(candidate);
        const info = Array.from(els).map(e => {
          const r = e.getBoundingClientRect();
          return `${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.left)},${Math.round(r.top)}`;
        }).join(" / ") || "—";
        lines.push(`"${candidate}"(${els.length}): ${info}`);

        for (const el of Array.from(els)) {
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;

          const nav = document.querySelector<HTMLElement>("nav");
          const inNav = !!(nav && nav.contains(el));

          if (inNav && nav) {
            raisedNavOrigCss.current = nav.style.cssText;
            nav.style.setProperty("z-index",                "9902", "important");
            nav.style.setProperty("backdrop-filter",         "none", "important");
            nav.style.setProperty("-webkit-backdrop-filter", "none", "important");
            raisedNavRef.current = nav;
          } else {
            raisedElOrigCss.current = el.style.cssText;
            el.style.setProperty("z-index", "9902", "important");
            raisedElRef.current = el;
          }

          setDbg(lines.join("\n") + `\n→ FOUND "${candidate}"`);
          return { top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 };
        }
      } catch (err) { lines.push(`"${candidate}" ERR: ${err}`); }
    }

    setDbg(lines.join("\n") + "\n→ NIETS");
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
      {/* Donkere overlay */}
      <div style={{
        position:   "fixed",
        inset:      0,
        zIndex:     9900,
        background: "rgba(0,0,0,0.82)",
        cursor:     "pointer",
      }} onClick={closeTour} />

      {/* Highlight-ring */}
      {spot && (
        <div style={{
          position:      "fixed",
          top:           spot.top,
          left:          spot.left,
          width:         spot.width,
          height:        spot.height,
          zIndex:        9903,
          borderRadius:  10,
          border:        `2px solid ${current.accent}`,
          boxShadow:     `0 0 0 4px ${current.accent}33, 0 0 18px 4px ${current.accent}55`,
          pointerEvents: "none",
        }} />
      )}

      {/* Kaart */}
      <div
        className={`walkthrough-card${entered ? " entered" : ""}`}
        style={{ ...cardStyle(), position: "fixed", zIndex: 9904 }}
        onClick={e => e.stopPropagation()}
      >
        <button className="walkthrough-close" onClick={closeTour}><X size={15} /></button>
        <div className="walkthrough-step-counter">{step + 1} / {STEPS.length}</div>
        <div className="walkthrough-icon-wrap" style={{ background: `${current.accent}18`, border: `1px solid ${current.accent}30` }}>
          <current.icon size={26} style={{ color: current.accent }} />
        </div>
        <h2 className="walkthrough-title">{current.title}</h2>
        <p className="walkthrough-text">{current.text}</p>

        {/* ── DEBUG — verwijder na diagnose ── */}
        <div style={{ marginTop: 8, padding: "4px 8px", background: "#0004", borderRadius: 6, fontFamily: "monospace", fontSize: 10, color: "#fff8", wordBreak: "break-all", lineHeight: 1.4 }}>
          {dbg}
        </div>

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
