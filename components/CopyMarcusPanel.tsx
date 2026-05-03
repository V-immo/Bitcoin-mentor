"use client";

import { useEffect, useState } from "react";
import { Copy, TrendingUp, AlertTriangle, CheckCircle, XCircle, Loader } from "lucide-react";

type CopyTrade = {
  id: number;
  asset: string;
  exchange: string;
  size_usdt: number;
  entry_price: number;
  close_price: number | null;
  status: string;
  error_msg: string | null;
  opened_at: string;
  closed_at: string | null;
  stop_loss: number;
  target: number;
};

type Stats = {
  total: number;
  open: number;
  closed: number;
  errors: number;
  totalPnlUsdt: number;
  winRate: number;
};

type Settings = {
  copyTrading: boolean;
  copyExchange: string;
  copySizeUsdt: number;
  copyMaxOpen: number;
  bybitConnected: boolean;
  okxConnected?: boolean;
  mexcConnected?: boolean;
};

const EXCHANGES = [
  { key: "none",  label: "Geen (alleen paper)" },
  { key: "bybit", label: "Bybit" },
  { key: "okx",   label: "OKX" },
  { key: "mexc",  label: "MEXC" },
];

function statusIcon(status: string) {
  if (status === "open")   return <Loader size={13} color="#3b82f6" />;
  if (status === "closed") return <CheckCircle size={13} color="#22c55e" />;
  if (status === "error")  return <XCircle size={13} color="#ef4444" />;
  return null;
}

function pnlColor(pnl: number) {
  return pnl > 0 ? "#22c55e" : pnl < 0 ? "#ef4444" : "var(--text-secondary)";
}

export default function CopyMarcusPanel() {
  const [settings, setSettings]   = useState<Settings | null>(null);
  const [trades, setTrades]       = useState<CopyTrade[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [saving, setSaving]       = useState(false);
  const [loading, setLoading]     = useState(true);

  // lokale edit state
  const [enabled, setEnabled]     = useState(false);
  const [exchange, setExchange]   = useState("none");
  const [sizeUsdt, setSizeUsdt]   = useState(100);
  const [maxOpen, setMaxOpen]     = useState(3);

  useEffect(() => {
    Promise.all([
      fetch("/api/me/settings").then(r => r.ok ? r.json() : null),
      fetch("/api/me/copy-trades").then(r => r.ok ? r.json() : null),
    ]).then(([s, ct]) => {
      if (s) {
        setSettings(s);
        setEnabled(s.copyTrading ?? false);
        setExchange(s.copyExchange ?? "none");
        setSizeUsdt(s.copySizeUsdt ?? 100);
        setMaxOpen(s.copyMaxOpen ?? 3);
      }
      if (ct) {
        setTrades(ct.trades ?? []);
        setStats(ct.stats ?? null);
      }
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/me/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        copyTrading: enabled,
        copyExchange: exchange,
        copySizeUsdt: sizeUsdt,
        copyMaxOpen: maxOpen,
      }),
    }).catch(() => {});
    setSaving(false);
  }

  if (loading) return <div style={{ color: "var(--text-secondary)", fontSize: 13, padding: 16 }}>Laden…</div>;

  const hasExchangeKey =
    (exchange === "bybit" && settings?.bybitConnected) ||
    (exchange === "okx"   && settings?.okxConnected) ||
    (exchange === "mexc"  && settings?.mexcConnected) ||
    exchange === "none";

  const openTrades  = trades.filter(t => t.status === "open");
  const closedTrades = trades.filter(t => t.status === "closed");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Config kaart */}
      <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Copy size={16} color="var(--accent)" />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Copy Marcus</span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", marginLeft: "auto" }}>
            Automatisch meehandelen bij Marcus-signalen
          </span>
        </div>

        {/* Aan/uit */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "10px 12px", background: enabled ? "rgba(99,102,241,0.08)" : "var(--surface)", borderRadius: 8, border: `1px solid ${enabled ? "var(--accent)" : "var(--border)"}` }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Copy trading</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {enabled ? "Actief — volgt Marcus zijn signalen" : "Uitgeschakeld"}
            </div>
          </div>
          <button
            onClick={() => setEnabled(e => !e)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
              background: enabled ? "var(--accent)" : "var(--border)",
              position: "relative", transition: "background 0.2s", flexShrink: 0,
            }}
          >
            <span style={{
              position: "absolute", top: 2, left: enabled ? 22 : 2,
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", display: "block",
            }} />
          </button>
        </div>

        {/* Exchange */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Exchange</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {EXCHANGES.map(ex => (
              <button
                key={ex.key}
                onClick={() => setExchange(ex.key)}
                style={{
                  padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border)",
                  background: exchange === ex.key ? "var(--accent)" : "var(--surface)",
                  color: exchange === ex.key ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer", fontSize: 12, fontWeight: exchange === ex.key ? 600 : 400,
                }}
              >
                {ex.label}
              </button>
            ))}
          </div>
          {exchange !== "none" && !hasExchangeKey && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11, color: "#f59e0b" }}>
              <AlertTriangle size={12} />
              {exchange.charAt(0).toUpperCase() + exchange.slice(1)} API-sleutels niet gekoppeld. Koppel ze in instellingen.
            </div>
          )}
        </div>

        {/* Positiegrootte */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Bedrag per trade (USDT)</label>
            <input
              type="number"
              value={sizeUsdt}
              onChange={e => setSizeUsdt(Math.max(10, Math.min(10000, Number(e.target.value))))}
              min={10} max={10000} step={10}
              style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", color: "var(--text-primary)", fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Max gelijktijdige trades</label>
            <input
              type="number"
              value={maxOpen}
              onChange={e => setMaxOpen(Math.max(1, Math.min(10, Number(e.target.value))))}
              min={1} max={10}
              style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", color: "var(--text-primary)", fontSize: 13 }}
            />
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
          <strong style={{ color: "#ef4444" }}>Let op:</strong> Copy trading plaatst echte orders met jouw vermogen.
          Marcus-signalen zijn geen financieel advies. Gebruik alleen geld dat je kunt missen.
        </div>

        <button
          onClick={save}
          disabled={saving}
          style={{ width: "100%", padding: "10px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Opslaan…" : "Instellingen opslaan"}
        </button>
      </div>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            { label: "Totaal",     value: stats.total },
            { label: "Open",       value: stats.open,         color: "#3b82f6" },
            { label: "Gesloten",   value: stats.closed },
            { label: "Fouten",     value: stats.errors,       color: stats.errors > 0 ? "#ef4444" : undefined },
            { label: "Winrate",    value: `${stats.winRate}%`, color: stats.winRate >= 60 ? "#22c55e" : stats.winRate >= 40 ? "#f59e0b" : "#ef4444" },
            { label: "Totaal P&L", value: `${stats.totalPnlUsdt >= 0 ? "+" : ""}$${stats.totalPnlUsdt}`, color: pnlColor(stats.totalPnlUsdt) },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: (s.color as string | undefined) ?? "var(--text-primary)" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Open trades */}
      {openTrades.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={13} color="var(--accent)" /> Open trades ({openTrades.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {openTrades.map(t => (
              <div key={t.id} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.asset} <span style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase" }}>{t.exchange}</span></div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Entry ${t.entry_price.toLocaleString()} · ${t.size_usdt} USDT</div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>SL ${t.stop_loss?.toLocaleString()} → TP ${t.target?.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  {statusIcon(t.status)}
                  <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{new Date(t.opened_at).toLocaleDateString("nl-NL")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gesloten trades */}
      {closedTrades.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Gesloten trades</div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                  {["Asset", "Exchange", "Entry", "Sluit", "P&L", "Datum"].map(h => (
                    <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closedTrades.slice(0, 20).map((t, i) => {
                  const pnl = t.close_price !== null
                    ? parseFloat(((t.close_price - t.entry_price) / t.entry_price * t.size_usdt).toFixed(2))
                    : null;
                  return (
                    <tr key={t.id} style={{ borderBottom: i < closedTrades.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={{ padding: "6px 10px", fontWeight: 600 }}>{t.asset}</td>
                      <td style={{ padding: "6px 10px", textTransform: "uppercase" }}>{t.exchange}</td>
                      <td style={{ padding: "6px 10px" }}>${t.entry_price.toLocaleString()}</td>
                      <td style={{ padding: "6px 10px" }}>{t.close_price ? `$${t.close_price.toLocaleString()}` : "—"}</td>
                      <td style={{ padding: "6px 10px", color: pnl !== null ? pnlColor(pnl) : "var(--text-secondary)", fontWeight: 600 }}>
                        {pnl !== null ? `${pnl >= 0 ? "+" : ""}$${pnl}` : "—"}
                      </td>
                      <td style={{ padding: "6px 10px", color: "var(--text-secondary)" }}>
                        {t.closed_at ? new Date(t.closed_at).toLocaleDateString("nl-NL") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {trades.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 16px", color: "var(--text-secondary)", fontSize: 12 }}>
          Nog geen copy trades. Activeer copy trading hierboven om automatisch mee te handelen bij het volgende Marcus-signaal.
        </div>
      )}
    </div>
  );
}
