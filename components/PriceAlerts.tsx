"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SCAN_ASSETS } from "@/lib/assets";
import { useSession } from "next-auth/react";
import { toast } from "@/lib/toast";

type Alert = {
  id: number;
  asset: string;
  condition: "above" | "below";
  target_price: number;
  email: string;
  active: number;
  created_at: string;
  last_triggered_at: string | null;
};

type Props = {
  currentAsset?: string;
  currentPrice?: number;
};

// Snelknoppen relatief aan huidige prijs
const QUICK_OFFSETS = [
  { label: "-10%", pct: -10, color: "var(--red)" },
  { label: "-5%",  pct: -5,  color: "var(--orange)" },
  { label: "-2%",  pct: -2,  color: "#eab308" },
  { label: "+2%",  pct: 2,   color: "#84cc16" },
  { label: "+5%",  pct: 5,   color: "var(--green)" },
  { label: "+10%", pct: 10,  color: "#10b981" },
];

export default function PriceAlerts({ currentAsset, currentPrice }: Props) {
  const { data: session } = useSession();
  const userEmail = (session?.user as { email?: string })?.email ?? "";

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [formAsset, setFormAsset] = useState(currentAsset ?? "BTCUSDT");
  const [formCondition, setFormCondition] = useState<"above" | "below">("below");
  const [formPrice, setFormPrice] = useState(
    currentPrice ? String(Math.round(currentPrice * 0.95)) : ""
  );
  const [formEmail, setFormEmail] = useState("");

  // Bijhouden welke alerts we al aan Marcus hebben gemeld (voorkom hermelding)
  const reportedAlertsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (currentAsset) setFormAsset(currentAsset);
  }, [currentAsset]);

  useEffect(() => {
    if (userEmail && !formEmail) setFormEmail(userEmail);
  }, [userEmail, formEmail]);

  useEffect(() => {
    loadAlerts();
  }, []);

  // Polling: check elke 60s of er recent getriggerde alerts zijn → open Marcus
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/me/alerts/recent");
        if (!res.ok) return;
        const data = await res.json() as { recent: { id: number; asset: string; condition: "above" | "below"; target_price: number }[] };
        for (const a of data.recent ?? []) {
          if (reportedAlertsRef.current.has(a.id)) continue;
          reportedAlertsRef.current.add(a.id);

          // Dispatch marcus event zodat FloatingMarcus opent met commentaar
          const ticker = a.asset.replace("USDT", "").replace("EUR", "");
          const dir = a.condition === "above" ? "gestegen boven" : "gedaald onder";
          window.dispatchEvent(new CustomEvent("marcus-price-alert", {
            detail: {
              asset: a.asset,
              condition: a.condition,
              targetPrice: a.target_price,
              message: `[PRIJSALERT GETRIGGERD]\n${ticker} is ${dir} $${a.target_price.toLocaleString("en-US")}.\n\nWat is jouw analyse nu — setup of gevaar?`,
            },
          }));
        }
      } catch { /* ignore */ }
    };

    poll(); // direct bij mount
    const iv = setInterval(poll, 60_000);
    return () => clearInterval(iv);
  }, []);

  async function loadAlerts() {
    setLoading(true);
    try {
      const res = await fetch("/api/me/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function setQuickPrice(pct: number) {
    if (!currentPrice) return;
    const price = currentPrice * (1 + pct / 100);
    setFormPrice(String(Math.round(price * 100) / 100));
    setFormCondition(pct < 0 ? "below" : "above");
  }

  const addAlert = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const price = parseFloat(formPrice);
    if (isNaN(price) || price <= 0) {
      setError("Voer een geldige prijs in.");
      return;
    }
    if (formEmail && !formEmail.includes("@")) {
      setError("Voer een geldig e-mailadres in.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/me/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: formAsset,
          condition: formCondition,
          targetPrice: price,
          email: formEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Opslaan mislukt.");
      } else {
        setSuccess("✓ Alert aangemaakt");
        await loadAlerts();
        setFormPrice("");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch {
      setError("Verbindingsfout.");
    } finally {
      setSaving(false);
    }
  }, [formAsset, formCondition, formPrice, formEmail]);

  async function deleteAlert(id: number) {
    setAlerts(prev => prev.filter(a => a.id !== id));
    try {
      const res = await fetch("/api/me/alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) toast("Alert verwijderen mislukt.", "error");
    } catch {
      toast("Verbindingsfout.", "error");
    } finally {
      await loadAlerts();
    }
  }

  const assetDef = SCAN_ASSETS.find(a => a.symbol === formAsset);
  const currency = assetDef?.currency ?? "USD";
  const activeCount = alerts.filter(a => a.active).length;

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid rgba(233,30,99,0.2)",
      borderRadius: 16,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px",
        background: "linear-gradient(135deg, rgba(233,30,99,0.1) 0%, transparent 60%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              Prijsalerts
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {activeCount} actief — Marcus waarschuwt je bij trigger
            </div>
          </div>
        </div>
        {currentPrice && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
            <div style={{ fontSize: 10, marginBottom: 1 }}>Nu</div>
            <div style={{ fontWeight: 700, color: "var(--text)" }}>
              ${currentPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      <div style={{ padding: "14px 18px" }}>
        {/* Snelknoppen */}
        {currentPrice && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              Snel instellen (huidige prijs: ${currentPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {QUICK_OFFSETS.map(o => (
                <button
                  key={o.label}
                  onClick={() => setQuickPrice(o.pct)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${o.color}40`,
                    borderRadius: 7,
                    padding: "4px 10px",
                    fontSize: 12,
                    color: o.color,
                    cursor: "pointer",
                    fontWeight: 600,
                    transition: "all 0.15s",
                  }}
                >
                  {o.label}
                  {currentPrice && (
                    <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7, fontWeight: 400 }}>
                      ${Math.round(currentPrice * (1 + o.pct / 100)).toLocaleString("en-US")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={addAlert} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Asset */}
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Asset</div>
            <select
              value={formAsset}
              onChange={e => setFormAsset(e.target.value)}
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)", color: "var(--text)",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 10px", fontSize: 13,
              }}
            >
              {SCAN_ASSETS.map(a => (
                <option key={a.symbol} value={a.symbol} style={{ background: "var(--surface)" }}>
                  {a.emoji} {a.name} ({a.ticker})
                </option>
              ))}
            </select>
          </div>

          {/* Conditie + Prijs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Conditie</div>
              <select
                value={formCondition}
                onChange={e => setFormCondition(e.target.value as "above" | "below")}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)", color: "var(--text)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 10px", fontSize: 13,
                }}
              >
                <option value="below" style={{ background: "var(--surface)" }}>📉 Daalt onder</option>
                <option value="above" style={{ background: "var(--surface)" }}>📈 Stijgt boven</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Prijs ({currency})</div>
              <input
                type="number"
                min="0"
                step="any"
                value={formPrice}
                onChange={e => setFormPrice(e.target.value)}
                placeholder={currentPrice ? String(Math.round(currentPrice * 0.95)) : "50000"}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)", color: "var(--text)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 10px", fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* E-mail (optioneel) */}
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
              E-mail notificatie <span style={{ opacity: 0.5 }}>(optioneel)</span>
            </div>
            <input
              type="email"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              placeholder="leeglaten = alleen Marcus-melding"
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)", color: "var(--text)",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 10px", fontSize: 13,
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{ color: "var(--red)", fontSize: 12, padding: "6px 10px", background: "rgba(239,68,68,0.1)", borderRadius: 6 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ color: "var(--green)", fontSize: 12, padding: "6px 10px", background: "rgba(34,197,94,0.1)", borderRadius: 6 }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !formPrice}
            style={{
              width: "100%",
              background: formPrice ? "var(--primary)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${formPrice ? "var(--primary)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 10, padding: "11px 0",
              color: formPrice ? "#fff" : "var(--text-muted)",
              fontSize: 14, fontWeight: 700,
              cursor: formPrice ? "pointer" : "default",
              transition: "all 0.2s",
            }}
          >
            {saving ? "Opslaan…" : "🔔 Alert aanmaken"}
          </button>
        </form>
      </div>

      {/* Bestaande alerts */}
      <div style={{ padding: "0 18px 16px" }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8,
        }}>
          Actieve alerts ({activeCount})
        </div>

        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Laden…</div>
        ) : alerts.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12, fontStyle: "italic" }}>
            Nog geen alerts ingesteld.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {alerts.map(alert => {
              const def = SCAN_ASSETS.find(a => a.symbol === alert.asset);
              const isAbove = alert.condition === "above";
              const recentlyTriggered = alert.last_triggered_at
                ? Date.now() - new Date(alert.last_triggered_at).getTime() < 5 * 60_000
                : false;

              return (
                <div
                  key={alert.id}
                  style={{
                    background: recentlyTriggered
                      ? "rgba(233,30,99,0.08)"
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${recentlyTriggered ? "rgba(233,30,99,0.3)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                      {def?.emoji ?? ""} {def?.ticker ?? alert.asset}{" "}
                      <span style={{ color: isAbove ? "var(--green)" : "var(--red)" }}>
                        {isAbove ? "↑ boven" : "↓ onder"}{" "}
                        ${alert.target_price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </span>
                      {recentlyTriggered && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: "var(--primary)", fontWeight: 700 }}>
                          🔔 GETRIGGERD
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      {alert.email ? `📧 ${alert.email}` : "📱 In-app melding"}
                      {alert.last_triggered_at && (
                        <span style={{ marginLeft: 6, color: "var(--orange)" }}>
                          · {new Date(alert.last_triggered_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    style={{
                      background: "none",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "3px 8px",
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
