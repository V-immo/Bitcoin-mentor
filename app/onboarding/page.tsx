"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [capital, setCapital] = useState("1000");
  const [saving, setSaving] = useState(false);

  const STEPS = [
    {
      icon: "₿",
      title: t("onboarding_welcome_title"),
      subtitle: t("onboarding_welcome_subtitle"),
      body: t("onboarding_welcome_body"),
      cta: t("onboarding_welcome_cta"),
    },
    {
      icon: "📊",
      title: t("onboarding_how_title"),
      subtitle: t("onboarding_how_subtitle"),
      items: [
        { icon: "⚡", label: t("onboarding_feature_scanner"), desc: t("onboarding_feature_scanner_desc") },
        { icon: "📈", label: t("onboarding_feature_trade"),   desc: t("onboarding_feature_trade_desc") },
        { icon: "🎓", label: t("onboarding_feature_learn"),   desc: t("onboarding_feature_learn_desc") },
        { icon: "📊", label: t("onboarding_feature_stats"),   desc: t("onboarding_feature_stats_desc") },
      ],
      cta: t("onboarding_how_cta"),
    },
    {
      icon: "🎯",
      title: t("onboarding_goal_title"),
      subtitle: t("onboarding_goal_subtitle"),
      body: t("onboarding_goal_body"),
      cta: t("onboarding_goal_cta"),
      hasCapital: true,
    },
  ];

  async function next() {
    if (step === STEPS.length - 1) {
      setSaving(true);
      await fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startCapital: parseFloat(capital) || 1000 }),
      });
      setSaving(false);
      router.push("/");
      router.refresh();
    } else {
      setStep((s) => s + 1);
    }
  }

  const s = STEPS[step];

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 480 }}>
        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i <= step ? "var(--primary)" : "rgba(255,255,255,0.15)",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        <div style={{ textAlign: "center", fontSize: 48, marginBottom: 12 }}>{s.icon}</div>
        <div className="login-title" style={{ marginBottom: 4 }}>{s.title}</div>
        <p style={{ textAlign: "center", color: "var(--primary)", fontSize: 13, marginBottom: 16, fontWeight: 600 }}>{s.subtitle}</p>

        {s.body && (
          <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            {s.body}
          </p>
        )}

        {s.items && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {s.items.map((item) => (
              <div key={item.label} style={{
                display: "flex", gap: 12, alignItems: "center",
                background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 14px",
              }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {s.hasCapital && (
          <div className="login-field" style={{ marginBottom: 20 }}>
            <label className="login-label">{t("onboarding_capital_label")}</label>
            <input
              className="login-input"
              type="number"
              min={100}
              max={1000000}
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              placeholder={t("onboarding_capital_placeholder")}
            />
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>
              {t("onboarding_capital_hint")}
            </p>
          </div>
        )}

        <button className="login-btn" onClick={next} disabled={saving}>
          {saving ? t("saving") : s.cta}
        </button>

        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}
          >
            {t("back")}
          </button>
        )}
      </div>
    </div>
  );
}
