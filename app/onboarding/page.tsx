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

  const TOTAL_STEPS = 4;

  async function next() {
    if (step === TOTAL_STEPS - 1) {
      setSaving(true);
      await fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startCapital: parseFloat(capital) || 1000 }),
      });
      setSaving(false);
      router.push("/leren");
      router.refresh();
    } else {
      setStep((s) => s + 1);
    }
  }

  const PATH_STEPS = [
    { icon: "🎓", label: t("onboarding_path_step1"), desc: t("onboarding_path_step1_desc") },
    { icon: "👤", label: t("onboarding_path_step2"), desc: t("onboarding_path_step2_desc") },
    { icon: "📈", label: t("onboarding_path_step3"), desc: t("onboarding_path_step3_desc") },
    { icon: "🎯", label: t("onboarding_path_step4"), desc: t("onboarding_path_step4_desc") },
  ];

  const APP_FEATURES = [
    { icon: "⚡", label: t("onboarding_feature_scanner"), desc: t("onboarding_feature_scanner_desc") },
    { icon: "📈", label: t("onboarding_feature_trade"),   desc: t("onboarding_feature_trade_desc") },
    { icon: "🎓", label: t("onboarding_feature_learn"),   desc: t("onboarding_feature_learn_desc") },
    { icon: "📊", label: t("onboarding_feature_stats"),   desc: t("onboarding_feature_stats_desc") },
  ];

  return (
    <div className="login-page">
      <div className="login-card onboarding-card">
        {/* Progress dots */}
        <div className="onboarding-progress">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`onboarding-dot${i === step ? " active" : i < step ? " done" : ""}`}
            />
          ))}
        </div>

        {/* Step 1: Marcus intro */}
        {step === 0 && (
          <div className="onboarding-step">
            <div className="onboarding-avatar marcus-avatar-m" style={{ width: 72, height: 72, fontSize: 32, margin: "0 auto 12px" }}>M</div>
            <h1 className="onboarding-title">{t("onboarding_marcus_title")}</h1>
            <p className="onboarding-subtitle">{t("onboarding_marcus_subtitle")}</p>
            <div className="onboarding-speech-bubble">
              <p className="onboarding-body">{t("onboarding_marcus_body1")}</p>
              <p className="onboarding-body" style={{ marginTop: 10 }}>{t("onboarding_marcus_body2")}</p>
            </div>
            <button className="login-btn onboarding-btn" onClick={next}>
              {t("onboarding_marcus_cta")}
            </button>
          </div>
        )}

        {/* Step 2: Learning path */}
        {step === 1 && (
          <div className="onboarding-step">
            <div className="onboarding-icon">🗺️</div>
            <h1 className="onboarding-title">{t("onboarding_path_title")}</h1>
            <p className="onboarding-subtitle">{t("onboarding_path_subtitle")}</p>
            <div className="onboarding-path">
              {PATH_STEPS.map((s, i) => (
                <div key={i} className="onboarding-path-item">
                  <div className="onboarding-path-num">{i + 1}</div>
                  <div className="onboarding-path-icon">{s.icon}</div>
                  <div className="onboarding-path-text">
                    <div className="onboarding-path-label">{s.label}</div>
                    <div className="onboarding-path-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="login-btn onboarding-btn" onClick={next}>
              {t("onboarding_path_cta")}
            </button>
          </div>
        )}

        {/* Step 3: App features */}
        {step === 2 && (
          <div className="onboarding-step">
            <div className="onboarding-icon">📱</div>
            <h1 className="onboarding-title">{t("onboarding_app_title")}</h1>
            <p className="onboarding-subtitle">{t("onboarding_app_subtitle")}</p>
            <div className="onboarding-features">
              {APP_FEATURES.map((f) => (
                <div key={f.label} className="onboarding-feature-item">
                  <span className="onboarding-feature-icon">{f.icon}</span>
                  <div>
                    <div className="onboarding-feature-label">{f.label}</div>
                    <div className="onboarding-feature-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="login-btn onboarding-btn" onClick={next}>
              {t("onboarding_app_cta")}
            </button>
          </div>
        )}

        {/* Step 4: Capital + finish */}
        {step === 3 && (
          <div className="onboarding-step">
            <div className="onboarding-icon">💰</div>
            <h1 className="onboarding-title">{t("onboarding_goal_title")}</h1>
            <p className="onboarding-subtitle">{t("onboarding_goal_subtitle")}</p>
            <p className="onboarding-body" style={{ textAlign: "center", marginBottom: 24 }}>
              {t("onboarding_goal_body")}
            </p>
            <div className="login-field" style={{ marginBottom: 8 }}>
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
            <button className="login-btn onboarding-btn onboarding-btn-primary" onClick={next} disabled={saving}>
              {saving ? "..." : t("onboarding_goal_cta")}
            </button>
          </div>
        )}

        {/* Back button */}
        {step > 0 && (
          <button className="onboarding-back-btn" onClick={() => setStep((s) => s - 1)}>
            ← {t("back")}
          </button>
        )}
      </div>
    </div>
  );
}
