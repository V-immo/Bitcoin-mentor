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

type TradingMode = "day" | "swing" | "long";

const TRADING_MODES: { id: TradingMode; icon: string; label: string; desc: string; tip: string }[] = [
  {
    id: "day",
    icon: "▲",
    label: "Day Trading",
    desc: "Trades open en sluit je dezelfde dag",
    tip: "Elke dag actief, snelle beslissingen, strakke stops. Geschikt als je dagelijks tijd hebt.",
  },
  {
    id: "swing",
    icon: "↔",
    label: "Swing Trading",
    desc: "Posities houd je 2 tot 14 dagen aan",
    tip: "Minder stress dan day trading. Je hoeft niet elke minuut te kijken. Populair voor beginners.",
  },
  {
    id: "long",
    icon: "→",
    label: "Long Term",
    desc: "Investeren voor weken tot maanden",
    tip: "Geduld is je voordeel. Minder trades, meer rust. Fundamentals tellen meer dan korte bewegingen.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [capital, setCapital] = useState("1000");
  const [saving, setSaving] = useState(false);

  // Stap 1: regio
  const [region, setRegion] = useState<RegionData | null>(null);
  const [currency, setCurrency] = useState<"EUR" | "USD">("EUR");
  const [regionLoading, setRegionLoading] = useState(false);

  // Stap 2: tradingstijl
  const [tradingMode, setTradingMode] = useState<TradingMode>("swing");

  // Stap 3: basisplan
  const [maxRisk, setMaxRisk] = useState("1");
  const [maxDailyLoss, setMaxDailyLoss] = useState("3");

  const TOTAL_STEPS = 6;

  useEffect(() => {
    if (step === 1 && !region) {
      setRegionLoading(true);
      fetch("/api/me/detect-region")
        .then(r => r.ok ? r.json() : null)
        .then((d: RegionData | null) => {
          if (d) { setRegion(d); setCurrency(d.suggestedCurrency); }
          setRegionLoading(false);
        })
        .catch(() => setRegionLoading(false));
    }
  }, [step, region]);

  async function next() {
    // Stap 1: valuta opslaan
    if (step === 1) {
      await fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredCurrency: currency }),
      });
      setStep(s => s + 1);
      return;
    }

    // Stap 2: tradingstijl opslaan
    if (step === 2) {
      await fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradingMode }),
      });
      setStep(s => s + 1);
      return;
    }

    // Stap 3: basisplan opslaan
    if (step === 3) {
      await fetch("/api/me/trading-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          risk_per_trade: parseFloat(maxRisk) || 1,
          max_daily_loss: parseFloat(maxDailyLoss) || 3,
        }),
      });
      setStep(s => s + 1);
      return;
    }

    // Laatste stap: kapitaal opslaan + door naar dashboard
    if (step === TOTAL_STEPS - 1) {
      setSaving(true);
      await fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startCapital: parseFloat(capital) || 1000 }),
      });
      setSaving(false);
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setStep(s => s + 1);
  }

  const exchangeInfo = {
    bitvavo: { name: "Bitvavo", flag: "EU", desc: "EU-gereguleerd · EUR-paren · ideaal voor Europese traders" },
    bybit:   { name: "Bybit",   flag: "Global", desc: "Globaal beschikbaar · USDT-paren · lage fees" },
  };

  return (
    <div className="login-page">
      <div className="login-card onboarding-card">
        {/* Progress dots */}
        <div className="onboarding-progress">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`onboarding-dot${i === step ? " active" : i < step ? " done" : ""}`} />
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
            <div className="onboarding-icon">◉</div>
            <h1 className="onboarding-title">Jouw regio</h1>
            <p className="onboarding-subtitle">Marcus past zijn aanbevelingen aan op jouw locatie.</p>
            {regionLoading ? (
              <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 14, padding: "20px 0" }}>
                Regio detecteren…
              </div>
            ) : (
              <>
                {region?.detected && region.country && (
                  <div style={{ textAlign: "center", fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
                    We zien dat je uit <strong style={{ color: "var(--text)" }}>{region.country}</strong> verbindt
                  </div>
                )}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>Jouw valuta</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["EUR", "USD"] as const).map(c => (
                      <button key={c} onClick={() => setCurrency(c)} style={{
                        flex: 1, padding: "12px 0", borderRadius: 10, fontWeight: 700,
                        fontSize: 15, cursor: "pointer", border: "2px solid",
                        borderColor: currency === c ? "var(--accent)" : "var(--border)",
                        background: currency === c ? "var(--accent)" : "var(--surface-2)",
                        color: currency === c ? "#fff" : "var(--text-secondary)",
                        transition: "all 0.15s",
                      }}>
                        {c === "EUR" ? "EUR" : "USD"}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "12px 14px", marginBottom: 20, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, fontWeight: 600 }}>Aanbevolen exchange</div>
                  {(() => {
                    const ex = exchangeInfo[currency === "EUR" ? "bitvavo" : "bybit"];
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{ex.flag}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{ex.name}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{ex.desc}</div>
                        </div>
                      </div>
                    );
                  })()}
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Je kunt dit later wijzigen in Instellingen.</div>
                </div>
              </>
            )}
            <button className="login-btn onboarding-btn" onClick={next} disabled={regionLoading}>Doorgaan</button>
          </div>
        )}

        {/* Stap 2: Tradingstijl kiezen */}
        {step === 2 && (
          <div className="onboarding-step">
            <div className="onboarding-avatar marcus-avatar-m" style={{ width: 48, height: 48, fontSize: 22, margin: "0 auto 10px" }}>M</div>
            <h1 className="onboarding-title">Hoe wil jij traden?</h1>
            <div className="onboarding-speech-bubble" style={{ marginBottom: 20 }}>
              <p className="onboarding-body">
                Dit is de belangrijkste keuze nu. Kies eerlijk — niet wat stoer klinkt, maar wat bij jouw leven past. Ik pas mijn coaching hier volledig op aan.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {TRADING_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setTradingMode(m.id)}
                  style={{
                    textAlign: "left", padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                    border: `2px solid ${tradingMode === m.id ? "var(--accent, #e91e63)" : "var(--border)"}`,
                    background: tradingMode === m.id ? "rgba(233,30,99,0.08)" : "var(--surface-2)",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 20 }}>{m.icon}</span>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{m.label}</div>
                    {tradingMode === m.id && <span style={{ marginLeft: "auto", color: "var(--accent, #e91e63)", fontSize: 16 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 30 }}>{m.desc}</div>
                  {tradingMode === m.id && (
                    <div style={{ fontSize: 11, color: "var(--accent, #e91e63)", marginLeft: 30, marginTop: 6, lineHeight: 1.5 }}>
                      {m.tip}
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button className="login-btn onboarding-btn" onClick={next}>Dit past bij mij →</button>
          </div>
        )}

        {/* Stap 3: Basisregels */}
        {step === 3 && (
          <div className="onboarding-step">
            <div className="onboarding-avatar marcus-avatar-m" style={{ width: 48, height: 48, fontSize: 22, margin: "0 auto 10px" }}>M</div>
            <h1 className="onboarding-title">Twee regels die alles bepalen</h1>
            <div className="onboarding-speech-bubble" style={{ marginBottom: 20 }}>
              <p className="onboarding-body">
                Traders gaan niet failliet aan slechte trades — ze gaan failliet omdat ze geen limieten hadden. Stel dit nu in. Je kunt het later altijd aanpassen.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 6 }}>
                  Max risico per trade
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["0.5", "1", "2", "3"].map(v => (
                    <button
                      key={v}
                      onClick={() => setMaxRisk(v)}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer",
                        fontWeight: 700, fontSize: 14,
                        border: `2px solid ${maxRisk === v ? "var(--accent, #e91e63)" : "var(--border)"}`,
                        background: maxRisk === v ? "rgba(233,30,99,0.1)" : "var(--surface-2)",
                        color: maxRisk === v ? "var(--accent, #e91e63)" : "var(--text-secondary)",
                      }}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>
                  Bij €1.000 kapitaal is {maxRisk}% = €{(parseFloat(maxRisk) * 10).toFixed(0)} max verlies per trade.
                </p>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 6 }}>
                  Max dagverlies (daarna stoppen)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["2", "3", "5", "10"].map(v => (
                    <button
                      key={v}
                      onClick={() => setMaxDailyLoss(v)}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer",
                        fontWeight: 700, fontSize: 14,
                        border: `2px solid ${maxDailyLoss === v ? "var(--accent, #e91e63)" : "var(--border)"}`,
                        background: maxDailyLoss === v ? "rgba(233,30,99,0.1)" : "var(--surface-2)",
                        color: maxDailyLoss === v ? "var(--accent, #e91e63)" : "var(--text-secondary)",
                      }}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>
                  Marcus waarschuwt je als je dit daglimiet bereikt.
                </p>
              </div>
            </div>
            <button className="login-btn onboarding-btn" onClick={next}>Regels instellen →</button>
          </div>
        )}

        {/* Stap 4: App overzicht */}
        {step === 4 && (
          <div className="onboarding-step">
            <div className="onboarding-icon">◉</div>
            <h1 className="onboarding-title">{t("onboarding_app_title")}</h1>
            <p className="onboarding-subtitle">{t("onboarding_app_subtitle")}</p>
            <div className="onboarding-features">
              {[
                { icon: "≡", label: "Dashboard", desc: "Dagelijkse briefing en marktoverzicht" },
                { icon: "▲", label: "Scanner", desc: "Welke assets zijn klaar voor een setup?" },
                { icon: "↑", label: "Paper Trade", desc: "Handel met nepgeld — leer zonder risico" },
                { icon: "★", label: "Leren", desc: "Dagelijkse quizzes op jouw niveau" },
              ].map(f => (
                <div key={f.label} className="onboarding-feature-item">
                  <span className="onboarding-feature-icon">{f.icon}</span>
                  <div>
                    <div className="onboarding-feature-label">{f.label}</div>
                    <div className="onboarding-feature-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="login-btn onboarding-btn" onClick={next}>{t("onboarding_app_cta")}</button>
          </div>
        )}

        {/* Stap 5: Kapitaal + afronden */}
        {step === 5 && (
          <div className="onboarding-step">
            <div className="onboarding-avatar marcus-avatar-m" style={{ width: 48, height: 48, fontSize: 22, margin: "0 auto 10px" }}>M</div>
            <h1 className="onboarding-title">Startkapitaal instellen</h1>
            <div className="onboarding-speech-bubble" style={{ marginBottom: 20 }}>
              <p className="onboarding-body">
                Dit is het bedrag waarmee je begint te oefenen. Ik gebruik dit om je risico-berekeningen te personaliseren. Je kunt niks kwijtraken — dit is alleen voor paper trading.
              </p>
            </div>
            <div className="login-field" style={{ marginBottom: 8 }}>
              <label className="login-label">{t("onboarding_capital_label")}</label>
              <input
                className="login-input"
                type="number" min={100} max={1000000}
                value={capital}
                onChange={e => setCapital(e.target.value)}
                placeholder="bijv. 1000"
              />
              <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>
                Nep-geld. Geen risico. Marcus berekent je posities op basis van dit bedrag.
              </p>
            </div>
            <button className="login-btn onboarding-btn onboarding-btn-primary" onClick={next} disabled={saving}>
              {saving ? "…" : "Starten met Marcus →"}
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
