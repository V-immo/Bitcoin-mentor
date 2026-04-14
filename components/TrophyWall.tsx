"use client";

import { useEffect, useState, useRef } from "react";

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
  loginStreak: number;
  xp: number;
  level: number;
  weeklyProgress: Record<string, number>;
  premCount: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  trading:     "Trading",
  leren:       "Leren",
  consistentie: "Consistentie",
  setup:       "Voorbereiding",
};

const WEEKLY_CHALLENGES = [
  { id: "weekly_trades_3",  icon: "📊", name: "3 trades deze week",         target: 3, unit: "trades" },
  { id: "weekly_journal_3", icon: "✍️", name: "3 journal entries",           target: 3, unit: "entries" },
  { id: "weekly_login_5",   icon: "📅", name: "5 dagen ingelogd",            target: 5, unit: "dagen" },
];

const LEVEL_XP = [0, 0, 200, 600, 1200, 2000]; // XP nodig voor elk level
function xpForNextLevel(level: number, xp: number): { needed: number; current: number; pct: number } {
  const floor = LEVEL_XP[Math.min(level, 5)] ?? 0;
  const ceil  = LEVEL_XP[Math.min(level + 1, 5)] ?? 2000;
  if (level >= 5) return { needed: ceil, current: xp, pct: 100 };
  const current = Math.max(0, xp - floor);
  const needed  = ceil - floor;
  return { needed, current, pct: Math.min(100, Math.round((current / needed) * 100)) };
}

const LS_KEY = "trophy-earned-ids";

export default function TrophyWall() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [activeTab, setActiveTab] = useState<"badges" | "challenges">("badges");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const notifiedRef = useRef(false);

  useEffect(() => {
    fetch("/api/me/achievements")
      .then(r => r.ok ? r.json() : null)
      .then((d: AchievementsData | null) => {
        if (!d) return;
        setData(d);

        // Detecteer nieuw verdiende badges
        const earned = new Set(d.achievements.filter(a => a.earned).map(a => a.id));
        const prev   = new Set<string>(JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"));
        const fresh  = [...earned].filter(id => !prev.has(id));
        setNewIds(new Set(fresh));

        // Sla huidige staat op
        localStorage.setItem(LS_KEY, JSON.stringify([...earned]));

        // Marcus feliciteert bij nieuwe badge (eenmalig per sessie)
        if (fresh.length > 0 && !notifiedRef.current) {
          notifiedRef.current = true;
          const badge = d.achievements.find(a => a.id === fresh[0]);
          if (badge) {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("marcus-price-alert", {
                detail: {
                  message: `[BADGE ONTGRENDELD: ${badge.icon} ${badge.name}]\n\n${badge.desc}\n\nNieuwe prestatie behaald — vertel me hoe het voelde.`,
                },
              }));
            }, 2000);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const { achievements, earned, total, completedPct, loginStreak, xp, level, weeklyProgress } = data;
  const xpInfo = xpForNextLevel(level, xp);
  const categories = ["all", ...Object.keys(CATEGORY_LABELS)];
  const filtered   = activeCategory === "all" ? achievements : achievements.filter(a => a.category === activeCategory);
  const sorted     = [...filtered].sort((a, b) => {
    const aN = newIds.has(a.id) ? 0 : a.earned ? 1 : 2;
    const bN = newIds.has(b.id) ? 0 : b.earned ? 1 : 2;
    return aN - bN;
  });

  return (
    <div style={{
      background: "var(--surface-1, rgba(255,255,255,0.02))",
      border: "1px solid var(--border, rgba(255,255,255,0.08))",
      borderRadius: 16,
      marginBottom: 24,
      overflow: "hidden",
    }}>
      {/* Hero: streak + XP */}
      <div style={{
        padding: "18px 20px",
        background: "linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(249,115,22,0.05) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          {/* Streak */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 32, lineHeight: 1 }}>
              {loginStreak >= 7 ? "🔥🔥" : loginStreak >= 3 ? "🔥" : "💤"}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b", lineHeight: 1 }}>
                {loginStreak}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                dagen streak
              </div>
            </div>
          </div>

          {/* Level + badges */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
              Level {level} <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>/ 5</span>
            </div>
            <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 2 }}>
              {xp.toLocaleString("nl-NL")} XP
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              🏅 {earned}/{total} badges
            </div>
          </div>
        </div>

        {/* XP progress bar */}
        {level < 5 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
              <span>Level {level}</span>
              <span>{xpInfo.current}/{xpInfo.needed} XP naar level {level + 1}</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${xpInfo.pct}%`,
                background: "linear-gradient(90deg, #f59e0b, #f97316)",
                borderRadius: 99, transition: "width 0.8s ease",
              }} />
            </div>
          </div>
        )}

        {/* Totaal progress bar */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
            <span>Trophy Wall</span>
            <span>{completedPct}% voltooid</span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${completedPct}%`,
              background: "linear-gradient(90deg, #a78bfa, #e91e63)",
              borderRadius: 99, transition: "width 0.8s ease",
            }} />
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(["badges", "challenges"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "5px 14px", borderRadius: 99,
              border: `1px solid ${activeTab === tab ? "#f59e0b" : "rgba(255,255,255,0.1)"}`,
              cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: activeTab === tab ? "rgba(245,158,11,0.15)" : "transparent",
              color: activeTab === tab ? "#f59e0b" : "var(--text-muted)",
              transition: "all 0.15s",
            }}>
              {tab === "badges" ? `🏅 Badges ${newIds.size > 0 ? `(${newIds.size} nieuw!)` : ""}` : "⚡ Challenges"}
            </button>
          ))}
        </div>

        {activeTab === "badges" && (
          <>
            {/* Categorie filter */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                  padding: "3px 10px", borderRadius: 99,
                  border: `1px solid ${activeCategory === cat ? "#f59e0b" : "rgba(255,255,255,0.1)"}`,
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
              gridTemplateColumns: "repeat(auto-fill, minmax(95px, 1fr))",
              gap: 8,
            }}>
              {sorted.map(a => {
                const isNew = newIds.has(a.id);
                return (
                  <div
                    key={a.id}
                    title={a.desc}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      padding: "12px 6px", borderRadius: 12, position: "relative",
                      background: isNew
                        ? "rgba(233,30,99,0.15)"
                        : a.earned
                          ? "rgba(245,158,11,0.1)"
                          : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isNew ? "rgba(233,30,99,0.5)" : a.earned ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.06)"}`,
                      opacity: a.earned ? 1 : 0.4,
                      transition: "all 0.2s",
                      animation: isNew ? "badge-shine 2s ease-in-out 3" : "none",
                    }}
                  >
                    {isNew && (
                      <div style={{
                        position: "absolute", top: -6, right: -4,
                        background: "#e91e63", color: "#fff",
                        fontSize: 8, fontWeight: 800,
                        borderRadius: 99, padding: "1px 5px",
                        letterSpacing: "0.03em",
                      }}>
                        NEW
                      </div>
                    )}
                    <div style={{
                      fontSize: 24, marginBottom: 6,
                      filter: a.earned ? "none" : "grayscale(1)",
                    }}>
                      {a.icon}
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 700, textAlign: "center",
                      color: isNew ? "#e91e63" : a.earned ? "#f59e0b" : "var(--text-muted)",
                      lineHeight: 1.3,
                    }}>
                      {a.name}
                    </div>
                    {a.earned && !isNew && (
                      <div style={{ fontSize: 8, color: "#22d47a", marginTop: 3, fontWeight: 600 }}>✓ behaald</div>
                    )}
                  </div>
                );
              })}
            </div>

            <style>{`
              @keyframes badge-shine {
                0%, 100% { box-shadow: 0 0 0 0 rgba(233,30,99,0.4); }
                50% { box-shadow: 0 0 12px 4px rgba(233,30,99,0.35); }
              }
            `}</style>
          </>
        )}

        {activeTab === "challenges" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
              Wekelijkse challenges — reset elke maandag
            </div>
            {WEEKLY_CHALLENGES.map(ch => {
              const progress = weeklyProgress[ch.id] ?? 0;
              const done = progress >= ch.target;
              const pct  = Math.min(100, Math.round((progress / ch.target) * 100));
              return (
                <div key={ch.id} style={{
                  padding: "12px 14px", borderRadius: 12,
                  background: done ? "rgba(34,212,122,0.08)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${done ? "rgba(34,212,122,0.25)" : "rgba(255,255,255,0.07)"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{ch.icon}</span>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                        {ch.name}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: done ? "#22d47a" : "var(--text-muted)" }}>
                      {done ? "✓" : `${progress}/${ch.target}`}
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
          </div>
        )}
      </div>
    </div>
  );
}
