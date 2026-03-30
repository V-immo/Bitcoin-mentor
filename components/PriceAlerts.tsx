"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SCAN_ASSETS } from "@/lib/assets";
import { useSession } from "next-auth/react";

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

export default function PriceAlerts({ currentAsset, currentPrice }: Props) {
  const { t } = useLanguage();
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
  const [formPrice, setFormPrice] = useState(currentPrice ? String(Math.round(currentPrice * 0.95)) : "");
  const [formEmail, setFormEmail] = useState(userEmail);

  useEffect(() => {
    if (currentAsset) setFormAsset(currentAsset);
  }, [currentAsset]);

  useEffect(() => {
    if (userEmail && !formEmail) setFormEmail(userEmail);
  }, [userEmail, formEmail]);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setLoading(true);
    try {
      const res = await fetch("/api/me/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function addAlert(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const price = parseFloat(formPrice);
    if (isNaN(price) || price <= 0) {
      setError(t("alert_invalid_price"));
      return;
    }
    if (!formEmail.includes("@")) {
      setError(t("alert_invalid_email"));
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
        setError(data.error ?? t("alert_save_error"));
      } else {
        setSuccess(t("alert_saved"));
        await loadAlerts();
        // Reset prijs veld
        setFormPrice("");
      }
    } catch {
      setError(t("alert_save_error"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteAlert(id: number) {
    // Optimistisch verwijderen uit UI
    setAlerts(prev => prev.filter(a => a.id !== id));
    try {
      await fetch("/api/me/alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // ignore — UI is al bijgewerkt
    }
    // Altijd herladen van server
    await loadAlerts();
  }

  const assetDef = SCAN_ASSETS.find(a => a.symbol === formAsset);

  return (
    <div className="terminal-side-card" style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>🔔</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{t("alert_title")}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("alert_subtitle")}</div>
        </div>
      </div>

      {/* Formulier */}
      <form onSubmit={addAlert} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {/* Asset */}
        <div>
          <div className="terminal-label" style={{ marginBottom: 4 }}>{t("alert_asset")}</div>
          <select
            value={formAsset}
            onChange={e => setFormAsset(e.target.value)}
            style={{
              width: "100%", background: "var(--surface)", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 13,
            }}
          >
            {SCAN_ASSETS.map(a => (
              <option key={a.symbol} value={a.symbol}>
                {a.emoji} {a.name} ({a.ticker})
              </option>
            ))}
          </select>
        </div>

        {/* Conditie + Prijs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}>
          <div>
            <div className="terminal-label" style={{ marginBottom: 4 }}>{t("alert_condition")}</div>
            <select
              value={formCondition}
              onChange={e => setFormCondition(e.target.value as "above" | "below")}
              style={{
                width: "100%", background: "var(--surface)", color: "var(--text)",
                border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 13,
              }}
            >
              <option value="below">📉 {t("alert_below")}</option>
              <option value="above">📈 {t("alert_above")}</option>
            </select>
          </div>
          <div>
            <div className="terminal-label" style={{ marginBottom: 4 }}>
              {t("alert_target_price")} {assetDef?.currency ?? "USD"}
            </div>
            <input
              type="number"
              min="0"
              step="any"
              value={formPrice}
              onChange={e => setFormPrice(e.target.value)}
              placeholder={currentPrice ? String(Math.round(currentPrice * 0.95)) : "50000"}
              style={{
                width: "100%", background: "var(--surface)", color: "var(--text)",
                border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 13,
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <div className="terminal-label" style={{ marginBottom: 4 }}>{t("alert_email")}</div>
          <input
            type="email"
            value={formEmail}
            onChange={e => setFormEmail(e.target.value)}
            placeholder="jouw@email.com"
            style={{
              width: "100%", background: "var(--surface)", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 13,
              boxSizing: "border-box",
            }}
          />
        </div>

        {error && <div style={{ color: "#ef4444", fontSize: 12 }}>{error}</div>}
        {success && <div style={{ color: "#26c57c", fontSize: 12 }}>{success}</div>}

        <button
          type="submit"
          disabled={saving}
          className="terminal-btn terminal-btn-primary"
          style={{ width: "100%", padding: "10px", fontSize: 13 }}
        >
          {saving ? "..." : `🔔 ${t("alert_add_btn")}`}
        </button>
      </form>

      {/* Bestaande alerts */}
      <div>
        <div className="terminal-label" style={{ marginBottom: 8 }}>
          {t("alert_active_title")} ({alerts.filter(a => a.active).length})
        </div>
        {loading ? (
          <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>...</div>
        ) : alerts.length === 0 ? (
          <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>{t("alert_empty")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {alerts.map(alert => {
              const def = SCAN_ASSETS.find(a => a.symbol === alert.asset);
              return (
                <div
                  key={alert.id}
                  style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "10px 12px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                      {def?.emoji ?? ""} {def?.name ?? alert.asset}
                      {" "}
                      <span style={{ color: alert.condition === "below" ? "#ef4444" : "#26c57c" }}>
                        {alert.condition === "below" ? "< " : "> "}
                        {alert.target_price.toLocaleString("nl-NL", { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>
                      → {alert.email}
                      {alert.last_triggered_at && (
                        <span style={{ marginLeft: 6, color: "#f59e0b" }}>
                          ✓ {new Date(alert.last_triggered_at).toLocaleDateString("nl-NL")}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    style={{
                      background: "none", border: "1px solid var(--border)", borderRadius: 6,
                      color: "var(--text-secondary)", cursor: "pointer", padding: "3px 8px", fontSize: 11,
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
