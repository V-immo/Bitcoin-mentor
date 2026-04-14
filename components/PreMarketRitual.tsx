"use client";

import { useEffect, useState } from "react";

const CHECKLIST = [
  { id: "market",  icon: "📊", label: "BTC trend & marktoverzicht bekeken" },
  { id: "news",    icon: "📰", label: "Nieuws gecheckt — geen grote events verwacht" },
  { id: "capital", icon: "💰", label: "Mijn kapitaal en open posities gecheckt" },
  { id: "plan",    icon: "📋", label: "Trading plan gelezen — ik weet mijn regels" },
  { id: "risk",    icon: "🎯", label: "Max verlies voor vandaag bepaald" },
  { id: "mental",  icon: "🧠", label: "Mentale staat oké — niet gestrest of moe" },
  { id: "patience",icon: "⏳", label: "Ik wacht op goede setups, forceer niets" },
  { id: "nodumb",  icon: "🚫", label: "Geen impuls-trades, geen FOMO" },
];

type Props = { asset?: string };

export default function PreMarketRitual({ asset = "BTCUSDT" }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = `premarket-${today}`;

  const [checked, setChecked] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Herstel staat van vandaag
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved) as { checked: string[]; done: boolean; focus: string | null };
        setChecked(data.checked ?? []);
        setDone(data.done ?? false);
        setFocus(data.focus ?? null);
      }
    } catch { /* leeg */ }
  }, [storageKey]);

  function persist(newChecked: string[], newDone: boolean, newFocus: string | null) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ checked: newChecked, done: newDone, focus: newFocus }));
    } catch { /* quota */ }
  }

  function toggle(id: string) {
    setChecked(prev => {
      const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      persist(next, done, focus);
      return next;
    });
  }

  const allChecked = CHECKLIST.every(item => checked.includes(item.id));

  async function completRitual() {
    if (!allChecked) return;
    setLoading(true);
    try {
      const res = await fetch("/api/me/premarket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset }),
      });
      if (res.ok) {
        const data = await res.json() as { focus: string };
        setFocus(data.focus ?? null);
        setDone(true);
        persist(checked, true, data.focus ?? null);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  if (!mounted) return null;

  const checkedCount = checked.length;
  const total = CHECKLIST.length;
  const pct = Math.round((checkedCount / total) * 100);

  return (
    <div style={{
      background: "var(--surface, #1f0d17)",
      border: `1px solid ${done ? "rgba(34,197,94,0.35)" : "rgba(233,30,99,0.2)"}`,
      borderRadius: 16,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px",
        background: done
          ? "linear-gradient(135deg, rgba(34,197,94,0.12) 0%, transparent 60%)"
          : "linear-gradient(135deg, rgba(233,30,99,0.1) 0%, transparent 60%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>{done ? "✅" : "🌅"}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary, #fce8f0)" }}>
              Pre-market ritueel
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              {done ? "Voltooid — veel succes vandaag" : `${checkedCount}/${total} items`}
            </div>
          </div>
        </div>

        {/* Voortgangsbalk */}
        {!done && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 80, height: 6, background: "rgba(255,255,255,0.08)",
              borderRadius: 3, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${pct}%`,
                background: allChecked ? "#22c55e" : "#e91e63",
                borderRadius: 3, transition: "width 0.3s ease",
              }} />
            </div>
            <span style={{ fontSize: 11, color: "#64748b", minWidth: 30 }}>{pct}%</span>
          </div>
        )}
      </div>

      {/* Checklist */}
      {!done && (
        <div style={{ padding: "12px 18px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {CHECKLIST.map(item => {
              const isChecked = checked.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: isChecked ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isChecked ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 10, padding: "9px 12px",
                    cursor: "pointer", textAlign: "left", width: "100%",
                    transition: "all 0.15s",
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    background: isChecked ? "#22c55e" : "transparent",
                    border: `2px solid ${isChecked ? "#22c55e" : "rgba(255,255,255,0.2)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}>
                    {isChecked && <span style={{ fontSize: 11, color: "#fff", lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, lineHeight: 1.4 }}>
                    {item.icon} {" "}
                    <span style={{ color: isChecked ? "#22c55e" : "var(--text-primary, #fce8f0)", textDecoration: isChecked ? "line-through" : "none", opacity: isChecked ? 0.7 : 1 }}>
                      {item.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Complete knop */}
          <button
            onClick={completRitual}
            disabled={!allChecked || loading}
            style={{
              width: "100%", marginTop: 14,
              background: allChecked ? "#e91e63" : "rgba(255,255,255,0.05)",
              border: `1px solid ${allChecked ? "#e91e63" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 10, padding: "11px 0",
              color: allChecked ? "#fff" : "#475569",
              fontSize: 14, fontWeight: 700, cursor: allChecked ? "pointer" : "default",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Marcus denkt na…" : allChecked ? "🚀 Ritueel voltooien — vraag Marcus focus" : `Nog ${total - checkedCount} items over`}
          </button>
        </div>
      )}

      {/* Marcus dagfocus — na voltooien */}
      {done && focus && (
        <div style={{ padding: "14px 18px" }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(233,30,99,0.1) 0%, rgba(233,30,99,0.03) 100%)",
            border: "1px solid rgba(233,30,99,0.3)",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#e91e63",
              textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8,
            }}>
              Marcus — dagfocus
            </div>
            <div style={{
              fontSize: 13, lineHeight: 1.65,
              color: "var(--text-primary, #fce8f0)", whiteSpace: "pre-wrap",
            }}>
              {focus}
            </div>
          </div>

          {/* Reset optie */}
          <button
            onClick={() => {
              setDone(false);
              setChecked([]);
              setFocus(null);
              persist([], false, null);
            }}
            style={{
              marginTop: 10, background: "none", border: "none",
              color: "#475569", fontSize: 12, cursor: "pointer", padding: 0,
            }}
          >
            ↺ Opnieuw
          </button>
        </div>
      )}
    </div>
  );
}
