"use client";

import { useEffect, useState } from "react";
import { usePushNotifications } from "@/lib/usePushNotifications";
import { useLanguage } from "@/contexts/LanguageContext";

type TradingMode = "day" | "swing" | "long";
type RiskLevel = "low" | "medium" | "high";

type Settings = {
  tradingMode: TradingMode;
  riskLevel: RiskLevel;
  startCapital: number;
  preferredAssets: string[];
  aiLanguage: "nl" | "en";
  bitvavoApiKey?: string;
  bitvavoApiSecret?: string;
};

const DEFAULT_SETTINGS: Settings = {
  tradingMode: "swing",
  riskLevel: "medium",
  startCapital: 10000,
  preferredAssets: ["BTCUSDT", "ETHUSDT"],
  aiLanguage: "nl",
};

const TRADING_MODE_KEYS: TradingMode[] = ["day", "swing", "long"];
const RISK_LEVEL_KEYS: { key: RiskLevel; color: string }[] = [
  { key: "low",    color: "#26c57c" },
  { key: "medium", color: "#f59e0b" },
  { key: "high",   color: "#ef4444" },
];

export default function SettingsPanel() {
  const { lang, setLang, t } = useLanguage();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Bitvavo
  const [bitvavoKey, setBitvavoKey] = useState("");
  const [bitvavoSecret, setBitvavoSecret] = useState("");
  const [bitvavoSaved, setBitvavoSaved] = useState(false);
  const [bitvavoBalance, setBitvavoBalance] = useState<{ symbol: string; available: string }[] | null>(null);
  const [bitvavoConnected, setBitvavoConnected] = useState<boolean | null>(null);
  const [bitvavoChecking, setBitvavoChecking] = useState(false);
  const [bitvavoSaving, setBitvavoSaving] = useState(false);

  const push = usePushNotifications();

  // Wachtwoord wijzigen
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  // Laad instellingen + check Bitvavo status vanuit DB
  useEffect(() => {
    fetch("/api/me/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setSettings({ ...DEFAULT_SETTINGS, ...data });
      })
      .catch(() => {/* gebruik defaults */})
      .finally(() => setLoading(false));

    // Check of Bitvavo al gekoppeld is
    fetch("/api/bitvavo/balance")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.connected) {
          setBitvavoConnected(true);
          const nonZero = (data.balance ?? []).filter((b: { available: string }) => parseFloat(b.available) > 0);
          setBitvavoBalance(nonZero);
        } else {
          setBitvavoConnected(false);
        }
      })
      .catch(() => setBitvavoConnected(false));
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function saveLanguage(l: "nl" | "en") {
    setSettings((prev) => ({ ...prev, aiLanguage: l }));
    setLang(l); // schakelt hele app om + slaat op in DB
  }

  async function save() {
    const res = await fetch("/api/me/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (loading) {
    return <div className="settings-panels"><div className="settings-loading">{t("settings_loading")}</div></div>;
  }

  return (
    <div className="settings-panels">

      {/* Trading modus */}
      <section className="settings-card">
        <div className="settings-card-title">{t("settings_title_trading_mode")}</div>
        <div className="settings-card-desc">{t("settings_desc_trading_mode")}</div>
        <div className="settings-options">
          {TRADING_MODE_KEYS.map((key) => (
            <button
              key={key}
              className={`settings-option${settings.tradingMode === key ? " active" : ""}`}
              onClick={() => update("tradingMode", key)}
            >
              <div className="settings-option-title">{t(`settings_${key === "day" ? "day_trade" : key === "swing" ? "swing_trade" : "long_term"}` as Parameters<typeof t>[0])}</div>
              <div className="settings-option-desc">{t(`settings_${key === "day" ? "day_trade" : key === "swing" ? "swing_trade" : "long_term"}_desc` as Parameters<typeof t>[0])}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Risico niveau */}
      <section className="settings-card">
        <div className="settings-card-title">{t("settings_title_risk")}</div>
        <div className="settings-card-desc">{t("settings_desc_risk")}</div>
        <div className="settings-options settings-options-3">
          {RISK_LEVEL_KEYS.map((r) => (
            <button
              key={r.key}
              className={`settings-option${settings.riskLevel === r.key ? " active" : ""}`}
              onClick={() => update("riskLevel", r.key)}
              style={settings.riskLevel === r.key ? { borderColor: r.color, background: `${r.color}15` } : {}}
            >
              <div className="settings-option-title" style={settings.riskLevel === r.key ? { color: r.color } : {}}>
                {t(`settings_risk_${r.key}` as Parameters<typeof t>[0])}
              </div>
              <div className="settings-option-desc">{t(`settings_risk_${r.key}_pct` as Parameters<typeof t>[0])}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Start kapitaal — alleen lezen, door admin ingesteld */}
      <section className="settings-card">
        <div className="settings-card-title">{t("settings_title_capital")}</div>
        <div className="settings-card-desc">{t("settings_desc_capital")}</div>
        <div className="settings-capital-wrap">
          <div className="settings-capital-prefix">€</div>
          <input
            className="terminal-terminal-input settings-capital-input"
            type="number"
            value={settings.startCapital}
            readOnly
            disabled
          />
        </div>
        <div className="settings-hint">{t("settings_capital_hint")}</div>
      </section>

      {/* AI taal */}
      <section className="settings-card">
        <div className="settings-card-title">{t("settings_title_language")}</div>
        <div className="settings-card-desc">{t("settings_desc_language")}</div>
        <div className="settings-options settings-options-2">
          <button
            className={`settings-option${lang === "nl" ? " active" : ""}`}
            onClick={() => saveLanguage("nl")}
          >
            <div className="settings-option-title">{t("lang_nl")}</div>
          </button>
          <button
            className={`settings-option${lang === "en" ? " active" : ""}`}
            onClick={() => saveLanguage("en")}
          >
            <div className="settings-option-title">{t("lang_en")}</div>
          </button>
        </div>
      </section>

      {/* Opslaan */}
      <div className="settings-actions">
        <button className="terminal-btn terminal-btn-primary" onClick={save}>
          {saved ? t("saved") : t("settings_save_btn")}
        </button>
      </div>

      {/* Bitvavo koppeling */}
      <section className="settings-card">
        <div className="settings-card-title">{t("settings_title_bitvavo")}</div>
        <div className="settings-card-desc">{t("settings_desc_bitvavo")}</div>

        {bitvavoConnected === true && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8 }}>
            <div style={{ color: "#86efac", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("settings_bitvavo_connected")}</div>
            {bitvavoBalance && bitvavoBalance.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {bitvavoBalance.map((b) => (
                  <span key={b.symbol} style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 6, padding: "3px 10px", fontSize: 13, color: "#86efac" }}>
                    {b.symbol}: {parseFloat(b.available).toFixed(4)}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: "#86efac", fontSize: 13 }}>{t("settings_bitvavo_no_balance")}</div>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>API Key</label>
            <input
              type="text"
              value={bitvavoKey}
              onChange={e => setBitvavoKey(e.target.value)}
              placeholder={bitvavoConnected ? "••••••••••••••••" : t("settings_bitvavo_key_placeholder")}
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14 }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>API Secret</label>
            <input
              type="password"
              value={bitvavoSecret}
              onChange={e => setBitvavoSecret(e.target.value)}
              placeholder={bitvavoConnected ? "••••••••••••••••" : t("settings_bitvavo_secret_placeholder")}
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14 }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="terminal-btn terminal-btn-primary"
              disabled={bitvavoSaving || (!bitvavoKey && !bitvavoSecret)}
              style={{ alignSelf: "flex-start" }}
              onClick={async () => {
                if (!bitvavoKey || !bitvavoSecret) return;
                setBitvavoSaving(true);
                // Sla keys op via settings API
                await fetch("/api/me/settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...settings, bitvavoApiKey: bitvavoKey, bitvavoApiSecret: bitvavoSecret }),
                });
                // Test de verbinding
                setBitvavoChecking(true);
                const res = await fetch("/api/bitvavo/balance");
                const data = await res.json();
                if (data?.connected) {
                  setBitvavoConnected(true);
                  const nonZero = (data.balance ?? []).filter((b: { available: string }) => parseFloat(b.available) > 0);
                  setBitvavoBalance(nonZero);
                  setBitvavoSaved(true);
                  setTimeout(() => setBitvavoSaved(false), 3000);
                  setBitvavoKey(""); setBitvavoSecret("");
                } else {
                  setBitvavoConnected(false);
                  alert(data.error ?? t("settings_bitvavo_error"));
                }
                setBitvavoSaving(false);
                setBitvavoChecking(false);
              }}
            >
              {bitvavoSaving ? (bitvavoChecking ? t("settings_bitvavo_testing") : t("settings_bitvavo_saving")) : bitvavoSaved ? t("settings_bitvavo_connected_btn") : t("settings_bitvavo_save_test")}
            </button>
            {bitvavoConnected && (
              <button
                className="terminal-btn terminal-btn-muted"
                onClick={async () => {
                  setBitvavoChecking(true);
                  const res = await fetch("/api/bitvavo/balance");
                  const data = await res.json();
                  if (data?.connected) {
                    const nonZero = (data.balance ?? []).filter((b: { available: string }) => parseFloat(b.available) > 0);
                    setBitvavoBalance(nonZero);
                  }
                  setBitvavoChecking(false);
                }}
              >
                {bitvavoChecking ? t("settings_bitvavo_loading") : t("settings_bitvavo_refresh")}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Wachtwoord wijzigen */}
      <section className="settings-card">
        <div className="settings-card-title">{t("settings_title_password")}</div>
        <div className="settings-card-desc">{t("settings_desc_password")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("settings_pw_current")}</label>
            <input
              type="password"
              value={pwCurrent}
              onChange={e => setPwCurrent(e.target.value)}
              style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14,
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("settings_pw_new")}</label>
            <input
              type="password"
              value={pwNew}
              onChange={e => setPwNew(e.target.value)}
              style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14,
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("settings_pw_confirm")}</label>
            <input
              type="password"
              value={pwConfirm}
              onChange={e => setPwConfirm(e.target.value)}
              style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14,
              }}
            />
          </div>
          {pwMsg && (
            <div style={{
              padding: "8px 12px", borderRadius: 8, fontSize: 13,
              background: pwMsg.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              color: pwMsg.ok ? "#86efac" : "#fca5a5",
              border: `1px solid ${pwMsg.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}>
              {pwMsg.text}
            </div>
          )}
          <button
            className="terminal-btn terminal-btn-primary"
            disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
            onClick={async () => {
              if (pwNew !== pwConfirm) {
                setPwMsg({ ok: false, text: t("settings_pw_mismatch") });
                return;
              }
              if (pwNew.length < 8) {
                setPwMsg({ ok: false, text: t("settings_pw_too_short") });
                return;
              }
              setPwSaving(true);
              setPwMsg(null);
              const res = await fetch("/api/me/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
              });
              const data = await res.json();
              if (res.ok) {
                setPwMsg({ ok: true, text: t("settings_pw_success") });
                setPwCurrent(""); setPwNew(""); setPwConfirm("");
              } else {
                setPwMsg({ ok: false, text: data.error ?? t("settings_pw_error") });
              }
              setPwSaving(false);
            }}
            style={{ alignSelf: "flex-start" }}
          >
            {pwSaving ? t("settings_pw_saving") : t("settings_pw_btn")}
          </button>
        </div>
      </section>

      {/* Push notificaties */}
      {push.supported && (
        <section className="settings-card">
          <div className="settings-card-title">{t("settings_title_push")}</div>
          <div className="settings-card-desc">
            {t("settings_desc_push")}
          </div>
          {push.subscribed ? (
            <div>
              <div style={{ color: "#86efac", fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
                {t("settings_push_enabled")}
              </div>
              <button
                className="admin-btn"
                onClick={push.unsubscribe}
                disabled={push.loading}
                style={{ fontSize: 13 }}
              >
                {push.loading ? t("settings_push_busy") : t("settings_push_disable")}
              </button>
            </div>
          ) : (
            <button
              className="admin-btn admin-btn-primary"
              onClick={push.subscribe}
              disabled={push.loading}
            >
              {push.loading ? t("settings_push_busy") : t("settings_push_enable")}
            </button>
          )}
        </section>
      )}

    </div>
  );
}
