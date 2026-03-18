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
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "user", startCapital: 10000 });
  const [createError, setCreateError] = useState("");

  function load() {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function deleteUser(id: number, name: string) {
    if (!confirm(`Gebruiker "${name}" verwijderen? Dit kan niet ongedaan worden.`)) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    load();
  }

  async function createUser() {
    setCreateError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    if (!res.ok) { setCreateError(data.error ?? "Fout"); return; }
    setCreating(false);
    setNewUser({ username: "", email: "", password: "", role: "user", startCapital: 10000 });
    load();
  }

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="admin-loading">Gebruikers laden…</div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Gebruikers</h1>
        <div className="admin-header-actions">
          <input
            className="admin-search"
            placeholder="Zoek op naam of e-mail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}>
            + Nieuwe gebruiker
          </button>
        </div>
      </div>

      {/* Create modal */}
      {creating && (
        <div className="admin-modal-backdrop" onClick={() => setCreating(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-title">Nieuwe gebruiker aanmaken</div>
            <div className="admin-form-grid">
              <label>Gebruikersnaam</label>
              <input className="admin-input" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
              <label>E-mail <span style={{opacity:0.4, fontWeight:400}}>(optioneel)</span></label>
              <input className="admin-input" type="email" placeholder="optioneel" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              <label>Wachtwoord</label>
              <input className="admin-input" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              <label>Rol</label>
              <select className="admin-input" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <label>Startkapitaal (€)</label>
              <input className="admin-input" type="number" value={newUser.startCapital} onChange={(e) => setNewUser({ ...newUser, startCapital: +e.target.value })} />
            </div>
            {createError && <div className="admin-error">{createError}</div>}
            <div className="admin-modal-actions">
              <button className="admin-btn" onClick={() => setCreating(false)}>Annuleren</button>
              <button className="admin-btn admin-btn-primary" onClick={createUser}>Aanmaken</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Gebruiker</th>
              <th>Rol</th>
              <th>Geregistreerd</th>
              <th>Laatste login</th>
              <th>Quiz</th>
              <th>Trades</th>
              <th>P&amp;L</th>
              <th>Kapitaal</th>
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
                <td>€ {u.start_capital.toLocaleString("nl-NL")}</td>
                <td>
                  <div className="admin-row-actions">
                    <Link href={`/admin/users/${u.id}`} className="admin-btn admin-btn-sm">
                      Detail
                    </Link>
                    <button
                      className="admin-btn admin-btn-sm admin-btn-danger"
                      onClick={() => deleteUser(u.id, u.username)}
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="admin-empty">Geen gebruikers gevonden.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
