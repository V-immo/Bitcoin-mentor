"use client";

import { useEffect, useState } from "react";

type RevenueStats = {
  proUsers: number;
  proActive: number;
  proMonthly: number;
  proYearly: number;
  proLifetime: number;
  revenueMonthlyEst: number;
  revenueYearlyEst: number;
  pendingUpgrades: number;
  recentPro: RecentProUser[];
};

type RecentProUser = {
  id: number;
  username: string;
  email: string;
  pro_until: string;
  created_at: string;
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function fmtProUntil(v: string | null) {
  if (!v || v === "") return "—";
  if (v === "2099-12-31") return "Lifetime";
  if (v.startsWith("pending-")) return `Pending (${v.replace("pending-", "")})`;
  return fmt(v);
}

function fmtEur(n: number) {
  return `€ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminRevenuePage() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<number | null>(null);

  function load() {
    fetch("/api/admin/revenue")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function revokePro(userId: number) {
    setRevoking(userId);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pro: 0, pro_until: null }),
    });
    setRevoking(null);
    load();
  }

  if (loading) return <div className="admin-loading">Loading revenue data…</div>;
  if (!stats) return <div className="admin-loading">Error loading revenue.</div>;

  const tiles = [
    { label: "Total PRO users", value: stats.proUsers, icon: "★", sub: "all time" },
    { label: "Active PRO", value: stats.proActive, icon: "◉", sub: "currently active" },
    { label: "Est. monthly revenue", value: fmtEur(stats.revenueMonthlyEst), icon: "→", sub: "rough estimate" },
    { label: "Est. yearly revenue", value: fmtEur(stats.revenueYearlyEst), icon: "→", sub: "based on plan mix" },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Revenue</h1>
        <span className="admin-page-sub">PRO subscriptions overview</span>
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
        <div className="admin-card" style={{ flex: "1 1 260px" }}>
          <div className="admin-card-title">Plan distribution</div>
          <table className="admin-table" style={{ marginTop: 12 }}>
            <tbody>
              <tr>
                <td>Monthly</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>{stats.proMonthly}</td>
              </tr>
              <tr>
                <td>Yearly</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>{stats.proYearly}</td>
              </tr>
              <tr>
                <td>Lifetime</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>{stats.proLifetime}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {stats.pendingUpgrades > 0 && (
          <div
            className="admin-card"
            style={{ flex: "1 1 260px", borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.06)" }}
          >
            <div className="admin-card-title" style={{ color: "var(--orange)" }}>
              Pending upgrades
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, margin: "12px 0 6px", color: "var(--orange)" }}>
              {stats.pendingUpgrades}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Handle manually — check payments and grant PRO via user detail page.
            </div>
          </div>
        )}
      </div>

      <div className="admin-card" style={{ marginTop: 24 }}>
        <div className="admin-card-title" style={{ marginBottom: 12 }}>Recent PRO activations</div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>PRO until</th>
                <th>Registered</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stats.recentPro.length === 0 && (
                <tr>
                  <td colSpan={5} className="admin-empty">No PRO users yet.</td>
                </tr>
              )}
              {stats.recentPro.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.username}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{u.email || "—"}</td>
                  <td>
                    <span
                      style={{
                        color: u.pro_until === "2099-12-31"
                          ? "var(--green)"
                          : u.pro_until?.startsWith("pending-")
                          ? "var(--orange)"
                          : "var(--text)",
                        fontWeight: 500,
                      }}
                    >
                      {fmtProUntil(u.pro_until)}
                    </span>
                  </td>
                  <td>{fmt(u.created_at)}</td>
                  <td>
                    <button
                      className="admin-btn admin-btn-sm admin-btn-danger"
                      disabled={revoking === u.id}
                      onClick={() => revokePro(u.id)}
                    >
                      {revoking === u.id ? "…" : "Revoke PRO"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
