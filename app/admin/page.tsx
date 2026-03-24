"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  totalUsers: number;
  totalAdmins: number;
  activeToday: number;
  totalTrades: number;
  totalPnl: number;
  quizToday: number;
  avgLevel: number;
};

type ActivityEvent = {
  type: "login" | "quiz" | "trade";
  username: string;
  timestamp: string;
  detail: string;
};

const TYPE_ICON: Record<string, string> = { login: "🔑", quiz: "🧠", trade: "📈" };
const TYPE_LABEL: Record<string, string> = { login: "Login", quiz: "Quiz", trade: "Trade" };

function fmtActivity(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));

    fetch("/api/admin/activity")
      .then((r) => r.json())
      .then((d) => setActivity(Array.isArray(d) ? d : []))
      .finally(() => setActivityLoading(false));
  }, []);

  if (loading) return <div className="admin-loading">Loading statistics…</div>;
  if (!stats) return <div className="admin-loading">Error loading stats.</div>;

  const tiles = [
    { label: "Users", value: stats.totalUsers, icon: "👥", sub: `+ ${stats.totalAdmins} admins` },
    { label: "Active today", value: stats.activeToday, icon: "🟢", sub: "logged in today" },
    { label: "Paper trades", value: stats.totalTrades, icon: "📈", sub: "platform-wide" },
    {
      label: "Total P&L",
      value: `€ ${stats.totalPnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: stats.totalPnl >= 0 ? "💚" : "🔴",
      sub: "paper trading",
    },
    { label: "Quiz today", value: stats.quizToday, icon: "🧠", sub: "completions" },
    { label: "Avg. level", value: stats.avgLevel, icon: "⭐", sub: "quiz level" },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
        <span className="admin-page-sub">Platform statistics</span>
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

      <div className="admin-quick-links">
        <Link href="/admin/users" className="admin-quick-btn">
          👥 View all users →
        </Link>
        <Link href="/admin/capital" className="admin-quick-btn">
          💰 Assign capital →
        </Link>
      </div>

      <div className="admin-card" style={{ marginTop: 24 }}>
        <div className="admin-card-title" style={{ marginBottom: 12 }}>
          Recent activity
        </div>

        {activityLoading ? (
          <div className="admin-loading" style={{ padding: "12px 0" }}>Loading activity…</div>
        ) : activity.length === 0 ? (
          <div className="admin-empty-inline">No activity recorded yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {activity.map((ev, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 68px 130px 1fr",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 6px",
                  borderBottom: "1px solid #1a0f18",
                  fontSize: 13,
                }}
              >
                <span style={{ fontSize: 15, textAlign: "center" }}>{TYPE_ICON[ev.type]}</span>
                <span style={{
                  fontSize: 11, padding: "2px 6px", borderRadius: 10,
                  background: "#2a1a28", color: "#bf7a99", textAlign: "center", fontWeight: 600,
                }}>
                  {TYPE_LABEL[ev.type]}
                </span>
                <span style={{ color: "#e8d5e0", fontWeight: 500 }}>{ev.username}</span>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <span className="muted small-text">{ev.detail}</span>
                  <span className="muted small-text" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                    {fmtActivity(ev.timestamp)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
