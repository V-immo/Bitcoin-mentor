"use client";

import { useEffect, useState } from "react";

type Announcement = {
  id: number;
  title: string;
  message: string;
  target: string;
  created_by: number | null;
  created_at: string;
};

function fmtDt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminBroadcastPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    title: "",
    message: "",
    target: "all" as "all" | "pro",
  });

  function load() {
    fetch("/api/admin/broadcast")
      .then((r) => r.json())
      .then((d) => setAnnouncements(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function send() {
    setError("");
    setSuccess("");
    if (!form.title.trim() || !form.message.trim()) {
      setError("Title and message are required.");
      return;
    }
    setSending(true);
    const res = await fetch("/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({})) as { error?: string };
    setSending(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to send announcement.");
      return;
    }
    setSuccess("Announcement sent.");
    setForm({ title: "", message: "", target: "all" });
    load();
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Broadcast</h1>
        <span className="admin-page-sub">Send announcements to users</span>
      </div>

      <div className="admin-card" style={{ maxWidth: 560 }}>
        <div className="admin-card-title" style={{ marginBottom: 16 }}>New announcement</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              Title
            </label>
            <input
              className="admin-input"
              style={{ width: "100%" }}
              placeholder="Announcement title…"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              Message
            </label>
            <textarea
              className="admin-input"
              style={{ width: "100%", minHeight: 120, resize: "vertical", fontFamily: "inherit" }}
              placeholder="Your message to users…"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              Target audience
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["all", "pro"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, target: t })}
                  style={{
                    padding: "6px 18px",
                    borderRadius: 99,
                    border: "1px solid",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: form.target === t ? "rgba(233,30,99,0.15)" : "transparent",
                    borderColor: form.target === t ? "rgba(233,30,99,0.4)" : "var(--border)",
                    color: form.target === t ? "var(--primary)" : "var(--text-muted)",
                  }}
                >
                  {t === "all" ? "All users" : "PRO only"}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="admin-error">{error}</div>}
          {success && (
            <div style={{ color: "var(--green)", fontSize: 13, fontWeight: 600 }}>
              ✓ {success}
            </div>
          )}

          <div>
            <button
              className="admin-btn admin-btn-primary"
              disabled={sending}
              onClick={send}
            >
              {sending ? "Sending…" : "Send announcement"}
            </button>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 24 }}>
        <div className="admin-card-title" style={{ marginBottom: 12 }}>Past announcements</div>

        {loading ? (
          <div className="admin-loading" style={{ padding: "12px 0" }}>Loading…</div>
        ) : announcements.length === 0 ? (
          <div className="admin-empty-inline">No announcements yet.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Target</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((a) => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--text-muted)" }}>
                      {fmtDt(a.created_at)}
                    </td>
                    <td style={{ fontWeight: 500 }}>{a.title}</td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 99,
                          fontWeight: 600,
                          background: a.target === "pro"
                            ? "rgba(233,30,99,0.12)"
                            : "rgba(255,255,255,0.06)",
                          color: a.target === "pro" ? "var(--primary)" : "var(--text-muted)",
                        }}
                      >
                        {a.target === "pro" ? "PRO" : "All"}
                      </span>
                    </td>
                    <td
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 13,
                        maxWidth: 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.message}
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
