"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "marcus-nudge-dismissed";

export default function MarcusNudge() {
  const [nudge, setNudge] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [inactiveDays, setInactiveDays] = useState(0);

  useEffect(() => {
    // Check of al vandaag gedismissed
    const dismissed = localStorage.getItem(DISMISS_KEY);
    const today = new Date().toISOString().slice(0, 10);
    if (dismissed === today) return;

    fetch("/api/me/nudge")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.nudge) {
          setNudge(data.nudge);
          setInactiveDays(data.inactiveDays ?? 0);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(DISMISS_KEY, today);
    setVisible(false);
  }

  if (!visible || !nudge) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(233,30,99,0.12) 0%, rgba(233,30,99,0.06) 100%)",
      border: "1px solid rgba(233,30,99,0.35)",
      borderRadius: 14,
      padding: "14px 16px",
      marginBottom: 16,
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      position: "relative",
    }}>
      {/* Avatar */}
      <div style={{
        width: 38, height: 38, borderRadius: "50%",
        background: "linear-gradient(135deg, #e91e63, #9c27b0)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>
        🧠
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e91e63" }}>Marcus</span>
          {inactiveDays >= 2 && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: "#94a3b8",
              background: "rgba(148,163,184,0.1)", borderRadius: 4, padding: "1px 6px",
            }}>
              {inactiveDays} dagen inactief
            </span>
          )}
        </div>
        <p style={{
          margin: 0, fontSize: 14, lineHeight: 1.55,
          color: "var(--text-primary, #fce8f0)",
        }}>
          {nudge}
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        style={{
          position: "absolute", top: 10, right: 10,
          background: "none", border: "none",
          color: "#64748b", cursor: "pointer", fontSize: 16, lineHeight: 1,
          padding: 4,
        }}
        title="Sluiten"
      >
        ✕
      </button>
    </div>
  );
}
