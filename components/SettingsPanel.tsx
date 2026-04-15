"use client";

import { useEffect, useState } from "react";
import { usePushNotifications } from "@/lib/usePushNotifications";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import type { Currency } from "@/contexts/CurrencyContext";

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

type MemoryEntry = { date: string; category: string; content: string };

const TRADING_MODE_KEYS: TradingMode[] = ["day", "swing", "long"];
const RISK_LEVEL_KEYS: { key: RiskLevel; color: string }[] = [
  { key: "low",    color: "var(--green)" },
  { key: "medium", color: "var(--orange)" },
  { key: "high",   color: "var(--red)" },
];

export default function SettingsPanel() {
  const { lang, setLang, t } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  // Initialiseer aiLanguage vanuit context (niet hardcoded "nl" default)
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS, aiLanguage: lang });
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

  // Marcus memory
  const [memoryEntries, setMemoryEntries]   = useState<MemoryEntry[]>([]);
  const [memoryLoading, setMemoryLoading]   = useState(false);
  const [memoryResetting, setMemoryResetting] = useState(false);
  const [memoryLoaded, setMemoryLoaded]     = useState(false);

  // Bybit
  const [bybitKey, setBybitKey]             = useState("");
  const [bybitSecret, setBybitSecret]       = useState("");
  const [bybitConnected, setBybitConnected] = useState<boolean | null>(null);
  const [bybitSaved, setBybitSaved]         = useState(false);
  const [bybitBalance, setBybitBalance]     = useState<{ symbol: string; walletBalance: string }[] | null>(null);
  const [bybitSaving, setBybitSaving]       = useState(false);
  const [bybitChecking, setBybitChecking]   = useState(false);

  // Binance Testnet
  const [testnetKey, setTestnetKey]         = useState("");
  const [testnetSecret, setTestnetSecret]   = useState("");
  const [testnetConnected, setTestnetConnected] = useState<boolean | null>(null);
  const [testnetSaving, setTestnetSaving]   = useState(false);
  const [testnetSaved, setTestnetSaved]     = useState(false);
  const [testnetError, setTestnetError]     = useState<string | null>(null);

  const push = usePushNotifications();

  // 2FA
  const [twoFaEnabled, setTwoFaEnabled] = useState<boolean | null>(null);
  const [twoFaStep, setTwoFaStep] = useState<"idle" | "setup" | "disable">("idle");
  const [twoFaQr, setTwoFaQr] = useState<string | null>(null);
  const [twoFaToken, setTwoFaToken] = useState("");
  const [twoFaError, setTwoFaError] = useState<string | null>(null);
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  // Account verwijderen
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

    // Check Binance Testnet status
    fetch("/api/testnet/balance")
      .then(r => r.ok ? r.json() : null)
      .then(data => setTestnetConnected(!!data?.connected))
      .catch(() => setTestnetConnected(false));

    // Check 2FA status
    fetch("/api/me/2fa/status")
      .then(r => r.ok ? r.json() : null)
      .then(data => setTwoFaEnabled(!!data?.enabled))
      .catch(() => setTwoFaEnabled(false));

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

    // Check of Bybit al gekoppeld is
    fetch("/api/bybit/balance")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.connected) {
          setBybitConnected(true);
          setBybitBalance(data.balance ?? []);
        } else {
          setBybitConnected(false);
        }
      })
      .catch(() => setBybitConnected(false));
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
    // Gebruik altijd de context-taal — nooit de form-state (die start als "nl" default)
    const res = await fetch("/api/me/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, aiLanguage: lang }),
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

        {/* Exchange aanbeveling per trading mode */}
        {(() => {
          const mode = settings.tradingMode;
          const recs: Record<TradingMode, { exchanges: { name: string; tag: string; color: string; reason: string }[]; note: string }> = {
            day: {
              exchanges: [
                { name: "Bybit", tag: t("settings_recommended"), color: "var(--orange)", reason: t("settings_day_bybit_reason") },
                { name: "Kraken Pro", tag: t("settings_alternative"), color: "var(--text-muted)", reason: t("settings_day_kraken_reason") },
              ],
              note: t("settings_day_note"),
            },
            swing: {
              exchanges: [
                { name: "Bitvavo", tag: t("settings_recommended"), color: "var(--green)", reason: t("settings_swing_bitvavo_reason") },
                { name: "Bybit", tag: t("settings_alternative"), color: "var(--orange)", reason: t("settings_swing_bybit_reason") },
              ],
              note: t("settings_swing_note"),
            },
            long: {
              exchanges: [
                { name: "Bitvavo", tag: t("settings_recommended"), color: "var(--green)", reason: t("settings_long_bitvavo_reason") },
                { name: "Kraken", tag: t("settings_alternative"), color: "var(--text-muted)", reason: t("settings_long_kraken_reason") },
              ],
              note: t("settings_long_note"),
            },
          };
          const rec = recs[mode];
          return (
            <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
                {t("settings_exchanges_title")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rec.exchanges.map(ex => (
                  <div key={ex.name} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ background: `${ex.color}20`, border: `1px solid ${ex.color}50`, color: ex.color, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                      {ex.tag}
                    </span>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{ex.name}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 6 }}>{ex.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
                {rec.note}
              </div>
            </div>
          );
        })()}
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

      {/* Valuta weergave */}
      <section className="settings-card">
        <div className="settings-card-title">{t("settings_title_currency")}</div>
        <div className="settings-card-desc">{t("settings_desc_currency")}</div>
        <div className="settings-options settings-options-2">
          {(["EUR", "USD"] as Currency[]).map((c) => (
            <button
              key={c}
              className={`settings-option${currency === c ? " active" : ""}`}
              onClick={() => setCurrency(c)}
            >
              <div className="settings-option-title">{t(c === "EUR" ? "settings_currency_eur" : "settings_currency_usd")}</div>
              <div className="settings-option-desc">{t(c === "EUR" ? "settings_currency_eur_desc" : "settings_currency_usd_desc")}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Opslaan */}
      <div className="settings-actions">
        <button className="terminal-btn terminal-btn-primary" onClick={save}>
          {saved ? t("saved") : t("settings_save_btn")}
        </button>
      </div>

      {/* Marcus geheugen */}
      <section className="settings-card">
        <div className="settings-card-title">Marcus geheugen</div>
        <div className="settings-card-desc">
          Marcus bouwt per sessie een profiel over jou — patronen, emoties, stijl en mijlpalen. Hier zie je wat hij heeft onthouden.
        </div>

        {!memoryLoaded ? (
          <button
            className="terminal-btn terminal-btn-muted"
            style={{ marginTop: 12 }}
            onClick={async () => {
              setMemoryLoading(true);
              const res = await fetch("/api/me/marcus-memory");
              const data = await res.json();
              setMemoryEntries(data.entries ?? []);
              setMemoryLoaded(true);
              setMemoryLoading(false);
            }}
            disabled={memoryLoading}
          >
            {memoryLoading ? "Laden…" : "Bekijk wat Marcus over jou weet"}
          </button>
        ) : memoryEntries.length === 0 ? (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
            Marcus heeft nog niets onthouden. Start een gesprek en hij begint automatisch notities bij te houden.
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {(() => {
              const catColors: Record<string, string> = {
                PATROON: "var(--orange)", ANGST: "var(--red)", STIJL: "#8b5cf6",
                MIJLPAAL: "var(--green)", FOUT: "var(--red)", MEMO: "var(--text-muted)",
              };
              const catLabels: Record<string, string> = {
                PATROON: "Patroon", ANGST: "Emotie", STIJL: "Stijl",
                MIJLPAAL: "Mijlpaal", FOUT: "Aandachtspunt", MEMO: "Notitie",
              };
              return memoryEntries.map((e, i) => {
                const color = catColors[e.category] ?? "var(--text-muted)";
                return (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ background: `${color}20`, border: `1px solid ${color}50`, color, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                      {catLabels[e.category] ?? e.category}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{e.content}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{e.date}</div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {memoryLoaded && memoryEntries.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              Wil je opnieuw beginnen? Marcus vergeet alles en start fresh.
            </div>
            <button
              className="terminal-btn terminal-btn-muted"
              style={{ color: "var(--red)", borderColor: "color-mix(in srgb, var(--red) 30%, transparent)" }}
              disabled={memoryResetting}
              onClick={async () => {
                if (!confirm("Marcus vergeet alles wat hij over jou weet. Zeker?")) return;
                setMemoryResetting(true);
                await fetch("/api/me/marcus-memory", { method: "DELETE" });
                setMemoryEntries([]);
                setMemoryResetting(false);
              }}
            >
              {memoryResetting ? "Resetten…" : "Geheugen wissen"}
            </button>
          </div>
        )}
      </section>

      {/* Bitvavo koppeling */}
      <section className="settings-card">
        <div className="settings-card-title">{t("settings_title_bitvavo")}</div>
        <div className="settings-card-desc">{t("settings_desc_bitvavo")}</div>

        {bitvavoConnected === true && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)", borderRadius: 8 }}>
            <div style={{ color: "var(--green)", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("settings_bitvavo_connected")}</div>
            {bitvavoBalance && bitvavoBalance.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {bitvavoBalance.map((b) => (
                  <span key={b.symbol} style={{ background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 20%, transparent)", borderRadius: 6, padding: "3px 10px", fontSize: 13, color: "var(--green)" }}>
                    {b.symbol}: {parseFloat(b.available).toFixed(4)}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--green)", fontSize: 13 }}>{t("settings_bitvavo_no_balance")}</div>
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

      {/* Bybit koppeling */}
      <section className="settings-card">
        <div className="settings-card-title">Bybit Live Trading</div>
        <div className="settings-card-desc">
          Koppel je Bybit account voor live trading vanuit Bitcoin Mentor. Maak een API key aan op{" "}
          <a href="https://www.bybit.com/app/user/api-management" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            bybit.com/app/user/api-management →
          </a>{" "}
          Zet alleen <strong>Spot Trading</strong> aan. Geen withdrawal-rechten.
        </div>

        {bybitConnected === true && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)", borderRadius: 8 }}>
            <div style={{ color: "var(--green)", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>✅ Bybit gekoppeld</div>
            {bybitBalance && bybitBalance.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {bybitBalance.map((b) => (
                  <span key={b.symbol} style={{ background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 20%, transparent)", borderRadius: 6, padding: "3px 10px", fontSize: 13, color: "var(--green)" }}>
                    {b.symbol}: {parseFloat(b.walletBalance).toFixed(4)}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--green)", fontSize: 13 }}>Geen saldo gevonden</div>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>API Key</label>
            <input
              type="text"
              value={bybitKey}
              onChange={e => setBybitKey(e.target.value)}
              placeholder={bybitConnected ? "••••••••••••••••" : "Plak je Bybit API Key"}
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14 }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>API Secret</label>
            <input
              type="password"
              value={bybitSecret}
              onChange={e => setBybitSecret(e.target.value)}
              placeholder={bybitConnected ? "••••••••••••••••" : "Plak je Bybit API Secret"}
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14 }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="terminal-btn terminal-btn-primary"
              disabled={bybitSaving || (!bybitKey && !bybitSecret)}
              style={{ alignSelf: "flex-start" }}
              onClick={async () => {
                if (!bybitKey || !bybitSecret) return;
                setBybitSaving(true);
                await fetch("/api/me/settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ bybitApiKey: bybitKey, bybitApiSecret: bybitSecret }),
                });
                setBybitChecking(true);
                const res = await fetch("/api/bybit/balance");
                const data = await res.json();
                if (data?.connected) {
                  setBybitConnected(true);
                  setBybitBalance(data.balance ?? []);
                  setBybitSaved(true);
                  setBybitKey(""); setBybitSecret("");
                  setTimeout(() => setBybitSaved(false), 3000);
                } else {
                  setBybitConnected(false);
                  alert(data.error ?? "Verbinding mislukt — controleer je keys");
                }
                setBybitSaving(false);
                setBybitChecking(false);
              }}
            >
              {bybitSaving ? (bybitChecking ? "Testen…" : "Opslaan…") : bybitSaved ? "✅ Gekoppeld!" : "Opslaan & testen"}
            </button>
            {bybitConnected && (
              <button
                className="terminal-btn terminal-btn-muted"
                onClick={async () => {
                  setBybitChecking(true);
                  const res = await fetch("/api/bybit/balance");
                  const data = await res.json();
                  if (data?.connected) setBybitBalance(data.balance ?? []);
                  setBybitChecking(false);
                }}
              >
                {bybitChecking ? "Laden…" : "Vernieuwen"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Binance Testnet */}
      <section className="settings-card">
        <div className="settings-card-title">🔬 Binance Testnet</div>
        <div className="settings-card-desc">
          Oefenen met echte orders op Binance Testnet — gratis nep-geld, geen risico.{" "}
          <a href="https://testnet.binance.vision" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
            Haal je keys op bij testnet.binance.vision →
          </a>
        </div>

        {testnetConnected && (
          <div style={{ marginTop: 12, padding: "8px 14px", background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)", borderRadius: 8, color: "var(--green)", fontSize: 13, fontWeight: 600 }}>
            ✅ Binance Testnet gekoppeld
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>API Key</label>
            <input
              type="text"
              value={testnetKey}
              onChange={e => setTestnetKey(e.target.value)}
              placeholder={testnetConnected ? "••••••••••••••••" : "Plak je Testnet API Key"}
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14 }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>API Secret</label>
            <input
              type="password"
              value={testnetSecret}
              onChange={e => setTestnetSecret(e.target.value)}
              placeholder={testnetConnected ? "••••••••••••••••" : "Plak je Testnet API Secret"}
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14 }}
            />
          </div>
          {testnetError && (
            <div style={{ color: "var(--red)", fontSize: 13 }}>❌ {testnetError}</div>
          )}
          <button
            className="terminal-btn terminal-btn-primary"
            disabled={testnetSaving || !testnetKey || !testnetSecret}
            style={{ alignSelf: "flex-start" }}
            onClick={async () => {
              setTestnetSaving(true); setTestnetError(null);
              await fetch("/api/me/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ testnetKey, testnetSecret }),
              });
              const res = await fetch("/api/testnet/balance");
              const data = await res.json();
              if (data?.connected) {
                setTestnetConnected(true);
                setTestnetSaved(true);
                setTestnetKey(""); setTestnetSecret("");
                setTimeout(() => setTestnetSaved(false), 3000);
              } else {
                setTestnetError(data?.error ?? "Verbinding mislukt — controleer je keys");
              }
              setTestnetSaving(false);
            }}
          >
            {testnetSaving ? "Testen…" : testnetSaved ? "✅ Gekoppeld!" : "Opslaan & testen"}
          </button>
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
              background: pwMsg.ok ? "color-mix(in srgb, var(--green) 12%, transparent)" : "color-mix(in srgb, var(--red) 12%, transparent)",
              color: pwMsg.ok ? "var(--green)" : "var(--red)",
              border: `1px solid ${pwMsg.ok ? "color-mix(in srgb, var(--green) 20%, transparent)" : "color-mix(in srgb, var(--red) 20%, transparent)"}`,
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

      {/* Tweestapsverificatie (2FA) */}
      <section className="settings-card">
        <div className="settings-card-title">🔐 Tweestapsverificatie (2FA)</div>
        <div className="settings-card-desc">
          Extra beveiliging met een authenticator app (Google Authenticator, Authy, etc.). Verplicht bij live trading met Bitvavo.
        </div>

        {twoFaEnabled === null ? (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-secondary)" }}>Laden…</div>
        ) : twoFaEnabled && twoFaStep === "idle" ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)", borderRadius: 8, padding: "8px 14px", color: "var(--green)", fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              ✅ Tweestapsverificatie is ingeschakeld
            </div>
            <button
              className="admin-btn"
              style={{ borderColor: "color-mix(in srgb, var(--red) 30%, transparent)", color: "var(--red)" }}
              onClick={() => { setTwoFaStep("disable"); setTwoFaError(null); setTwoFaToken(""); }}
            >
              2FA uitschakelen
            </button>
          </div>
        ) : !twoFaEnabled && twoFaStep === "idle" ? (
          <button
            className="admin-btn admin-btn-primary"
            style={{ marginTop: 12 }}
            onClick={async () => {
              setTwoFaLoading(true);
              setTwoFaError(null);
              const res = await fetch("/api/me/2fa/setup");
              const data = await res.json();
              if (data.qrDataUrl) {
                setTwoFaQr(data.qrDataUrl);
                setTwoFaStep("setup");
              } else {
                setTwoFaError(data.error ?? "Fout bij setup");
              }
              setTwoFaLoading(false);
            }}
            disabled={twoFaLoading}
          >
            {twoFaLoading ? "Laden…" : "2FA inschakelen"}
          </button>
        ) : twoFaStep === "setup" ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.6 }}>
              Scan de QR code met je authenticator app en voer daarna de 6-cijferige code in om te bevestigen.
            </div>
            {twoFaQr && (
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={twoFaQr} alt="2FA QR Code" style={{ width: 180, height: 180, borderRadius: 12, background: "#fff", padding: 8 }} />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Verificatiecode (6 cijfers)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={twoFaToken}
                onChange={e => { setTwoFaToken(e.target.value.replace(/\D/g, "")); setTwoFaError(null); }}
                placeholder="000000"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 20, letterSpacing: 8, textAlign: "center" }}
              />
            </div>
            {twoFaError && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 8 }}>❌ {twoFaError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="admin-btn"
                onClick={() => { setTwoFaStep("idle"); setTwoFaQr(null); setTwoFaToken(""); setTwoFaError(null); }}
                style={{ flex: 1 }}
              >
                Annuleer
              </button>
              <button
                className="admin-btn admin-btn-primary"
                style={{ flex: 1 }}
                disabled={twoFaLoading || twoFaToken.length < 6}
                onClick={async () => {
                  setTwoFaLoading(true);
                  setTwoFaError(null);
                  const res = await fetch("/api/me/2fa/enable", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: twoFaToken }),
                  });
                  const data = await res.json();
                  if (data.ok) {
                    setTwoFaEnabled(true);
                    setTwoFaStep("idle");
                    setTwoFaQr(null);
                    setTwoFaToken("");
                  } else {
                    setTwoFaError(data.error ?? "Ongeldige code");
                    setTwoFaToken("");
                  }
                  setTwoFaLoading(false);
                }}
              >
                {twoFaLoading ? "Verifiëren…" : "Bevestigen"}
              </button>
            </div>
          </div>
        ) : twoFaStep === "disable" ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.6 }}>
              Voer je huidige authenticatiecode in om 2FA uit te schakelen.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Authenticatiecode of wachtwoord</label>
              <input
                type="text"
                value={twoFaToken}
                onChange={e => { setTwoFaToken(e.target.value); setTwoFaError(null); }}
                placeholder="6-cijferige code of wachtwoord"
                style={{ background: "var(--surface-2)", border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14 }}
              />
            </div>
            {twoFaError && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 8 }}>❌ {twoFaError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="admin-btn"
                onClick={() => { setTwoFaStep("idle"); setTwoFaToken(""); setTwoFaError(null); }}
                style={{ flex: 1 }}
              >
                Annuleer
              </button>
              <button
                className="admin-btn"
                style={{ flex: 1, background: "color-mix(in srgb, var(--red) 12%, transparent)", borderColor: "color-mix(in srgb, var(--red) 30%, transparent)", color: "var(--red)" }}
                disabled={twoFaLoading || !twoFaToken}
                onClick={async () => {
                  setTwoFaLoading(true);
                  setTwoFaError(null);
                  // Probeer als TOTP token (6 cijfers) of als wachtwoord
                  const isToken = /^\d{6}$/.test(twoFaToken);
                  const res = await fetch("/api/me/2fa/disable", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(isToken ? { token: twoFaToken } : { password: twoFaToken }),
                  });
                  const data = await res.json();
                  if (data.ok) {
                    setTwoFaEnabled(false);
                    setTwoFaStep("idle");
                    setTwoFaToken("");
                  } else {
                    setTwoFaError(data.error ?? "Verificatie mislukt");
                    setTwoFaToken("");
                  }
                  setTwoFaLoading(false);
                }}
              >
                {twoFaLoading ? "Bezig…" : "2FA uitschakelen"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* Account verwijderen */}
      <section className="settings-card" style={{ borderColor: "color-mix(in srgb, var(--red) 25%, transparent)" }}>
        <div className="settings-card-title" style={{ color: "var(--red)" }}>⚠️ Gevaarzone</div>
        <div className="settings-card-desc">
          Permanent je account en alle data verwijderen. Dit kan niet ongedaan worden gemaakt.
        </div>
        {!deleteConfirm ? (
          <button
            className="admin-btn"
            style={{ marginTop: 12, borderColor: "color-mix(in srgb, var(--red) 40%, transparent)", color: "var(--red)" }}
            onClick={() => setDeleteConfirm(true)}
          >
            Account verwijderen
          </button>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div style={{ background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)", borderRadius: 8, padding: "12px 14px", marginBottom: 12, fontSize: 13, color: "var(--red)", lineHeight: 1.6 }}>
              ⚠️ Je staat op het punt je account <strong>permanent te verwijderen</strong>. Alle trades, quiz voortgang, berichten met Marcus en instellingen worden definitief gewist.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Bevestig met je wachtwoord</label>
              <input
                type="password"
                value={deletePassword}
                onChange={e => { setDeletePassword(e.target.value); setDeleteError(null); }}
                placeholder="Jouw wachtwoord"
                style={{ background: "var(--surface-2)", border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14 }}
              />
            </div>
            {deleteError && (
              <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 8 }}>❌ {deleteError}</div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="admin-btn"
                onClick={() => { setDeleteConfirm(false); setDeletePassword(""); setDeleteError(null); }}
                style={{ flex: 1 }}
              >
                Annuleer
              </button>
              <button
                className="admin-btn"
                style={{ flex: 1, background: "color-mix(in srgb, var(--red) 15%, transparent)", borderColor: "color-mix(in srgb, var(--red) 40%, transparent)", color: "var(--red)" }}
                disabled={deleting || !deletePassword}
                onClick={async () => {
                  setDeleting(true);
                  setDeleteError(null);
                  const res = await fetch("/api/me/delete", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password: deletePassword }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    // Uitloggen en doorsturen naar login
                    window.location.href = "/auth/login?deleted=1";
                  } else {
                    setDeleteError(data.error ?? "Verwijderen mislukt");
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "Bezig…" : "Permanent verwijderen"}
              </button>
            </div>
          </div>
        )}
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
              <div style={{ color: "var(--green)", fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
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
