"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type UserDetail = {
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    start_capital: number;
    created_at: string;
    last_login_at: string | null;
  };
  quiz: {
    level: number;
    xp: number;
    streak: number;
    lastQuizDate: string;
    weakTopics: string[];
    history: { date: string; score: number; total: number; topics: string[] }[];
  } | null;
  papers: {
    asset: string;
    cash: number;
    startingBalance: number;
    position: { side: string; entryPrice: number; amount: number } | null;
    history: { pnl?: number; date?: string }[];
    updatedAt: string;
  }[];
  notes: {
    id: number;
    note: string;
    created_at: string;
    admin_name: string;
  }[];
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newCapital, setNewCapital] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [resetting, setResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [sendMsgResult, setSendMsgResult] = useState("");

  function load() {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setNewRole(d.user.role);
        setNewCapital(d.user.start_capital);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  async function save() {
    setSaving(true);
    setMsg("");
    const body: Record<string, unknown> = {};
    if (newRole !== data?.user.role) body.role = newRole;
    if (newCapital !== "" && newCapital !== data?.user.start_capital) body.startCapital = newCapital;
    if (note.trim()) body.note = note.trim();

    if (Object.keys(body).length === 0) { setSaving(false); return; }

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Saved ✓");
      setNote("");
      load();
      setTimeout(() => setMsg(""), 2000);
    }
  }

  async function deleteUser() {
    if (!confirm(`Permanently delete user "${data?.user.username}"?`)) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    router.push("/admin/users");
  }

  async function resetPassword() {
    if (!confirm(`Reset password for "${data?.user.username}"? A temporary password will be generated.`)) return;
    setResetting(true);
    setTempPassword(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: "POST" });
      const d = await res.json();
      if (res.ok && d.tempPassword) {
        setTempPassword(d.tempPassword);
      } else {
        alert(d.error ?? "Reset failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setResetting(false);
    }
  }

  async function sendAdminMessage() {
    if (!adminMessage.trim()) return;
    setSendingMsg(true);
    setSendMsgResult("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: adminMessage.trim() }),
      });
      if (res.ok) {
        setSendMsgResult("Saved as note ✓");
        setAdminMessage("");
        load();
        setTimeout(() => setSendMsgResult(""), 3000);
      } else {
        setSendMsgResult("Save failed");
      }
    } catch {
      setSendMsgResult("Network error");
    } finally {
      setSendingMsg(false);
    }
  }

  if (loading) return <div className="admin-loading">Loading…</div>;
  if (!data || (data as { error?: string }).error) return <div className="admin-loading">User not found.</div>;

  const { user, quiz, papers, notes } = data;

  const totalPnl = papers.reduce((sum, p) => {
    return sum + p.history.reduce((s, t) => s + (t.pnl ?? 0), 0);
  }, 0);

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <Link href="/admin/users" className="admin-back-link">← Users</Link>
          <h1 className="admin-page-title">{user.username}</h1>
          <span className="admin-page-sub">{user.email}</span>
        </div>
        <button className="admin-btn admin-btn-danger" onClick={deleteUser}>
          Delete account
        </button>
      </div>

      <div className="admin-detail-grid">

        {/* User info + edit */}
        <section className="admin-card">
          <div className="admin-card-title">User info</div>
          <div className="admin-info-rows">
            <div className="admin-info-row"><span>ID</span><span>{user.id}</span></div>
            <div className="admin-info-row"><span>Created</span><span>{fmt(user.created_at)}</span></div>
            <div className="admin-info-row"><span>Last login</span><span>{fmt(user.last_login_at)}</span></div>
          </div>

          <div className="admin-form-inline">
            <label>Role</label>
            <select className="admin-input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="admin-form-inline">
            <label>Starting capital (€)</label>
            <input
              className="admin-input"
              type="number"
              value={newCapital}
              onChange={(e) => setNewCapital(+e.target.value)}
            />
          </div>
          <div className="admin-form-inline">
            <label>Admin note</label>
            <input
              className="admin-input"
              placeholder="Optional note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <button className="admin-btn admin-btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          {msg && <span className="admin-success-msg">{msg}</span>}

          {/* Reset password */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #2a1a28" }}>
            <div className="admin-label" style={{ marginBottom: 8 }}>Reset password</div>
            <button
              className="admin-btn"
              style={{ background: "#2a1a28", color: "#bf7a99", border: "1px solid #3a2a38" }}
              onClick={resetPassword}
              disabled={resetting}
            >
              {resetting ? "Resetting…" : "🔑 Generate temporary password"}
            </button>
            {tempPassword && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 14px",
                  background: "#1a0f18",
                  borderRadius: 8,
                  border: "1px solid #4caf5060",
                }}
              >
                <div className="admin-label" style={{ fontSize: 11, marginBottom: 4, color: "#4caf50" }}>
                  Temporary password (copy now!)
                </div>
                <code style={{ fontSize: 18, letterSpacing: 2, color: "#e8d5e0", fontFamily: "monospace" }}>
                  {tempPassword}
                </code>
              </div>
            )}
          </div>

          {/* Send message */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #2a1a28" }}>
            <div className="admin-label" style={{ marginBottom: 8 }}>Send message (saved as note)</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="admin-input"
                placeholder="Type a message for the user…"
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                style={{ flex: 1 }}
                onKeyDown={(e) => e.key === "Enter" && sendAdminMessage()}
              />
              <button
                className="admin-btn admin-btn-primary"
                onClick={sendAdminMessage}
                disabled={sendingMsg || !adminMessage.trim()}
                style={{ flexShrink: 0 }}
              >
                {sendingMsg ? "…" : "Send"}
              </button>
            </div>
            {sendMsgResult && (
              <div className="admin-success-msg" style={{ marginTop: 6 }}>{sendMsgResult}</div>
            )}
          </div>
        </section>

        {/* Quiz progress */}
        <section className="admin-card">
          <div className="admin-card-title">Quiz progress</div>
          {quiz ? (
            <>
              <div className="admin-quiz-stats">
                <div className="admin-quiz-stat"><div className="admin-quiz-val">{quiz.level}</div><div>Level</div></div>
                <div className="admin-quiz-stat"><div className="admin-quiz-val">{quiz.xp}</div><div>XP</div></div>
                <div className="admin-quiz-stat"><div className="admin-quiz-val">{quiz.streak}🔥</div><div>Streak</div></div>
              </div>
              {quiz.weakTopics.length > 0 && (
                <div className="admin-weak-topics">
                  <div className="admin-label">Weak topics</div>
                  <div className="admin-tags">
                    {quiz.weakTopics.map((t) => (
                      <span key={t} className="admin-tag">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {quiz.history.length > 0 && (
                <div className="admin-quiz-history">
                  <div className="admin-label">Recent scores</div>
                  {quiz.history.slice(0, 10).map((h, i) => (
                    <div key={i} className="admin-quiz-history-row">
                      <span>{h.date}</span>
                      <span>{h.score}/{h.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="admin-empty-inline">No quiz activity yet.</div>
          )}
        </section>

        {/* Paper trading */}
        <section className="admin-card admin-card-wide">
          <div className="admin-card-title">
            Paper trading
            <span className="admin-card-sub">
              Total P&amp;L: <span className={totalPnl >= 0 ? "admin-green" : "admin-red"}>
                € {totalPnl.toFixed(2)}
              </span>
            </span>
          </div>
          {papers.length === 0 ? (
            <div className="admin-empty-inline">No paper trades yet.</div>
          ) : (
            <div className="admin-paper-list">
              {papers.map((p) => {
                const pnl = p.history.reduce((s, t) => s + (t.pnl ?? 0), 0);
                const winTrades = p.history.filter((t) => (t.pnl ?? 0) > 0).length;
                const winRate = p.history.length > 0 ? Math.round((winTrades / p.history.length) * 100) : 0;
                return (
                  <div key={p.asset} className="admin-paper-row">
                    <div className="admin-paper-asset">{p.asset}</div>
                    <div className="admin-paper-info">
                      <span>Balance: € {p.cash.toFixed(2)}</span>
                      <span>Start: € {p.startingBalance.toFixed(2)}</span>
                      <span>{p.history.length} trades</span>
                      <span>Win rate: {winRate}%</span>
                      <span className={pnl >= 0 ? "admin-green" : "admin-red"}>P&L: € {pnl.toFixed(2)}</span>
                      {p.position && (
                        <span className="admin-badge">
                          {p.position.side === "long" ? "📈" : "📉"} Open position
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Admin notes */}
        <section className="admin-card admin-card-wide">
          <div className="admin-card-title">Admin notes</div>
          {notes.length === 0 ? (
            <div className="admin-empty-inline">No notes.</div>
          ) : (
            <div className="admin-notes-list">
              {notes.map((n) => (
                <div key={n.id} className="admin-note-item">
                  <div className="admin-note-meta">
                    <span className="admin-note-author">{n.admin_name}</span>
                    <span className="admin-note-date">{fmt(n.created_at)}</span>
                  </div>
                  <div className="admin-note-text">{n.note}</div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
