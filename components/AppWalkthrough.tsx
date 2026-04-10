"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "walkthrough-v2";
const HELP_KEY = "walkthrough-help-shown";

interface WalkthroughStep {
  title: string;
  text: string;
  selector?: string;       // CSS selector van het te markeren element
  route?: string;          // navigeer eerst naar deze route
  position?: "top" | "bottom" | "left" | "right" | "center";
}

const STEPS: WalkthroughStep[] = [
  {
    title: "Welkom bij Bitcoin Mentor",
    text: "Marcus is jouw persoonlijke tradingcoach. In 2 minuten leer je hoe je de app gebruikt. Je kunt deze tour altijd opnieuw starten via de ❓ knop.",
    position: "center",
  },
  {
    title: "📊 Dashboard",
    text: "Dit is je startpunt. Je ziet hier de ochtendgroet van Marcus, de dagelijkse marktbriefing en een overzicht van alle assets.",
    route: "/dashboard",
    selector: ".dash-layout",
    position: "center",
  },
  {
    title: "📡 Scanner — vind de beste kansen",
    text: "De scanner geeft elke asset een score van 0-100. Groen = setup klaar. Klik op een asset om direct naar het trading dashboard te gaan.",
    route: "/scanner",
    selector: ".scanner-grid, .scanner-container, [class*='scanner']",
    position: "bottom",
  },
  {
    title: "📈 Handelen — paper trade",
    text: "Hier oefen je met nep-geld. Open een positie, stel een stop-loss in en leer de markt kennen zonder financieel risico.",
    route: "/trade",
    position: "center",
  },
  {
    title: "🎯 Plan Check — laat Marcus je trade beoordelen",
    text: "Vul je instapprijs, stop-loss en target in. Marcus geeft een oordeel: GOED, AANPASSEN of NIET DOEN — met uitleg.",
    route: "/trade",
    position: "center",
  },
  {
    title: "🎓 Leren — groei stap voor stap",
    text: "Maak dagelijkse quizzes om te stijgen van level 1 naar 5. Hoe hoger je level, hoe dieper Marcus zijn coaching gaat.",
    route: "/leren",
    position: "center",
  },
  {
    title: "📋 Profiel — jouw tradingplan",
    text: "Vul hier je persoonlijke tradingplan in: max risico per trade, entry-regels, exit-regels. Marcus houdt je er aan.",
    route: "/profiel",
    position: "center",
  },
  {
    title: "📅 Agenda — dagboek bijhouden",
    text: "Schrijf elke dag op hoe je je voelde en wat je hebt gedaan. Marcus analyseert deze patronen en geeft je wekelijks een review.",
    route: "/agenda",
    position: "center",
  },
  {
    title: "📊 Statistieken — gedragspatronen",
    text: "Hier zie je je winrate, P&L per dag van de week, revenge trading waarschuwingen en Marcus' signalen. Inclusief copy trading toggle.",
    route: "/stats",
    position: "center",
  },
  {
    title: "🤖 Marcus — altijd beschikbaar",
    text: "De roze M-knop rechtsonder is Marcus. Stel hem direct een vraag over de markt, jouw trade of jouw plan. Hij kent alles van de app.",
    selector: ".float-marcus-btn",
    position: "left",
  },
  {
    title: "Klaar 🎉",
    text: "Je weet hoe Bitcoin Mentor werkt. Begin met het invullen van je tradingplan in je Profiel en open je eerste paper trade. Succes!",
    position: "center",
  },
];

export default function AppWalkthrough() {
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [hasTarget, setHasTarget] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentStep = step !== null ? STEPS[step] : null;

  // Bereken positie van target element
  const updatePos = useCallback(() => {
    if (!currentStep?.selector) { setHasTarget(false); return; }
    const el = document.querySelector(currentStep.selector);
    if (!el) { setHasTarget(false); return; }
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height });
    setHasTarget(true);
  }, [currentStep]);

  useEffect(() => {
    if (!visible) return;
    updatePos();
    const id = setInterval(updatePos, 300);
    return () => clearInterval(id);
  }, [visible, updatePos]);

  // Eerste keer automatisch tonen
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setTimeout(() => { setStep(0); setVisible(true); }, 1500);
    }
  }, []);

  // Hulpknop H-key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "?" || (e.key === "h" && !e.ctrlKey && !e.metaKey && !(document.activeElement instanceof HTMLInputElement) && !(document.activeElement instanceof HTMLTextAreaElement))) {
        setStep(0); setVisible(true);
      }
      if (e.key === "Escape" && visible) close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  async function goTo(newStep: number) {
    if (newStep >= STEPS.length) { finish(); return; }
    const target = STEPS[newStep];
    if (target.route && target.route !== pathname) {
      router.push(target.route);
      await new Promise(r => setTimeout(r, 400));
    }
    setStep(newStep);
    setTimeout(updatePos, 100);
  }

  function close() {
    setVisible(false);
    setStep(null);
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, "done");
    close();
  }

  if (!visible || step === null || !currentStep) return (
    <button
      onClick={() => { setStep(0); setVisible(true); }}
      title="Hulp / App tour (druk ? om te openen)"
      style={{
        position: "fixed", bottom: 90, left: 20, zIndex: 9990,
        width: 36, height: 36, borderRadius: "50%",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.15)",
        color: "rgba(255,255,255,0.5)",
        fontSize: 16, fontWeight: 700, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
        transition: "all 0.2s",
      }}
      onMouseEnter={e => { (e.target as HTMLButtonElement).style.opacity = "1"; (e.target as HTMLButtonElement).style.color = "#fff"; }}
      onMouseLeave={e => { (e.target as HTMLButtonElement).style.opacity = "1"; (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; }}
    >?</button>
  );

  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  const isCenter = currentStep.position === "center" || !hasTarget;

  // Tooltip positie ten opzichte van target
  let tooltipStyle: React.CSSProperties = {};
  if (hasTarget && !isCenter) {
    const MARGIN = 16;
    const TW = 300;
    switch (currentStep.position) {
      case "bottom":
        tooltipStyle = { position: "absolute", top: pos.top + pos.height + MARGIN, left: Math.max(8, Math.min(pos.left, window.innerWidth - TW - 8)) };
        break;
      case "top":
        tooltipStyle = { position: "absolute", top: pos.top - 160 - MARGIN, left: Math.max(8, Math.min(pos.left, window.innerWidth - TW - 8)) };
        break;
      case "left":
        tooltipStyle = { position: "absolute", top: pos.top, left: Math.max(8, pos.left - TW - MARGIN) };
        break;
      default:
        tooltipStyle = { position: "absolute", top: pos.top + pos.height + MARGIN, left: Math.max(8, Math.min(pos.left, window.innerWidth - TW - 8)) };
    }
  }

  return (
    <>
      {/* Overlay dimming */}
      <div
        ref={overlayRef}
        onClick={close}
        style={{
          position: "fixed", inset: 0, zIndex: 9991,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Target highlight */}
      {hasTarget && (
        <div style={{
          position: "absolute",
          top: pos.top - 4, left: pos.left - 4,
          width: pos.width + 8, height: pos.height + 8,
          zIndex: 9992,
          borderRadius: 10,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.6), 0 0 0 2px #e91e63",
          pointerEvents: "none",
        }} />
      )}

      {/* Tooltip */}
      <div
        onClick={e => e.stopPropagation()}
        style={isCenter ? {
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9993,
          width: 320,
        } : {
          ...tooltipStyle,
          zIndex: 9993,
          width: 300,
        }}
      >
        <div style={{
          background: "var(--surface, #1a1a2e)",
          border: "1px solid rgba(233,30,99,0.4)",
          borderRadius: 14, padding: "18px 18px 14px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}>
          {/* Progress bar */}
          <div style={{ height: 3, background: "rgba(233,30,99,0.15)", borderRadius: 99, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "#e91e63", borderRadius: 99, transition: "width 0.3s" }} />
          </div>

          {/* Step counter */}
          <div style={{ fontSize: 11, color: "var(--text-muted, #64748b)", marginBottom: 6 }}>
            Stap {step + 1} van {STEPS.length}
          </div>

          {/* Title */}
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text, #fce8f0)", marginBottom: 8 }}>
            {currentStep.title}
          </div>

          {/* Text */}
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary, #bf7a99)", margin: "0 0 16px" }}>
            {currentStep.text}
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={close}
              style={{
                fontSize: 12, color: "var(--text-muted, #64748b)",
                background: "none", border: "none", cursor: "pointer", padding: 0,
              }}
            >
              Tour overslaan
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              {step > 0 && (
                <button
                  onClick={() => goTo(step - 1)}
                  style={{
                    fontSize: 13, padding: "6px 14px", borderRadius: 8,
                    background: "rgba(233,30,99,0.1)", color: "#e91e63",
                    border: "1px solid rgba(233,30,99,0.3)", cursor: "pointer", fontWeight: 500,
                  }}
                >← Terug</button>
              )}
              <button
                onClick={() => goTo(step + 1)}
                style={{
                  fontSize: 13, padding: "6px 16px", borderRadius: 8,
                  background: "#e91e63", color: "#fff",
                  border: "none", cursor: "pointer", fontWeight: 600,
                }}
              >
                {step === STEPS.length - 1 ? "Klaar 🎉" : "Volgende →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
