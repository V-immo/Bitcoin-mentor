"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Step = {
  id: string;
  icon: string;
  title: string;
  desc: string;
  action: string;
  route: string;
  done: boolean;
};

type ProfileData = {
  tradingMode?: string;
  quizCount?: number;
  tradeCount?: number;
  hasTradingPlan?: boolean;
};

export default function FirstSteps() {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("firststeps-dismissed") === "true") {
      setDismissed(true);
      setLoading(false);
      return;
    }

    Promise.all([
      fetch("/api/me/settings").then(r => r.ok ? r.json() as Promise<{ tradingMode?: string }> : {}),
      fetch("/api/me/trading-plan").then(r => r.ok ? r.json() : null),
      fetch("/api/me/quiz").then(r => r.ok ? r.json() : { xp: 0, history: [] }),
      fetch("/api/me/paper?asset=BTCUSDT").then(r => r.ok ? r.json() : { history: "[]" }),
    ]).then(([settings, plan, quiz, paper]) => {
      const hasPlan = !!(plan?.risk_per_trade || plan?.rules);
      const hasQuiz = (quiz?.xp ?? 0) > 0 || (quiz?.history?.length ?? 0) > 0;
      const hasTrade = (() => {
        try { return JSON.parse(paper?.history ?? "[]").filter((t: {pnl?: number}) => t.pnl != null).length > 0; } catch { return false; }
      })();
      const hasTradingMode = !!(settings?.tradingMode && settings.tradingMode !== "swing");

      const built: Step[] = [
        {
          id: "tradingmode",
          icon: "🎯",
          title: "Kies je tradingstijl",
          desc: "Day trading, swing of long term? Marcus past zijn coaching hier op aan.",
          action: "Instellen →",
          route: "/profiel",
          done: hasTradingMode,
        },
        {
          id: "plan",
          icon: "📋",
          title: "Maak je tradingplan",
          desc: "Vul je regels in: max risico per trade, max dagverlies. Zonder plan gok je.",
          action: "Plan invullen →",
          route: "/profiel",
          done: hasPlan,
        },
        {
          id: "quiz",
          icon: "🎓",
          title: "Doe je eerste quiz",
          desc: "Marcus leert je niveau kennen en past zijn coaching direct aan.",
          action: "Quiz starten →",
          route: "/leren",
          done: hasQuiz,
        },
        {
          id: "trade",
          icon: "📈",
          title: "Open je eerste paper trade",
          desc: "Echt handelen met nep-geld. Geen risico — wel echte ervaring.",
          action: "Paper trade →",
          route: "/trade",
          done: hasTrade,
        },
      ];

      setSteps(built);

      // Automatisch verbergen als alles gedaan is
      if (built.every(s => s.done)) {
        localStorage.setItem("firststeps-dismissed", "true");
        setDismissed(true);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function dismiss() {
    localStorage.setItem("firststeps-dismissed", "true");
    setDismissed(true);
  }

  if (loading || dismissed) return null;

  const doneCount = steps.filter(s => s.done).length;
  const total = steps.length;
  const pct = Math.round((doneCount / total) * 100);
  const nextStep = steps.find(s => !s.done);

  return (
    <div style={{
      background: "var(--surface, #1f0d17)",
      border: "1px solid rgba(233,30,99,0.25)",
      borderRadius: 16, overflow: "hidden",
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px",
        background: "linear-gradient(135deg, rgba(233,30,99,0.12) 0%, transparent 60%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: "rgba(233,30,99,0.15)", border: "2px solid rgba(233,30,99,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "#e91e63",
          }}>M</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary, #fce8f0)" }}>
              Eerste stappen met Marcus
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
              {doneCount}/{total} voltooid · doe dit eerst voor de beste ervaring
            </div>
          </div>
        </div>
        <button
          onClick={dismiss}
          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }}
          title="Verbergen"
        >×</button>
      </div>

      {/* Voortgangsbalk */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.05)" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: "linear-gradient(90deg, #e91e63, #f59e0b)",
          transition: "width 0.6s ease",
        }} />
      </div>

      {/* Marcus boodschap */}
      {nextStep && (
        <div style={{
          padding: "10px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          display: "flex", gap: 8, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>🤖</span>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-primary, #fce8f0)", lineHeight: 1.6 }}>
            {doneCount === 0
              ? `Begin met "${nextStep.title}" — dat is stap 1. Zonder dit kan ik je niet goed coachen.`
              : doneCount === 1
              ? `Goed bezig. Nu "${nextStep.title}" — dan ken ik je niveau en kan ik écht helpen.`
              : `Nog ${total - doneCount} stap${total - doneCount > 1 ? "pen" : ""} en je bent volledig ingesteld.`
            }
          </p>
        </div>
      )}

      {/* Stappen */}
      <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((step, i) => (
          <div
            key={step.id}
            onClick={() => !step.done && router.push(step.route)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: 12,
              background: step.done
                ? "rgba(34,197,94,0.05)"
                : i === steps.findIndex(s => !s.done)
                  ? "rgba(233,30,99,0.06)"
                  : "rgba(255,255,255,0.02)",
              border: `1px solid ${step.done
                ? "rgba(34,197,94,0.15)"
                : i === steps.findIndex(s => !s.done)
                  ? "rgba(233,30,99,0.2)"
                  : "rgba(255,255,255,0.05)"}`,
              cursor: step.done ? "default" : "pointer",
              opacity: !step.done && i > steps.findIndex(s => !s.done) ? 0.5 : 1,
              transition: "all 0.15s",
            }}
          >
            {/* Check of nummer */}
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: step.done
                ? "rgba(34,197,94,0.15)"
                : "rgba(255,255,255,0.05)",
              border: `1px solid ${step.done ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
              fontSize: step.done ? 14 : 12,
              fontWeight: 700,
              color: step.done ? "#22c55e" : "#64748b",
            }}>
              {step.done ? "✓" : i + 1}
            </div>

            <span style={{ fontSize: 18, flexShrink: 0 }}>{step.icon}</span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: step.done ? "#64748b" : "var(--text-primary, #fce8f0)",
                textDecoration: step.done ? "line-through" : "none",
              }}>
                {step.title}
              </div>
              {!step.done && (
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
                  {step.desc}
                </div>
              )}
            </div>

            {!step.done && i === steps.findIndex(s => !s.done) && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: "#e91e63",
                flexShrink: 0, whiteSpace: "nowrap",
              }}>
                {step.action}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
