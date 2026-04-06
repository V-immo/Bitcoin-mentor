"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

type RegionData = {
  country: string;
  countryCode: string;
  suggestedCurrency: "EUR" | "USD";
  suggestedExchange: "bitvavo" | "bybit";
  detected: boolean;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [capital, setCapital] = useState("1000");
  const [saving, setSaving] = useState(false);

  // Regio detectie
  const [region, setRegion] = useState<RegionData | null>(null);
  const [currency, setCurrency] = useState<"EUR" | "USD">("EUR");
  const [regionLoading, setRegionLoading] = useState(false);

  const TOTAL_STEPS = 5;

  // Detecteer regio bij stap 1
  useEffect(() => {
    if (step === 1 && !region) {
      setRegionLoading(true);
      fetch("/api/me/detect-region")
        .then(r => r.ok ? r.json() : null)
        .then((d: RegionData | null) => {
          if (d) {
            setRegion(d);
            setCurrency(d.suggestedCurrency);
          }
          setRegionLoading(false);
        })
        .catch(() => setRegionLoading(false));
    }
  }, [step, region]);

  async function next() {
    if (step === 1) {
      // Sla valutakeuze op
      await fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredCurrency: currency }),
      });
      setStep(s => s + 1);
      return;
    }
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
      setStep(s => s + 1);
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

  const exchangeInfo = {
    bitvavo: { name: "Bitvavo", flag: "🇪🇺", desc: "EU-gereguleerd · EUR-paren · ideaal voor Europese traders" },
    bybit:   { name: "Bybit",   flag: "🌍", desc: "Globaal beschikbaar · USDT-paren · lage fees" },
  };

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

        {/* Stap 0: Marcus intro */}
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

        {/* Stap 1: Regio + valuta */}
        {step === 1 && (
          <div className="onboarding-step">
            <div className="onboarding-icon">🌍</div>
            <h1 className="onboarding-title">Jouw regio</h1>
            <p className="onboarding-subtitle">
              Marcus past zijn aanbevelingen aan op jouw locatie — juiste valuta, juiste exchange.
            </p>

            {regionLoading ? (
              <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 14, padding: "20px 0" }}>
                Regio detecteren…
              </div>
            ) : (
              <>
                {region?.detected && region.country && (
                  <div style={{ textAlign: "center", fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
                    📍 We zien dat je uit <strong style={{ color: "var(--text)" }}>{region.country}</strong> verbindt
                  </div>
                )}

                {/* Valuta keuze */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>Jouw valuta</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["EUR", "USD"] as const).map(c => (
                      <button
                        key={c}
                        onClick={() => setCurrency(c)}
                        style={{
                          flex: 1, padding: "12px 0", borderRadius: 10, fontWeight: 700,
                          fontSize: 15, cursor: "pointer", border: "2px solid",
                          borderColor: currency === c ? "var(--accent)" : "var(--border)",
                          background: currency === c ? "var(--accent)" : "var(--surface-2)",
                          color: currency === c ? "#fff" : "var(--text-secondary)",
                          transition: "all 0.15s",
                        }}
                      >
                        {c === "EUR" ? "🇪🇺 EUR" : "🇺🇸 USD"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exchange aanbeveling */}
                <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "12px 14px", marginBottom: 20, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, fontWeight: 600 }}>Aanbevolen exchange</div>
                  {(() => {
                    const ex = exchangeInfo[currency === "EUR" ? "bitvavo" : "bybit"];
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{ex.flag}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{ex.name}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>{ex.desc}</div>
                        </div>
                      </div>
                    );
                  })()}
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
                    Je kunt dit later wijzigen in Instellingen.
                  </div>
                </div>
              </>
            )}

            <button className="login-btn onboarding-btn" onClick={next} disabled={regionLoading}>
              Doorgaan
            </button>
          </div>
        )}

        {/* Stap 2: Learning path */}
        {step === 2 && (
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

        {/* Stap 3: App features */}
        {step === 3 && (
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

        {/* Stap 4: Kapitaal + finish */}
        {step === 4 && (
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

        {/* Terug knop */}
        {step > 0 && (
          <button className="onboarding-back-btn" onClick={() => setStep(s => s - 1)}>
            ← {t("back")}
          </button>
        )}
      </div>
    </div>
  );
}
