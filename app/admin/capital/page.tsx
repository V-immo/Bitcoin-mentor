"use client";

import { useEffect, useState } from "react";

type UserCapital = {
  id: number;
  username: string;
  email: string;
  start_capital: number;
  role: string;
};

export default function AdminCapitalPage() {
  const [users, setUsers] = useState<UserCapital[]>([]);
  const [capitals, setCapitals] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [bulkAmount, setBulkAmount] = useState(10000);

  function load() {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data: UserCapital[]) => {
        setUsers(data.filter((u) => u.role === "user"));
        const caps: Record<number, number> = {};
        data.filter((u) => u.role === "user").forEach((u) => { caps[u.id] = u.start_capital; });
        setCapitals(caps);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function saveOne(userId: number) {
    setSaving((s) => ({ ...s, [userId]: true }));
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startCapital: capitals[userId] }),
    });
    setSaving((s) => ({ ...s, [userId]: false }));
    setSaved((s) => ({ ...s, [userId]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [userId]: false })), 2000);
    load();
  }

  async function applyBulk() {
    if (!confirm(`Set starting capital for ALL ${users.length} users to € ${bulkAmount.toLocaleString("en-US")}?`)) return;
    const updatedCaps: Record<number, number> = {};
    users.forEach((u) => { updatedCaps[u.id] = bulkAmount; });
    setCapitals(updatedCaps);

    for (const u of users) {
      await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startCapital: bulkAmount }),
      });
    }
    load();
  }

  if (loading) return <div className="admin-loading">Loading…</div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Assign capital</h1>
        <span className="admin-page-sub">Changes apply to new paper accounts. Existing positions are not reset.</span>
      </div>

      <div className="admin-card admin-bulk-card">
        <div className="admin-card-title">Bulk setting</div>
        <div className="admin-bulk-row">
          <label>Amount for all users</label>
          <div className="admin-capital-input-wrap">
            <span className="admin-capital-prefix">€</span>
            <input
              className="admin-input admin-capital-input"
              type="number"
              value={bulkAmount}
              onChange={(e) => setBulkAmount(+e.target.value)}
            />
          </div>
          <button className="admin-btn admin-btn-primary" onClick={applyBulk}>
            Apply to everyone
          </button>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-title">Per user</div>
        <div className="admin-capital-list">
          {users.map((u) => (
            <div key={u.id} className="admin-capital-row">
              <div className="admin-user-cell">
                <div className="admin-user-name">{u.username}</div>
                <div className="admin-user-email">{u.email}</div>
              </div>
              <div className="admin-capital-input-wrap">
                <span className="admin-capital-prefix">€</span>
                <input
                  className="admin-input admin-capital-input"
                  type="number"
                  value={capitals[u.id] ?? u.start_capital}
                  onChange={(e) => setCapitals((c) => ({ ...c, [u.id]: +e.target.value }))}
                />
              </div>
              <button
                className={`admin-btn${saved[u.id] ? " admin-btn-saved" : " admin-btn-primary"}`}
                onClick={() => saveOne(u.id)}
                disabled={saving[u.id]}
              >
                {saved[u.id] ? "✓ Saved" : saving[u.id] ? "…" : "Save"}
              </button>
            </div>
          ))}
          {users.length === 0 && (
            <div className="admin-empty-inline">No users found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
