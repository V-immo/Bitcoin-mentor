"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "btcmentor-onboarded-v2";
const TOTAL_STEPS = 4;

const TRADING_STYLES = [
  { key: "swing", label: "Swing trading", desc: "Trades van 2-14 dagen. Rustig, weinig schermtijd.", icon: "📈" },
  { key: "day",   label: "Day trading",   desc: "Alles open en sluiten op dezelfde dag. Actief.", icon: "⚡" },
  { key: "long",  label: "Long term",     desc: "Maanden vasthouden. Geduld is je strategie.", icon: "🏦" },
];

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [tradingStyle, setTradingStyle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function close() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  async function handleStyleSave(style: string) {
    setTradingStyle(style);
    setSaving(true);
    try {
      await fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradingMode: style }),
      });
    } catch { /* ignore */ }
    setSaving(false);
    setStep(s => s + 1);
  }

  function goTo(path: string) {
    close();
    router.push(path);
  }

  if (!visible) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <button style={styles.skipBtn} onClick={close}>Overslaan</button>

        {/* Stap 0 — Marcus stelt zich voor */}
        {step === 0 && (
          <div style={styles.stepContent}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={styles.avatar}>🤖</div>
              <div>
                <div style={styles.name}>Marcus</div>
                <div style={styles.role}>Jouw trading mentor</div>
              </div>
            </div>
            <p style={styles.bubble}>
              Hey, ik ben Marcus. Ik ga je leren traden — niet met droge theorie,
              maar door het gewoon te doen. Elke dag een kleine stap.
            </p>
            <p style={styles.bubble}>
              Binnen 3 maanden weet je hoe je zelfstandig een trade opzet, beheert en sluit.
              Maar eerst: vertel me iets over jezelf.
            </p>
          </div>
        )}

        {/* Stap 1 — Handelsstijl kiezen */}
        {step === 1 && (
          <div style={styles.stepContent}>
            <p style={styles.bubble}>Hoe wil jij traden? Kies eerlijk — je kunt dit later altijd aanpassen.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              {TRADING_STYLES.map(s => (
                <button
                  key={s.key}
                  onClick={() => handleStyleSave(s.key)}
                  disabled={saving}
                  style={{
                    ...styles.styleBtn,
                    borderColor: tradingStyle === s.key ? "#e91e63" : "rgba(233,30,99,0.22)",
                    background: tradingStyle === s.key ? "rgba(233,30,99,0.12)" : "transparent",
                  }}
                >
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 700, color: "#fce8f0", fontSize: 14 }}>{s.label}</div>
                    <div style={{ color: "#bf7a99", fontSize: 12 }}>{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stap 2 — Wat is paper trading */}
        {step === 2 && (
          <div style={styles.stepContent}>
            <p style={styles.bubble}>
              Goed. We beginnen met <strong style={{ color: "#e91e63" }}>paper trading</strong> — dat is oefenen met nep-geld maar echte marktprijzen.
            </p>
            <p style={styles.bubble}>
              Je krijgt €10.000 startkapitaal. Maak fouten, leer ervan. Geen echt geld op het spel.
            </p>
            <div style={styles.capitalBox}>
              <span style={{ fontSize: 12, color: "#bf7a99", textTransform: "uppercase", letterSpacing: "0.06em" }}>Jouw startkapitaal</span>
              <span style={{ fontSize: 32, fontWeight: 800, color: "#e91e63" }}>€10.000</span>
            </div>
          </div>
        )}

        {/* Stap 3 — Eerste opdracht */}
        {step === 3 && (
          <div style={styles.stepContent}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={styles.avatar}>🤖</div>
              <div style={styles.name}>Marcus</div>
            </div>
            <p style={styles.bubble}>
              Ok, je bent er klaar voor. Jouw eerste opdracht:
            </p>
            <div style={styles.assignment}>
              📌 Ga naar <strong>Handelen</strong>, kijk naar de Bitcoin grafiek en zeg mij wat de trend is. Stijgt of daalt hij?
            </div>
            <p style={{ fontSize: 12, color: "#bf7a99", margin: "12px 0 0" }}>
              Geen juist of fout antwoord — ik wil gewoon weten hoe jij de markt ziet.
            </p>
            <div style={styles.ctaRow}>
              <button style={styles.ctaPrimary} onClick={() => goTo("/dashboard")}>
                Start →
              </button>
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} style={{ ...styles.dot, background: i === step ? "#e91e63" : "rgba(233,30,99,0.22)" }} />
          ))}
        </div>

        {/* Nav — alleen stap 0 en 2 hebben een Volgende knop */}
        {(step === 0 || step === 2) && (
          <div style={styles.nav}>
            <button style={{ ...styles.navBtn, opacity: step === 0 ? 0.3 : 1 }} onClick={() => setStep(s => s - 1)} disabled={step === 0}>
              Terug
            </button>
            <button style={styles.navBtnPrimary} onClick={() => setStep(s => s + 1)}>
              Volgende →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(10,3,8,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", backdropFilter: "blur(6px)" },
  card: { position: "relative", width: "100%", maxWidth: "460px", background: "var(--surface, #1f0d17)", border: "1px solid rgba(233,30,99,0.25)", borderRadius: "16px", padding: "32px 28px 24px", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" },
  skipBtn: { position: "absolute", top: "14px", right: "16px", background: "transparent", border: "none", color: "rgba(252,232,240,0.4)", fontSize: "13px", cursor: "pointer", padding: "4px 8px" },
  stepContent: { minHeight: "240px", display: "flex", flexDirection: "column", gap: "14px" },
  avatar: { width: 44, height: 44, borderRadius: "50%", background: "rgba(233,30,99,0.15)", border: "1px solid rgba(233,30,99,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 },
  name: { fontWeight: 700, fontSize: 16, color: "#fce8f0" },
  role: { fontSize: 12, color: "#bf7a99" },
  bubble: { background: "rgba(233,30,99,0.06)", border: "1px solid rgba(233,30,99,0.15)", borderRadius: "0 12px 12px 12px", padding: "12px 16px", fontSize: 14, color: "#fce8f0", lineHeight: 1.6, margin: 0 },
  styleBtn: { display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: "1px solid", borderRadius: "10px", cursor: "pointer", transition: "all 0.15s", width: "100%" },
  capitalBox: { background: "rgba(233,30,99,0.08)", border: "1px solid rgba(233,30,99,0.22)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" },
  assignment: { background: "rgba(233,30,99,0.08)", border: "1px solid rgba(233,30,99,0.3)", borderRadius: "10px", padding: "16px", fontSize: 14, color: "#fce8f0", lineHeight: 1.6 },
  ctaRow: { display: "flex", gap: "12px", marginTop: "8px" },
  ctaPrimary: { flex: 1, background: "#e91e63", color: "#fff", border: "none", borderRadius: "10px", padding: "13px 20px", fontSize: "16px", fontWeight: 700, cursor: "pointer" },
  dots: { display: "flex", justifyContent: "center", gap: "8px", margin: "24px 0 16px" },
  dot: { width: "8px", height: "8px", borderRadius: "50%", transition: "background 0.2s" },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  navBtn: { background: "transparent", border: "1px solid rgba(233,30,99,0.3)", color: "#bf7a99", borderRadius: "8px", padding: "9px 18px", fontSize: "14px", cursor: "pointer" },
  navBtnPrimary: { background: "#e91e63", border: "none", color: "#fff", borderRadius: "8px", padding: "9px 18px", fontSize: "14px", fontWeight: 600, cursor: "pointer" },
};
