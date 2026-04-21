"use client";

import { useEffect, useState } from "react";
import { Radio, Zap, CheckCircle2, StopCircle, Clock } from "lucide-react";

type Signal = {
  id: number; asset: string; symbol: string; direction: string;
  entry_price: number; stop_loss: number; target: number;
  rsi: number; score: number; trend: string; status: string;
  close_price: number | null; created_at: string; closed_at: string | null;
  currentPrice: number | null; pnlPct: number | null;
};

export default function MarcusSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyEnabled, setCopyEnabled] = useState(false);
  const [savingCopy, setSavingCopy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/signals").then(r => r.ok ? r.json() : { signals: [] }),
      fetch("/api/me/settings").then(r => r.ok ? r.json() : {} as Record<string, unknown>),
    ]).then(([sigData, settings]) => {
      setSignals(sigData.signals ?? []);
      setCopyEnabled(!!(settings as Record<string, unknown>).copyTrading);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function toggleCopyTrading() {
    setSavingCopy(true);
    const newVal = !copyEnabled;
    try {
      const res = await fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copyTrading: newVal }),
      });
      if (res.ok) setCopyEnabled(newVal);
    } catch { /* ignore */ } finally { setSavingCopy(false); }
  }

  async function manualCopy(signal: Signal) {
    if (!signal.currentPrice) return;
    const res = await fetch(`/api/me/paper?asset=${encodeURIComponent(signal.symbol)}`, {
      method: "PUT",
    });
    if (!res.ok) return;
    const existing = await res.json().catch(() => ({}));
    if (existing.position) { alert("Je hebt al een open positie voor " + signal.asset); return; }

    const cash = existing.cash ?? 10000;
    const tradeValue = cash * 0.05;
    const openBtc = tradeValue / signal.entry_price;
    const newCash = cash - tradeValue;
    const position = { avgEntry: signal.entry_price, openBtc, side: "long", stopLoss: signal.stop_loss, target: signal.target, realizedPnl: 0, auto: false, signalId: signal.id };
    const history = [...(existing.history ?? []), { side: "buy", timestamp: Date.now(), price: signal.entry_price, amount: openBtc, signalId: signal.id }];

    await fetch(`/api/me/paper?asset=${encodeURIComponent(signal.symbol)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cash: newCash, position, history, startingBalance: existing.startingBalance ?? 10000 }),
    });
    alert(`Trade geopend: ${signal.asset} @ $${signal.entry_price.toFixed(2)}`);
  }

  const openSignals = signals.filter(s => s.status === "open");
  const closedSignals = signals.filter(s => s.status !== "open").slice(0, 5);

  return (
    <section className="card" style={{ marginTop: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}><Radio size={18} /> Marcus Signalen</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Marcus genereert automatisch trade-signalen op basis van zijn marktanalyse. Jij besluit of je volgt.</p>
      </div>

      {/* Copy trading toggle */}
      <div className="card" style={{
        display: "flex", alignItems: "center", gap: 12,
        background: copyEnabled ? "rgba(34,212,122,0.08)" : undefined,
        borderColor: copyEnabled ? "rgba(34,212,122,0.3)" : undefined,
        padding: "10px 14px", marginBottom: 16,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Zap size={13} /> Automatisch kopiëren {copyEnabled ? "— AAN" : "— UIT"}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Als Marcus een signaal geeft, opent hij automatisch een paper trade voor jou (5% van je cash).
          </div>
        </div>
        <button
          onClick={toggleCopyTrading}
          disabled={savingCopy}
          style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none",
            background: copyEnabled ? "var(--green)" : "rgba(233,30,99,0.15)",
            color: copyEnabled ? "#0d1117" : "var(--primary)",
            cursor: savingCopy ? "not-allowed" : "pointer",
            opacity: savingCopy ? 0.7 : 1,
          }}
        >
          {savingCopy ? "…" : copyEnabled ? "Uitzetten" : "Inschakelen"}
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Laden…</p>
      ) : openSignals.length === 0 ? (
        <div className="card" style={{
          textAlign: "center", color: "var(--text-muted)", fontSize: 13,
        }}>
          Geen actieve signalen op dit moment. Marcus analyseert de markt elke 30 minuten.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {openSignals.map(s => {
            const pnlPositive = (s.pnlPct ?? 0) >= 0;
            const rr = parseFloat((((s.target - s.entry_price) / (s.entry_price - s.stop_loss))).toFixed(1));
            return (
              <div key={s.id} className="card" style={{
                padding: "12px 14px",
                borderLeft: "3px solid #22d47a",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{s.asset}</span>
                    <span style={{
                      marginLeft: 8, fontSize: 11, padding: "1px 7px", borderRadius: 4,
                      background: "rgba(34,212,122,0.15)", color: "var(--green)", fontWeight: 600,
                    }}>LONG</span>
                    <span style={{
                      marginLeft: 6, fontSize: 11, color: "var(--text-muted)"
                    }}>score {s.score}/100 · RSI {s.rsi.toFixed(0)} · {s.trend}</span>
                  </div>
                  {s.pnlPct !== null && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: pnlPositive ? "var(--green)" : "var(--red)" }}>
                      {pnlPositive ? "+" : ""}{s.pnlPct}%
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, marginBottom: 10 }}>
                  <span style={{ color: "var(--text-muted)" }}>Entry <strong style={{ color: "var(--text)" }}>${s.entry_price.toFixed(2)}</strong></span>
                  <span style={{ color: "var(--red)" }}>SL <strong>${s.stop_loss.toFixed(2)}</strong></span>
                  <span style={{ color: "var(--green)" }}>Target <strong>${s.target.toFixed(2)}</strong></span>
                  <span style={{ color: "var(--text-muted)" }}>R/R <strong style={{ color: "var(--text)" }}>{rr}:1</strong></span>
                  {s.currentPrice && <span style={{ color: "var(--text-muted)" }}>Nu <strong style={{ color: "var(--text)" }}>${s.currentPrice.toFixed(2)}</strong></span>}
                </div>
                <button
                  onClick={() => manualCopy(s)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6, border: "none",
                    background: "rgba(233,30,99,0.15)", color: "var(--primary)", cursor: "pointer",
                  }}
                >
                  ↗ Kopieer trade
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Gesloten signals */}
      {closedSignals.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Recente resultaten
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {closedSignals.map(s => {
              const pnlPct = s.close_price
                ? parseFloat((((s.close_price - s.entry_price) / s.entry_price) * 100).toFixed(1))
                : null;
              const StatusIcon = s.status === "hit_target" ? CheckCircle2 : s.status === "hit_stop" ? StopCircle : Clock;
              const label = s.status === "hit_target" ? "Target geraakt" : s.status === "hit_stop" ? "Stop geraakt" : "Verlopen";
              return (
                <div key={s.id} className="card" style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 12px", fontSize: 12,
                }}>
                  <span style={{ color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}><StatusIcon size={13} /> {s.asset} — {label}</span>
                  {pnlPct !== null && (
                    <span style={{ fontWeight: 600, color: pnlPct >= 0 ? "var(--green)" : "var(--red)" }}>
                      {pnlPct >= 0 ? "+" : ""}{pnlPct}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
