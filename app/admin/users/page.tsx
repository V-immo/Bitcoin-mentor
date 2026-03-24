"use client";

import { useEffect, useState } from "react";
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

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
    if (!res.ok) {
      setDeleteError(data.error ?? "Delete failed");
      return;
    }
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

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="admin-loading">Loading users…</div>;

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
          <button className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}>
            + New user
          </button>
        </div>
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
              <th>User</th>
              <th>Role</th>
              <th>Registered</th>
              <th>Last login</th>
              <th>Quiz</th>
              <th>Trades</th>
              <th>P&amp;L</th>
              <th>Capital</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
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
                <td>{fmt(u.last_login_at)}</td>
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
            ))}
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
