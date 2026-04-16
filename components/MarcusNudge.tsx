"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "marcus-nudge-dismissed";
const GREETING_KEY = "marcus-greeting-dismissed";
const EVENING_KEY = "marcus-evening-dismissed";

export default function MarcusNudge() {
  const [nudge, setNudge] = useState<string | null>(null);
  const [morningGreeting, setMorningGreeting] = useState<string | null>(null);
  const [inactiveDays, setInactiveDays] = useState(0);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [eveningVisible, setEveningVisible] = useState(false);
  const [eveningReview, setEveningReview] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    // Fetch nudge + morning greeting
    const nudgeDismissed = localStorage.getItem(DISMISS_KEY) === today;
    const greetingDismissed = localStorage.getItem(GREETING_KEY) === today;

    const eveningDismissedCheck = localStorage.getItem(EVENING_KEY) === today;
    if (!nudgeDismissed || !greetingDismissed || !eveningDismissedCheck) {
      fetch("/api/me/nudge")
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          if (data.nudge && !nudgeDismissed) {
            setNudge(data.nudge);
            setInactiveDays(data.inactiveDays ?? 0);
            setNudgeVisible(true);
          }
          if (data.morningGreeting && !greetingDismissed) {
            setMorningGreeting(data.morningGreeting);
            setGreetingVisible(true);
          }
          if (data.eveningReview && !eveningDismissedCheck) {
            setEveningReview(data.eveningReview);
          }
        })
        .catch(() => {});
    }

    const hour = new Date().getHours();
    if (hour >= 16 && !eveningDismissedCheck) {
      setEveningVisible(true);
    }
  }, []);

  function dismissNudge() {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString().slice(0, 10));
    setNudgeVisible(false);
  }

  function dismissGreeting() {
    localStorage.setItem(GREETING_KEY, new Date().toISOString().slice(0, 10));
    setGreetingVisible(false);
  }

  function dismissEvening() {
    localStorage.setItem(EVENING_KEY, new Date().toISOString().slice(0, 10));
    setEveningVisible(false);
  }

  const hasAny = nudgeVisible || greetingVisible || eveningVisible;
  if (!hasAny) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>

      {/* Morning greeting */}
      {greetingVisible && morningGreeting && (
        <div className="card" style={{
          display: "flex", alignItems: "flex-start", gap: 12, position: "relative",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #e91e63, #9c27b0)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
          }}>🌅</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", marginBottom: 3 }}>Marcus · Goedemorgen</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--text)" }}>
              {morningGreeting}
            </p>
          </div>
          <button onClick={dismissGreeting} style={closeBtn} title="Sluiten">✕</button>
        </div>
      )}

      {/* Comeback nudge */}
      {nudgeVisible && nudge && (
        <div className="card" style={{
          display: "flex", alignItems: "flex-start", gap: 12, position: "relative",
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "linear-gradient(135deg, #e91e63, #9c27b0)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
          }}>🧠</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>Marcus</span>
              {inactiveDays >= 2 && (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: "var(--text-muted)",
                  background: "rgba(148,163,184,0.1)", borderRadius: 4, padding: "1px 6px",
                }}>
                  {inactiveDays} dagen inactief
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--text)" }}>
              {nudge}
            </p>
          </div>
          <button onClick={dismissNudge} style={closeBtn} title="Sluiten">✕</button>
        </div>
      )}

      {/* Evening review */}
      {eveningVisible && (
        <div className="card" style={{
          display: "flex", alignItems: "center", gap: 12, position: "relative",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(233,30,99,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
          }}>🌙</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", marginBottom: 2 }}>Marcus · Dagafsluiting</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: "var(--text-secondary)" }}>
              {eveningReview ?? "Hoe ging je dag? Schrijf het op in je agenda — ook 1 zin helpt."}{" "}
              <a href="/agenda" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>Agenda →</a>
            </p>
          </div>
          <button onClick={dismissEvening} style={closeBtn} title="Sluiten">✕</button>
        </div>
      )}
    </div>
  );
}

const closeBtn: React.CSSProperties = {
  position: "absolute", top: 10, right: 10,
  background: "none", border: "none",
  color: "var(--text-muted)", cursor: "pointer", fontSize: 16, lineHeight: "1",
  padding: 4,
};
