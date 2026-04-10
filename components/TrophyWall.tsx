"use client";

import { useEffect, useState } from "react";

type Achievement = {
  id: string;
  icon: string;
  name: string;
  desc: string;
  earned: boolean;
  category: string;
};

type AchievementsData = {
  achievements: Achievement[];
  earned: number;
  total: number;
  completedPct: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  trading: "Trading",
  leren: "Leren",
  consistentie: "Consistentie",
  setup: "Setup",
};

// ─── Weekly challenges (server-side progress from achievements data) ───────────
const WEEKLY_CHALLENGES = [
  {
    id: "weekly_trades_3",
    icon: "📊",
    name: "3 trades deze week",
    desc: "Sluit 3 paper trades af",
    unit: "trades",
  },
  {
    id: "weekly_journal_3",
    icon: "✍️",
    name: "Schrijf 3 journal entries",
    desc: "Reflecteer op je trades",
    unit: "entries",
  },
  {
    id: "weekly_quiz_2",
    icon: "🧠",
    name: "2 quiz sessies",
    desc: "Oefen je kennis",
    unit: "sessies",
  },
  {
    id: "weekly_login_5",
    icon: "📅",
    name: "5 dagen ingelogd",
    desc: "Bouw je streak op",
    unit: "dagen",
  },
];

export default function TrophyWall() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [weeklyChallengeProgress, setWeeklyChallengeProgress] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<"badges" | "challenges">("badges");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    fetch("/api/me/achievements")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && !d.error && setData(d))
      .catch(() => {});

    // Haal wekelijkse challenge voortgang op
    Promise.all([
      fetch("/api/me/journal").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/me/quiz").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([journal, quiz]) => {
      const progress: Record<string, number> = {};
      // Journal entries deze week
      if (journal?.entries) {
        const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
        const weekEntries = journal.entries.filter((e: { date?: string }) => {
          const d = new Date(e.date ?? 0).getTime();
          return d > weekAgo;
        });
        progress.weekly_journal_3 = Math.min(3, weekEntries.length);
      }
      // Quiz sessies
      if (quiz?.history) {
        const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
        const weekSessions = quiz.history.filter((s: { date?: string }) => {
          const d = new Date(s.date ?? 0).getTime();
          return d > weekAgo;
        });
        progress.weekly_quiz_2 = Math.min(2, weekSessions.length);
      }
      setWeeklyChallengeProgress(progress);
    });
  }, []);

  if (!data) return null;

  const { achievements, earned, total, completedPct } = data;
  const categories = ["all", ...Object.keys(CATEGORY_LABELS)];
  const filtered = activeCategory === "all"
    ? achievements
    : achievements.filter(a => a.category === activeCategory);

  // Gesorteerd: verdiend eerst
  const sorted = [...filtered].sort((a, b) => {
    if (a.earned === b.earned) return 0;
    return a.earned ? -1 : 1;
  });

  return (
    <div style={{
      background: "var(--surface-1, rgba(255,255,255,0.02))",
      border: "1px solid var(--border, rgba(255,255,255,0.08))",
      borderRadius: 16, padding: "18px 20px",
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>🏆 Trophy Wall</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            {earned}/{total} badges behaald
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{completedPct}%</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>voltooid</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", marginBottom: 16, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${completedPct}%`,
          background: "linear-gradient(90deg, #f59e0b, #f97316)",
          borderRadius: 99, transition: "width 0.8s ease",
        }} />
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["badges", "challenges"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "5px 14px", borderRadius: 99, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600,
            background: activeTab === tab ? "#f59e0b" : "rgba(255,255,255,0.06)",
            color: activeTab === tab ? "#000" : "var(--text-muted)",
            transition: "all 0.15s",
          }}>
            {tab === "badges" ? "🏅 Badges" : "⚡ Challenges"}
          </button>
        ))}
      </div>

      {activeTab === "badges" && (
        <>
          {/* Category filter */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                padding: "3px 10px", borderRadius: 99, border: "1px solid",
                borderColor: activeCategory === cat ? "#f59e0b" : "var(--border, rgba(255,255,255,0.1))",
                background: activeCategory === cat ? "rgba(245,158,11,0.15)" : "transparent",
                color: activeCategory === cat ? "#f59e0b" : "var(--text-muted)",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>
                {cat === "all" ? "Alle" : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Badge grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
            gap: 10,
          }}>
            {sorted.map(a => (
              <div key={a.id} title={a.desc} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "12px 8px", borderRadius: 12,
                background: a.earned
                  ? "rgba(245,158,11,0.12)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${a.earned ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.06)"}`,
                opacity: a.earned ? 1 : 0.45,
                transition: "opacity 0.2s",
                cursor: "default",
              }}>
                <div style={{ fontSize: 24, marginBottom: 6, filter: a.earned ? "none" : "grayscale(1)" }}>
                  {a.icon}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 700, textAlign: "center",
                  color: a.earned ? "#f59e0b" : "var(--text-muted)",
                  lineHeight: 1.3,
                }}>
                  {a.name}
                </div>
                {a.earned && (
                  <div style={{ fontSize: 8, color: "#22d47a", marginTop: 3, fontWeight: 600 }}>✓ behaald</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === "challenges" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
            Wekelijkse challenges — reset elke maandag
          </div>
          {WEEKLY_CHALLENGES.map(ch => {
            const targets: Record<string, number> = {
              weekly_trades_3: 3,
              weekly_journal_3: 3,
              weekly_quiz_2: 2,
              weekly_login_5: 5,
            };
            const target = targets[ch.id] ?? 1;
            const progress = weeklyChallengeProgress[ch.id] ?? 0;
            const done = progress >= target;
            const pct = Math.min(100, Math.round((progress / target) * 100));

            return (
              <div key={ch.id} style={{
                padding: "12px 14px", borderRadius: 12,
                background: done ? "rgba(34,212,122,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${done ? "rgba(34,212,122,0.25)" : "rgba(255,255,255,0.07)"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{ch.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{ch.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{ch.desc}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: done ? "#22d47a" : "var(--text-muted)" }}>
                    {done ? "✓ Klaar" : `${progress}/${target}`}
                  </div>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${pct}%`,
                    background: done ? "#22d47a" : "linear-gradient(90deg, #f59e0b, #f97316)",
                    borderRadius: 99, transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, textAlign: "center" }}>
            Meer challenges komen binnenkort 🚀
          </div>
        </div>
      )}
    </div>
  );
}
