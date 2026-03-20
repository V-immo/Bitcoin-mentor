"use client";

import { useEffect, useState } from "react";
import { usePushNotifications } from "@/lib/usePushNotifications";

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

const TRADING_MODES: { key: TradingMode; label: string; desc: string }[] = [
  { key: "day",   label: "Day Trade",   desc: "Trades binnen één dag — hoog tempo, snelle beslissingen" },
  { key: "swing", label: "Swing Trade", desc: "Trades van 2–14 dagen — rustigere benadering" },
  { key: "long",  label: "Long Term",   desc: "Weken tot maanden vasthouden — geduldig beleggen" },
];

const RISK_LEVELS: { key: RiskLevel; label: string; pct: string; color: string }[] = [
  { key: "low",    label: "Conservatief", pct: "1–2% per trade", color: "#26c57c" },
  { key: "medium", label: "Gemiddeld",    pct: "2–5% per trade", color: "#f59e0b" },
  { key: "high",   label: "Agressief",   pct: "5–10% per trade", color: "#ef4444" },
];

export default function SettingsPanel() {
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

  async function saveLanguage(lang: "nl" | "en") {
    setSettings((prev) => ({ ...prev, aiLanguage: lang }));
    await fetch("/api/me/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, aiLanguage: lang }),
    });
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
    return <div className="settings-panels"><div className="settings-loading">Instellingen laden…</div></div>;
  }

  return (
    <div className="settings-panels">

      {/* Trading modus */}
      <section className="settings-card">
        <div className="settings-card-title">Trading modus</div>
        <div className="settings-card-desc">
          Kies hoe je wilt traden. De AI past zijn aanbevelingen hierop aan.
        </div>
        <div className="settings-options">
          {TRADING_MODES.map((m) => (
            <button
              key={m.key}
              className={`settings-option${settings.tradingMode === m.key ? " active" : ""}`}
              onClick={() => update("tradingMode", m.key)}
            >
              <div className="settings-option-title">{m.label}</div>
              <div className="settings-option-desc">{m.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Risico niveau */}
      <section className="settings-card">
        <div className="settings-card-title">Risico niveau</div>
        <div className="settings-card-desc">
          Bepaalt hoeveel van je kapitaal per trade op het spel staat.
        </div>
        <div className="settings-options settings-options-3">
          {RISK_LEVELS.map((r) => (
            <button
              key={r.key}
              className={`settings-option${settings.riskLevel === r.key ? " active" : ""}`}
              onClick={() => update("riskLevel", r.key)}
              style={settings.riskLevel === r.key ? { borderColor: r.color, background: `${r.color}15` } : {}}
            >
              <div className="settings-option-title" style={settings.riskLevel === r.key ? { color: r.color } : {}}>
                {r.label}
              </div>
              <div className="settings-option-desc">{r.pct}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Start kapitaal — alleen lezen, door admin ingesteld */}
      <section className="settings-card">
        <div className="settings-card-title">Start kapitaal</div>
        <div className="settings-card-desc">
          Jouw startkapitaal voor paper trading. Dit wordt ingesteld door de admin.
        </div>
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
        <div className="settings-hint">
          Neem contact op met de admin om je startkapitaal te wijzigen.
        </div>
      </section>

      {/* AI taal */}
      <section className="settings-card">
        <div className="settings-card-title">AI communicatie</div>
        <div className="settings-card-desc">
          In welke taal wil je dat de AI met je praat?
        </div>
        <div className="settings-options settings-options-2">
          <button
            className={`settings-option${settings.aiLanguage === "nl" ? " active" : ""}`}
            onClick={() => saveLanguage("nl")}
          >
            <div className="settings-option-title">🇳🇱 Nederlands</div>
          </button>
          <button
            className={`settings-option${settings.aiLanguage === "en" ? " active" : ""}`}
            onClick={() => saveLanguage("en")}
          >
            <div className="settings-option-title">🇬🇧 English</div>
          </button>
        </div>
      </section>

      {/* Opslaan */}
      <div className="settings-actions">
        <button className="terminal-btn terminal-btn-primary" onClick={save}>
          {saved ? "✓ Opgeslagen!" : "Instellingen opslaan"}
        </button>
      </div>

      {/* Bitvavo koppeling */}
      <section className="settings-card">
        <div className="settings-card-title">🔗 Bitvavo koppeling</div>
        <div className="settings-card-desc">
          Koppel je Bitvavo account om je echte saldo te zien. Maak een read-only API key aan
          via Bitvavo → Account → API → Nieuwe sleutel (alleen &quot;Accountinformatie lezen&quot; aanzetten).
        </div>

        {bitvavoConnected === true && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8 }}>
            <div style={{ color: "#86efac", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>✓ Bitvavo gekoppeld</div>
            {bitvavoBalance && bitvavoBalance.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {bitvavoBalance.map((b) => (
                  <span key={b.symbol} style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 6, padding: "3px 10px", fontSize: 13, color: "#86efac" }}>
                    {b.symbol}: {parseFloat(b.available).toFixed(4)}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: "#86efac", fontSize: 13 }}>Geen saldo gevonden (alle posities zijn 0)</div>
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
              placeholder={bitvavoConnected ? "••••••••••••••••" : "Voer je Bitvavo API key in"}
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14 }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>API Secret</label>
            <input
              type="password"
              value={bitvavoSecret}
              onChange={e => setBitvavoSecret(e.target.value)}
              placeholder={bitvavoConnected ? "••••••••••••••••" : "Voer je Bitvavo API secret in"}
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
                  alert(data.error ?? "Verbinding mislukt — controleer je API keys.");
                }
                setBitvavoSaving(false);
                setBitvavoChecking(false);
              }}
            >
              {bitvavoSaving ? (bitvavoChecking ? "Testen…" : "Opslaan…") : bitvavoSaved ? "✓ Gekoppeld!" : "Opslaan & testen"}
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
                {bitvavoChecking ? "Laden…" : "↻ Saldo vernieuwen"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Wachtwoord wijzigen */}
      <section className="settings-card">
        <div className="settings-card-title">🔒 Wachtwoord wijzigen</div>
        <div className="settings-card-desc">Kies een sterk wachtwoord van minimaal 8 tekens.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Huidig wachtwoord</label>
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
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Nieuw wachtwoord</label>
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
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Bevestig nieuw wachtwoord</label>
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
                setPwMsg({ ok: false, text: "Nieuwe wachtwoorden komen niet overeen." });
                return;
              }
              if (pwNew.length < 8) {
                setPwMsg({ ok: false, text: "Wachtwoord moet minimaal 8 tekens zijn." });
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
                setPwMsg({ ok: true, text: "✓ Wachtwoord succesvol gewijzigd!" });
                setPwCurrent(""); setPwNew(""); setPwConfirm("");
              } else {
                setPwMsg({ ok: false, text: data.error ?? "Fout bij wijzigen." });
              }
              setPwSaving(false);
            }}
            style={{ alignSelf: "flex-start" }}
          >
            {pwSaving ? "Opslaan…" : "Wachtwoord wijzigen"}
          </button>
        </div>
      </section>

      {/* Push notificaties */}
      {push.supported && (
        <section className="settings-card">
          <div className="settings-card-title">🔔 Push notificaties</div>
          <div className="settings-card-desc">
            Ontvang een melding op je telefoon of computer als het signaal verandert naar &quot;Kopen overwegen&quot;.
          </div>
          {push.subscribed ? (
            <div>
              <div style={{ color: "#86efac", fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
                ✓ Notificaties ingeschakeld
              </div>
              <button
                className="admin-btn"
                onClick={push.unsubscribe}
                disabled={push.loading}
                style={{ fontSize: 13 }}
              >
                {push.loading ? "Bezig…" : "Uitschakelen"}
              </button>
            </div>
          ) : (
            <button
              className="admin-btn admin-btn-primary"
              onClick={push.subscribe}
              disabled={push.loading}
            >
              {push.loading ? "Bezig…" : "🔔 Notificaties inschakelen"}
            </button>
          )}
        </section>
      )}

    </div>
  );
}
