"use client";

import { useEffect, useState } from "react";

type PlaybookStats = {
  totalBots: number;
  activeBots: number;
  simulationBots: number;
  liveBots: number;
  recentRuns: BotRun[];
  botsPerStrategy: StratCount[];
  botsPerExchange: ExchCount[];
};

type BotRun = {
  bot_id: number;
  bot_name: string;
  user_id: number;
  username: string;
  action: string;
  symbol: string;
  side: string;
  amount: number;
  price: number;
  status: string;
  note: string;
  created_at: string;
};

type StratCount = { strategy: string; count: number };
type ExchCount = { exchange: string; count: number };

function fmtDt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminPlaybookPage() {
  const [stats, setStats] = useState<PlaybookStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/playbook")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-loading">Loading playbook data…</div>;
  if (!stats) return <div className="admin-loading">Error loading playbook.</div>;

  const tiles = [
    { label: "Total strategies", value: stats.totalBots, icon: "○", sub: "all bots" },
    { label: "Active", value: stats.activeBots, icon: "◉", sub: "currently running" },
    { label: "Simulation", value: stats.simulationBots, icon: "→", sub: "paper mode" },
    { label: "Live", value: stats.liveBots, icon: "★", sub: "real money" },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Playbook</h1>
        <span className="admin-page-sub">Bot strategies &amp; execution log</span>
      </div>

      <div className="admin-stats-grid">
        {tiles.map((t) => (
          <div key={t.label} className="admin-stat-card">
            <div className="admin-stat-icon">{t.icon}</div>
            <div className="admin-stat-value">{t.value}</div>
            <div className="admin-stat-label">{t.label}</div>
            <div className="admin-stat-sub">{t.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
        <div className="admin-card" style={{ flex: "1 1 220px" }}>
          <div className="admin-card-title">Per strategy</div>
          {stats.botsPerStrategy.length === 0 ? (
            <div className="admin-empty-inline" style={{ marginTop: 8 }}>No data.</div>
          ) : (
            <table className="admin-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th style={{ textAlign: "right" }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {stats.botsPerStrategy.map((s) => (
                  <tr key={s.strategy}>
                    <td style={{ fontWeight: 500 }}>{s.strategy}</td>
                    <td style={{ textAlign: "right" }}>{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-card" style={{ flex: "1 1 220px" }}>
          <div className="admin-card-title">Per exchange</div>
          {stats.botsPerExchange.length === 0 ? (
            <div className="admin-empty-inline" style={{ marginTop: 8 }}>No data.</div>
          ) : (
            <table className="admin-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Exchange</th>
                  <th style={{ textAlign: "right" }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {stats.botsPerExchange.map((e) => (
                  <tr key={e.exchange}>
                    <td style={{ fontWeight: 500 }}>{e.exchange}</td>
                    <td style={{ textAlign: "right" }}>{e.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 24 }}>
        <div className="admin-card-title" style={{ marginBottom: 12 }}>Recent executions</div>
        {stats.recentRuns.length === 0 ? (
          <div className="admin-empty-inline">No executions recorded yet.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Bot</th>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Amount</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRuns.map((r) => (
                  <tr key={`${r.bot_id}-${r.created_at}`}>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--text-muted)" }}>
                      {fmtDt(r.created_at)}
                    </td>
                    <td style={{ fontWeight: 500 }}>{r.username ?? `#${r.user_id}`}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{r.bot_name ?? `#${r.bot_id}`}</td>
                    <td>{r.symbol}</td>
                    <td>
                      <span
                        style={{
                          color: r.side === "buy" ? "var(--green)" : r.side === "sell" ? "var(--red)" : "var(--text)",
                          fontWeight: 600,
                          fontSize: 12,
                          textTransform: "uppercase",
                        }}
                      >
                        {r.side || r.action || "—"}
                      </span>
                    </td>
                    <td>{r.amount > 0 ? r.amount.toFixed(6) : "—"}</td>
                    <td>{r.price > 0 ? `€ ${r.price.toLocaleString("en-US")}` : "—"}</td>
                    <td>
                      <span
                        style={{
                          color: r.status === "ok" ? "var(--green)" : r.status === "error" ? "var(--red)" : "var(--text-muted)",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
