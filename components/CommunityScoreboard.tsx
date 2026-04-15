"use client";
import { useEffect, useState } from "react";

type Trader = {
  codename: string;
  winRate: number;
  totalTrades: number;
  totalPnl: number;
  maxStreak: number;
};

type ScoreboardData = {
  globalWinRate: number;
  totalTrades: number;
  totalPnl: number;
  pnl24h: number;
  trades24h: number;
  bestStreak: number;
  activeTraders: number;
  topTraders: Trader[];
};

export default function CommunityScoreboard() {
  const [data, setData] = useState<ScoreboardData | null>(null);

  useEffect(() => {
    fetch("/api/community/scoreboard")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setData(d); })
      .catch(() => {});
  }, []);

  if (!data || data.totalTrades < 1) return null;

  return (
    <div style={{
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      padding: "18px 20px",
      marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>🏆 Traders Scoreboard</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Community — anoniem</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: data.globalWinRate >= 50 ? "var(--green)" : "#f05252" }}>
            {data.globalWinRate}%
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>globale winrate</div>
        </div>
      </div>

      {/* Global stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Trades", value: String(data.totalTrades) },
          { label: "24u trades", value: String(data.trades24h) },
          { label: "24u P&L", value: `${data.pnl24h >= 0 ? "+" : ""}€${Math.abs(data.pnl24h)}`, color: data.pnl24h >= 0 ? "var(--green)" : "#f05252" },
          { label: "Best streak", value: `${data.bestStreak}x` },
        ].map(item => (
          <div key={item.label} style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: 8,
            padding: "8px 10px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: item.color ?? "var(--text-primary)" }}>{item.value}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Top traders */}
      {data.topTraders.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Top traders
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.topTraders.slice(0, 5).map((t, i) => (
              <div key={t.codename} style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                background: i === 0 ? "rgba(234,179,8,0.06)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${i === 0 ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.05)"}`,
                borderRadius: 8,
              }}>
                <div style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t.codename}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.winRate >= 60 ? "var(--green)" : t.winRate >= 40 ? "#f0a500" : "#f05252" }}>
                  {t.winRate}%
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", width: 60, textAlign: "right" }}>
                  {t.totalTrades} trades
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.totalPnl >= 0 ? "var(--green)" : "#f05252", width: 64, textAlign: "right" }}>
                  {t.totalPnl >= 0 ? "+" : ""}€{Math.abs(t.totalPnl)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
