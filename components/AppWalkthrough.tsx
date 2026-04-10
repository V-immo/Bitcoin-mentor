"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "walkthrough-v3";

const STEPS = [
  {
    icon: "👋",
    title: "Welkom bij Bitcoin Mentor",
    text: "Marcus is jouw persoonlijke tradingcoach. Klik Volgende om te zien wat de app kan.",
  },
  {
    icon: "📊",
    title: "Dashboard",
    text: "Je startpunt: ochtendgroet van Marcus, dagelijkse marktbriefing en een overzicht van alle assets.",
  },
  {
    icon: "📡",
    title: "Scanner",
    text: "Elke asset krijgt een score 0–100. Groen = goede setup. Klik op een asset om direct te traden.",
  },
  {
    icon: "📈",
    title: "Paper Trading",
    text: "Oefen met nep-geld. Open een positie, stel stop-loss in — geen financieel risico.",
  },
  {
    icon: "📋",
    title: "Tradingplan",
    text: "Vul in je Profiel je max risico, entry- en exit-regels in. Marcus houdt je er aan.",
  },
  {
    icon: "🎓",
    title: "Leren",
    text: "Dagelijkse quizzes om te groeien van level 1 naar 5. Meer kennis = diepere coaching van Marcus.",
  },
  {
    icon: "📅",
    title: "Agenda",
    text: "Schrijf elke dag op hoe je je voelde. Marcus analyseert je patronen en geeft wekelijks review.",
  },
  {
    icon: "🤖",
    title: "Marcus knop",
    text: "De roze M-knop rechtsonder is Marcus. Stel hem direct een vraag over de markt of jouw trade.",
  },
  {
    icon: "🎉",
    title: "Je bent klaar!",
    text: "Begin met je tradingplan invullen in Profiel en open je eerste paper trade. Succes!",
  },
];

export default function AppWalkthrough() {
  const [step, setStep] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      setTimeout(() => { setStep(0); setVisible(true); }, 1200);
    }

    function onKey(e: KeyboardEvent) {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (e.key === "?" || e.key === "h") {
        setStep(0); setVisible(true);
      }
      if (e.key === "Escape") {
        setVisible(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function next() {
    if (step === null) return;
    if (step >= STEPS.length - 1) finish();
    else setStep(step + 1);
  }

  function prev() {
    if (step === null || step <= 0) return;
    setStep(step - 1);
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

  return (
    <>
      {/* ❓ help knop — altijd zichtbaar als tour niet actief */}
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

      {/* Tour balk — onderaan het scherm */}
      {visible && current && (
        <div style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          zIndex: 9999,
          background: "var(--surface, #1a0d1e)",
          borderTop: "2px solid rgba(233,30,99,0.5)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
          padding: "16px 20px 20px",
        }}>
          {/* Progress bar */}
          <div style={{ height: 3, background: "rgba(233,30,99,0.15)", borderRadius: 99, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "#e91e63", borderRadius: 99, transition: "width 0.3s" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Icon + tekst */}
            <div style={{ fontSize: 28, flexShrink: 0 }}>{current.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text, #fce8f0)" }}>{current.title}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted, #64748b)" }}>{step! + 1}/{STEPS.length}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary, #bf7a99)", lineHeight: 1.5 }}>
                {current.text}
              </p>
            </div>

            {/* Knoppen */}
            <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
              <button
                onClick={skip}
                style={{
                  fontSize: 12, color: "var(--text-muted, #64748b)",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "6px 8px", whiteSpace: "nowrap",
                }}
              >
                Overslaan
              </button>
              {step! > 0 && (
                <button
                  onClick={prev}
                  style={{
                    fontSize: 13, padding: "7px 14px", borderRadius: 8,
                    background: "rgba(233,30,99,0.1)", color: "#e91e63",
                    border: "1px solid rgba(233,30,99,0.3)", cursor: "pointer", fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >← Terug</button>
              )}
              <button
                onClick={next}
                style={{
                  fontSize: 13, padding: "7px 18px", borderRadius: 8,
                  background: "#e91e63", color: "#fff",
                  border: "none", cursor: "pointer", fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {step === STEPS.length - 1 ? "Klaar 🎉" : "Volgende →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
