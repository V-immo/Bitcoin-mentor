"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { BarChart3, Newspaper, DollarSign, ClipboardList, Target, Brain, Hourglass, Ban, CheckCircle2, Sunrise, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CHECKLIST: { id: string; icon: LucideIcon; label: string }[] = [
  { id: "market",  icon: BarChart3,    label: "BTC trend & marktoverzicht bekeken" },
  { id: "news",    icon: Newspaper,    label: "Nieuws gecheckt — geen grote events verwacht" },
  { id: "capital", icon: DollarSign,   label: "Mijn kapitaal en open posities gecheckt" },
  { id: "plan",    icon: ClipboardList,label: "Trading plan gelezen — ik weet mijn regels" },
  { id: "risk",    icon: Target,       label: "Max verlies voor vandaag bepaald" },
  { id: "mental",  icon: Brain,        label: "Mentale staat oké — niet gestrest of moe" },
  { id: "patience",icon: Hourglass,    label: "Ik wacht op goede setups, forceer niets" },
  { id: "nodumb",  icon: Ban,          label: "Geen impuls-trades, geen FOMO" },
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
        localStorage.setItem(`btcmentor-premarket-${today}`, "1");
        window.dispatchEvent(new Event("storage"));
      } else {
        toast("Ritual opslaan mislukt. Probeer opnieuw.", "error");
      }
    } catch { toast("Verbindingsfout.", "error"); }
    setLoading(false);
  }

  if (!mounted) return null;

  const checkedCount = checked.length;
  const total = CHECKLIST.length;
  const pct = Math.round((checkedCount / total) * 100);

  return (
    <div style={{
      background: "var(--surface)",
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
          <span style={{ fontSize: 20 }}>{done ? <CheckCircle2 size={20} color="var(--green)" /> : <Sunrise size={20} />}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              Pre-market ritueel
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
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
                background: allChecked ? "var(--green)" : "var(--primary)",
                borderRadius: 3, transition: "width 0.3s ease",
              }} />
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 30 }}>{pct}%</span>
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
                    background: isChecked ? "var(--green)" : "transparent",
                    border: `2px solid ${isChecked ? "var(--green)" : "rgba(255,255,255,0.2)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}>
                    {isChecked && <span style={{ fontSize: 11, color: "var(--text)", lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, lineHeight: 1.4 }}>
                    <item.icon size={14} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
                    <span style={{ color: isChecked ? "var(--green)" : "var(--text)", textDecoration: isChecked ? "line-through" : "none", opacity: isChecked ? 0.7 : 1 }}>
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
              background: allChecked ? "var(--primary)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${allChecked ? "var(--primary)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 10, padding: "11px 0",
              color: allChecked ? "#fff" : "var(--text-muted)",
              fontSize: 14, fontWeight: 700, cursor: allChecked ? "pointer" : "default",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Marcus denkt na…" : allChecked ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Rocket size={14} /> Ritueel voltooien — vraag Marcus focus</span> : `Nog ${total - checkedCount} items over`}
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
              fontSize: 11, fontWeight: 700, color: "var(--primary)",
              textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8,
            }}>
              Marcus — dagfocus
            </div>
            <div style={{
              fontSize: 13, lineHeight: 1.65,
              color: "var(--text)", whiteSpace: "pre-wrap",
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
              color: "var(--text-muted)", fontSize: 12, cursor: "pointer", padding: 0,
            }}
          >
            ↺ Opnieuw
          </button>
        </div>
      )}
    </div>
  );
}
