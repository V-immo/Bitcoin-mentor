"use client";

import { useState } from "react";

type DowEntry = { day: string; wins: number; losses: number; pnl: number; wr: number };
type RevengeData = { count: number; wr: number; pnl: number };

type PatternsResponse = {
  analysis: string;
  dataPoints: number;
  stats: { totalTrades: number; totalWins: number; totalLosses: number; totalPnl: number; tradeDays: number };
  dowData?: DowEntry[];
  revengeTrades?: RevengeData | null;
};

const DOW_ORDER = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export default function PatternPanel() {
  const [data, setData] = useState<PatternsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/me/journal/patterns");
      if (!res.ok) throw new Error("fout");
      const json = await res.json() as PatternsResponse;
      setData(json);
      setLoaded(true);
    } catch {
      setError("Kon patronen niet laden. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  const sortedDow = data?.dowData
    ?.slice()
    .sort((a, b) => DOW_ORDER.indexOf(a.day) - DOW_ORDER.indexOf(b.day)) ?? [];

  const maxPnlAbs = sortedDow.length > 0
    ? Math.max(...sortedDow.map(d => Math.abs(d.pnl)), 1)
    : 1;

  return (
    <section className="stats-section">
      <div className="stats-section-header">
        <h2 className="stats-section-title">🧠 Jouw Patronen</h2>
        <p className="stats-section-sub">Marcus analyseert je trades, emoties en gedrag over de afgelopen 60 dagen.</p>
      </div>

      {!loaded && (
        <button
          className="admin-btn admin-btn-primary"
          onClick={load}
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          {loading ? "Analyseren…" : "Analyseer mijn patronen"}
        </button>
      )}

      {error && <p style={{ color: "var(--red)", fontSize: 13, marginTop: 8 }}>{error}</p>}

      {loaded && data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>

          {/* Samenvatting */}
          {data.stats.totalTrades > 0 && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "Trades", value: data.stats.totalTrades },
                { label: "Winrate", value: `${data.stats.totalTrades > 0 ? Math.round((data.stats.totalWins / data.stats.totalTrades) * 100) : 0}%` },
                { label: "P&L", value: `${data.stats.totalPnl >= 0 ? "+" : ""}€${data.stats.totalPnl.toFixed(0)}`, positive: data.stats.totalPnl >= 0 },
                { label: "Handelsdagen", value: data.stats.tradeDays },
              ].map(s => (
                <div key={s.label} className="pattern-stat-chip">
                  <span className="pattern-stat-chip-val" style={{ color: s.positive === false ? "var(--red)" : s.positive ? "var(--green)" : undefined }}>
                    {s.value}
                  </span>
                  <span className="pattern-stat-chip-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Dag-van-de-week grafiek */}
          {sortedDow.length > 1 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Winrate per dag
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80 }}>
                {sortedDow.map(d => {
                  const barH = Math.max(4, Math.round((Math.abs(d.pnl) / maxPnlAbs) * 64));
                  const isPos = d.pnl >= 0;
                  const total = d.wins + d.losses;
                  return (
                    <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 10, color: isPos ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                        {d.wr}%
                      </span>
                      <div
                        style={{
                          width: "100%", height: barH, borderRadius: 4,
                          background: isPos ? "var(--green)" : "var(--red)",
                          opacity: total === 0 ? 0.2 : 0.85,
                          transition: "height 0.3s",
                        }}
                        title={`${d.day}: ${d.wins}W/${d.losses}L, P&L €${d.pnl.toFixed(0)}`}
                      />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Revenge trading waarschuwing */}
          {data.revengeTrades && data.revengeTrades.count >= 2 && (
            <div style={{
              background: "rgba(240,82,82,0.1)", border: "1px solid rgba(240,82,82,0.3)",
              borderRadius: 8, padding: "10px 14px", fontSize: 13,
            }}>
              <div style={{ fontWeight: 700, color: "var(--red)", marginBottom: 4 }}>
                Revenge Trading Patroon
              </div>
              <div style={{ color: "var(--text)", lineHeight: 1.5 }}>
                {data.revengeTrades.count}× trade geopend binnen 24u na een verlies.
                Winrate: <strong>{data.revengeTrades.wr}%</strong> | P&L: <strong style={{ color: data.revengeTrades.pnl >= 0 ? "var(--green)" : "var(--red)" }}>
                  {data.revengeTrades.pnl >= 0 ? "+" : ""}€{data.revengeTrades.pnl.toFixed(0)}
                </strong>
              </div>
            </div>
          )}

          {/* Marcus analyse tekst */}
          <div style={{
            background: "rgba(233,30,99,0.06)", border: "1px solid rgba(233,30,99,0.15)",
            borderRadius: 10, padding: "12px 14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: "var(--primary)",
                color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>M</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Marcus · Patroonanalyse</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
              {data.analysis}
            </div>
          </div>

          <button
            className="admin-btn"
            onClick={load}
            disabled={loading}
            style={{ fontSize: 12, alignSelf: "flex-start" }}
          >
            {loading ? "Laden…" : "↻ Opnieuw analyseren"}
          </button>
        </div>
      )}
    </section>
  );
}
