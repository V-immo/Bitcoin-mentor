"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  start_capital: number;
  created_at: string;
  last_login_at: string | null;
  level: number | null;
  xp: number | null;
  streak: number | null;
  paper_assets: number;
  totalPnl: number;
  totalTrades: number;
};

type SortKey = "username" | "created_at" | "last_login_at" | "level" | "totalTrades" | "totalPnl";
type SortDir = "asc" | "desc";
type ActivityFilter = "all" | "active" | "inactive";

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function exportCsv(users: User[]) {
  const headers = ["ID", "Username", "Email", "Role", "Capital", "Registered", "Last Login", "Level", "XP", "Trades", "P&L"];
  const rows = users.map((u) => [
    u.id,
    u.username,
    u.email,
    u.role,
    u.start_capital,
    fmt(u.created_at),
    fmt(u.last_login_at),
    u.level ?? "",
    u.xp ?? "",
    u.totalTrades,
    u.totalPnl.toFixed(2),
  ]);
  const csv = [headers, ...rows].map((r) => r.map(String).map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `btcmentor-users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "user", startCapital: 10000 });
  const [createError, setCreateError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  function load(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    fetch("/api/admin/users")
      .then(async (r) => {
        const data = await r.json();
        if (r.ok && Array.isArray(data)) setUsers(data);
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { load(); }, []);

  async function deleteUser(id: number) {
    setDeleteError("");
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setDeleteError(data.error ?? "Delete failed"); return; }
    setConfirmDelete(null);
    load(true);
  }

  async function createUser() {
    setCreateError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setCreateError(data.error ?? "Failed to create user"); return; }
    setCreating(false);
    setNewUser({ username: "", email: "", password: "", role: "user", startCapital: 10000 });
    load(true);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    let result = users.filter(
      (u) =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    if (activityFilter === "active") {
      result = result.filter((u) => {
        const d = daysSince(u.last_login_at);
        return d !== null && d <= 7;
      });
    } else if (activityFilter === "inactive") {
      result = result.filter((u) => {
        const d = daysSince(u.last_login_at);
        return d === null || d > 7;
      });
    }

    result = [...result].sort((a, b) => {
      let av: number | string, bv: number | string;
      switch (sortKey) {
        case "username":   av = a.username.toLowerCase(); bv = b.username.toLowerCase(); break;
        case "created_at": av = a.created_at ?? ""; bv = b.created_at ?? ""; break;
        case "last_login_at": av = a.last_login_at ?? ""; bv = b.last_login_at ?? ""; break;
        case "level":      av = a.level ?? -1; bv = b.level ?? -1; break;
        case "totalTrades": av = a.totalTrades; bv = b.totalTrades; break;
        case "totalPnl":   av = a.totalPnl; bv = b.totalPnl; break;
        default:           return 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, search, activityFilter, sortKey, sortDir]);

  const inactiveCount = users.filter((u) => { const d = daysSince(u.last_login_at); return d === null || d > 7; }).length;

  if (loading) return <div className="admin-loading">Loading users…</div>;

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span style={{ opacity: 0.25, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: "var(--primary)" }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const thStyle: React.CSSProperties = { cursor: "pointer", userSelect: "none" };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          Users
          {refreshing && <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 10, opacity: 0.5 }}>refreshing…</span>}
        </h1>
        <div className="admin-header-actions">
          <input
            className="admin-search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="admin-btn" onClick={() => exportCsv(filtered)} title="Export as CSV">
            ⬇ CSV
          </button>
          <button className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}>
            + New user
          </button>
        </div>
      </div>

      {/* Activity filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["all", "active", "inactive"] as ActivityFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setActivityFilter(f)}
            style={{
              padding: "5px 14px",
              borderRadius: 99,
              border: "1px solid",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: activityFilter === f ? "rgba(233,30,99,0.15)" : "transparent",
              borderColor: activityFilter === f ? "rgba(233,30,99,0.4)" : "var(--border)",
              color: activityFilter === f ? "var(--primary)" : "var(--text-secondary)",
            }}
          >
            {f === "all" && `All (${users.length})`}
            {f === "active" && `Active ≤7d`}
            {f === "inactive" && `Inactive >7d${inactiveCount > 0 ? ` (${inactiveCount})` : ""}`}
          </button>
        ))}
      </div>

      {confirmDelete && (
        <div className="admin-modal-backdrop" onClick={() => { setConfirmDelete(null); setDeleteError(""); }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-title">Delete user</div>
            <p style={{ margin: "8px 0 16px" }}>
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This cannot be undone.
            </p>
            {deleteError && <div className="admin-error" style={{ marginBottom: 12 }}>{deleteError}</div>}
            <div className="admin-modal-actions">
              <button className="admin-btn" onClick={() => { setConfirmDelete(null); setDeleteError(""); }}>Cancel</button>
              <button className="admin-btn admin-btn-danger" onClick={() => deleteUser(confirmDelete.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {creating && (
        <div className="admin-modal-backdrop" onClick={() => setCreating(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-title">Create new user</div>
            <div className="admin-form-grid">
              <label>Username</label>
              <input className="admin-input" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
              <label>Email <span style={{opacity:0.4, fontWeight:400}}>(optional)</span></label>
              <input className="admin-input" type="email" placeholder="optional" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              <label>Password</label>
              <input className="admin-input" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              <label>Role</label>
              <select className="admin-input" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <label>Starting capital (€)</label>
              <input className="admin-input" type="number" value={newUser.startCapital} onChange={(e) => setNewUser({ ...newUser, startCapital: +e.target.value })} />
            </div>
            {createError && <div className="admin-error">{createError}</div>}
            <div className="admin-modal-actions">
              <button className="admin-btn" onClick={() => setCreating(false)}>Cancel</button>
              <button className="admin-btn admin-btn-primary" onClick={createUser}>Create</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={thStyle} onClick={() => toggleSort("username")}>
                User <SortIcon k="username" />
              </th>
              <th>Role</th>
              <th style={thStyle} onClick={() => toggleSort("created_at")}>
                Registered <SortIcon k="created_at" />
              </th>
              <th style={thStyle} onClick={() => toggleSort("last_login_at")}>
                Last login <SortIcon k="last_login_at" />
              </th>
              <th style={thStyle} onClick={() => toggleSort("level")}>
                Quiz <SortIcon k="level" />
              </th>
              <th style={thStyle} onClick={() => toggleSort("totalTrades")}>
                Trades <SortIcon k="totalTrades" />
              </th>
              <th style={thStyle} onClick={() => toggleSort("totalPnl")}>
                P&amp;L <SortIcon k="totalPnl" />
              </th>
              <th>Capital</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const days = daysSince(u.last_login_at);
              const isInactive = days === null || days > 7;
              return (
                <tr key={u.id}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-user-name">{u.username}</div>
                      <div className="admin-user-email">{u.email}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`admin-badge${u.role === "admin" ? " admin-badge-admin" : ""}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>{fmt(u.created_at)}</td>
                  <td style={{ color: isInactive ? "var(--text-secondary)" : undefined }}>
                    {u.last_login_at ? (
                      <span title={new Date(u.last_login_at).toLocaleString()}>
                        {days === 0 ? "Today" : days === 1 ? "Yesterday" : days !== null ? `${days}d ago` : "—"}
                        {isInactive && days !== null && (
                          <span style={{ marginLeft: 5, fontSize: 10, color: "var(--orange)", verticalAlign: "middle" }}>●</span>
                        )}
                      </span>
                    ) : (
                      <span style={{ color: "var(--red)", fontSize: 12 }}>Never</span>
                    )}
                  </td>
                  <td>
                    {u.level != null ? (
                      <span>Lv{u.level} · {u.xp} XP</span>
                    ) : "—"}
                  </td>
                  <td>{u.totalTrades}</td>
                  <td className={u.totalPnl >= 0 ? "admin-green" : "admin-red"}>
                    € {u.totalPnl.toFixed(2)}
                  </td>
                  <td>€ {u.start_capital.toLocaleString("en-US")}</td>
                  <td>
                    <div className="admin-row-actions">
                      <Link href={`/admin/users/${u.id}`} className="admin-btn admin-btn-sm">
                        Detail
                      </Link>
                      <button
                        className="admin-btn admin-btn-sm admin-btn-danger"
                        onClick={() => setConfirmDelete({ id: u.id, name: u.username })}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="admin-empty">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
