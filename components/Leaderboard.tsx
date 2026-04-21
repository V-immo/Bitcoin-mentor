"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Medal } from "lucide-react";

type LeaderboardEntry = {
  rank: number;
  username: string;
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  level: number;
  xp: number;
};

const MEDAL_COLORS: Record<number, string> = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" };

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: "1px solid #1a0f18" }}>
      {[40, 120, 80, 60, 60, 50].map((w, i) => (
        <td key={i} style={{ padding: "10px 8px" }}>
          <div
            style={{
              height: 12,
              width: w,
              borderRadius: 6,
              background: "var(--surface-1)",
              animation: "pulse 1.4s ease-in-out infinite",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function Leaderboard() {
  const { t, lang } = useLanguage();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const timeLocale = lang === "nl" ? "nl-BE" : "en-GB";

  async function fetchLeaderboard() {
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data: LeaderboardEntry[] = await res.json();
      setEntries(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("trade_error_load"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card">
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        .lb-rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-weight: 700;
          font-size: 12px;
          background: #2a1a28;
          color: #bf7a99;
        }
        .lb-row:hover td {
          background: #1a0f18;
        }
        .lb-row td {
          transition: background 0.1s;
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div className="label">{t("leaderboard_title")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {lastUpdated && (
            <span className="small-text muted">
              {lastUpdated.toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            className="btn-secondary"
            style={{ padding: "2px 10px", fontSize: 11 }}
            onClick={fetchLeaderboard}
            disabled={loading}
          >
            ↻
          </button>
        </div>
      </div>

      {error && (
        <div className="warning-box" style={{ marginBottom: 10 }}>
          {error}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #2a1a28" }}>
              <th style={{ padding: "6px 8px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>#</th>
              <th style={{ padding: "6px 8px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600 }}>{t("leaderboard_name")}</th>
              <th style={{ padding: "6px 8px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>{t("leaderboard_pnl")}</th>
              <th style={{ padding: "6px 8px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>{t("leaderboard_winrate")}</th>
              <th style={{ padding: "6px 8px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600 }}>{t("leaderboard_trades")}</th>
              <th style={{ padding: "6px 8px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600 }}>{t("leaderboard_quiz_lvl")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && entries.length === 0
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : entries.length === 0
              ? (
                <tr>
                  <td colSpan={6} style={{ padding: "24px 8px", textAlign: "center" }}>
                    <div className="muted small-text" style={{ marginBottom: 4 }}>{t("leaderboard_empty1")}</div>
                    <div className="muted small-text">{t("leaderboard_empty2")} <strong>{t("leaderboard_empty3")}</strong> {t("leaderboard_empty4")}</div>
                  </td>
                </tr>
              )
              : entries.map((entry) => (
                <tr key={entry.rank} className="lb-row" style={{ borderBottom: "1px solid #1a0f18" }}>
                  <td style={{ padding: "10px 8px" }}>
                    {MEDAL_COLORS[entry.rank] ? (
                      <Medal size={18} color={MEDAL_COLORS[entry.rank]} />
                    ) : (
                      <span className="lb-rank-badge">{entry.rank}</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 8px", fontWeight: 500, color: "var(--text)" }}>
                    {entry.username}
                  </td>
                  <td
                    style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600 }}
                    className={entry.totalPnl > 0 ? "green" : entry.totalPnl < 0 ? "red" : ""}
                  >
                    {entry.totalPnl >= 0 ? "+" : ""}
                    {entry.totalPnl.toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                    {entry.winRate.toFixed(1)}%
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                    {entry.totalTrades}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "1px 8px",
                      borderRadius: 10,
                      background: "var(--surface-1)",
                      color: "var(--primary)",
                      fontWeight: 700,
                      fontSize: 12,
                    }}>
                      {entry.level}
                    </span>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      <div className="small-text muted" style={{ marginTop: 8, textAlign: "right" }}>
        {t("leaderboard_refresh")}
      </div>
    </div>
  );
}
