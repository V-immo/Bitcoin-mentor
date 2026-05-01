"use client";

import { useEffect, useState } from "react";
import { Moon, Zap, Brain, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

type WellnessData = {
  sleep_hours: number | null;
  stress_level: number | null;
  energy_level: number | null;
  mood: string | null;
  notes: string | null;
  date: string;
};

const MOODS = [
  { key: "goed",     label: "Goed",     color: "#22c55e" },
  { key: "neutraal", label: "Neutraal", color: "#f59e0b" },
  { key: "slecht",   label: "Slecht",   color: "#ef4444" },
];

function riskLevel(w: WellnessData): "high" | "medium" | "ok" | null {
  if (!w) return null;
  const sleep  = w.sleep_hours  ?? 8;
  const stress = w.stress_level ?? 2;
  const energy = w.energy_level ?? 4;
  const score  = (sleep < 6 ? 2 : 0) + (stress >= 4 ? 2 : stress >= 3 ? 1 : 0) + (energy <= 2 ? 1 : 0);
  if (score >= 3) return "high";
  if (score >= 1) return "medium";
  return "ok";
}

function DotRating({ value, max, onChange, color }: { value: number; max: number; onChange: (v: number) => void; color: string }) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i + 1)}
          style={{
            width: 24, height: 24, borderRadius: "50%", border: "none",
            cursor: "pointer",
            background: i < value ? color : "var(--surface)",
            outline: i < value ? `2px solid ${color}` : "1px solid var(--border)",
            transition: "all 0.15s",
          }}
        />
      ))}
    </div>
  );
}

export default function WellnessWidget() {
  const [data, setData]       = useState<WellnessData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [sleep, setSleep]     = useState(7);
  const [stress, setStress]   = useState(2);
  const [energy, setEnergy]   = useState(4);
  const [mood, setMood]       = useState("neutraal");
  const [notes, setNotes]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/wellness")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.today) {
          const t = d.today;
          setData(t);
          if (t.sleep_hours  != null) setSleep(t.sleep_hours);
          if (t.stress_level != null) setStress(t.stress_level);
          if (t.energy_level != null) setEnergy(t.energy_level);
          if (t.mood)                  setMood(t.mood);
          if (t.notes)                 setNotes(t.notes);
        } else {
          // Geen entry vandaag — toon het formulier direct
          setExpanded(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/me/wellness", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sleepHours: sleep, stressLevel: stress, energyLevel: energy, mood, notes }),
    }).catch(() => {});
    const newData: WellnessData = {
      sleep_hours: sleep, stress_level: stress, energy_level: energy,
      mood, notes, date: new Date().toISOString().slice(0, 10),
    };
    setData(newData);
    setSaving(false);
    setSaved(true);
    setExpanded(false);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return null;

  const risk = data ? riskLevel(data) : null;
  const riskColor = risk === "high" ? "#ef4444" : risk === "medium" ? "#f59e0b" : "#22c55e";
  const hasEntry = !!data?.sleep_hours;

  return (
    <div style={{
      background: "var(--surface-2)",
      border: `1px solid ${risk === "high" ? "#ef4444" : "var(--border)"}`,
      borderRadius: 12,
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      {/* Header */}
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Moon size={15} color="var(--accent)" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              Wellness check-in
              {saved && <span style={{ marginLeft: 8, fontSize: 10, color: "#22c55e" }}>opgeslagen</span>}
            </div>
            {hasEntry ? (
              <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", gap: 10, marginTop: 1 }}>
                <span><Moon size={10} style={{ marginRight: 2, verticalAlign: "middle" }} />{data!.sleep_hours}u</span>
                <span><Brain size={10} style={{ marginRight: 2, verticalAlign: "middle" }} />stress {data!.stress_level}/5</span>
                <span><Zap size={10} style={{ marginRight: 2, verticalAlign: "middle" }} />energie {data!.energy_level}/5</span>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Nog niet ingevuld vandaag</div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {risk === "high" && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#ef4444", fontWeight: 600 }}>
              <AlertTriangle size={13} /> Risico
            </div>
          )}
          {risk && hasEntry && (
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: riskColor, flexShrink: 0 }} />
          )}
          {expanded ? <ChevronUp size={14} color="var(--text-secondary)" /> : <ChevronDown size={14} color="var(--text-secondary)" />}
        </div>
      </div>

      {/* Formulier */}
      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border)" }}>
          {risk === "high" && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "8px 10px", marginTop: 10, marginBottom: 12, fontSize: 11, color: "#ef4444", lineHeight: 1.5 }}>
              <strong>Let op:</strong> Weinig slaap + hoge stress verhoogt jouw risico op slechte trades. Marcus zal je hierover aanspreken.
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
              <Moon size={11} /> Slaap (uur)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setSleep(h => Math.max(0, parseFloat((h - 0.5).toFixed(1))))} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontSize: 14, color: "var(--text-primary)" }}>−</button>
              <div style={{ fontSize: 18, fontWeight: 700, minWidth: 50, textAlign: "center", color: sleep < 6 ? "#ef4444" : sleep < 7 ? "#f59e0b" : "#22c55e" }}>{sleep}u</div>
              <button onClick={() => setSleep(h => Math.min(12, parseFloat((h + 0.5).toFixed(1))))} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontSize: 14, color: "var(--text-primary)" }}>+</button>
              <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                {sleep < 5 ? "Ernstig slaaptekort" : sleep < 6 ? "Onvoldoende" : sleep < 7 ? "Matig" : "Goed"}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
              <Brain size={11} /> Stress {stress}/5
            </label>
            <DotRating value={stress} max={5} onChange={setStress} color="#ef4444" />
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
              <Zap size={11} /> Energie {energy}/5
            </label>
            <DotRating value={energy} max={5} onChange={setEnergy} color="#22c55e" />
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Stemming</label>
            <div style={{ display: "flex", gap: 6 }}>
              {MOODS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMood(m.key)}
                  style={{
                    padding: "4px 12px", borderRadius: 20, border: "1px solid var(--border)",
                    background: mood === m.key ? m.color : "var(--surface)",
                    color: mood === m.key ? "#fff" : "var(--text-secondary)",
                    cursor: "pointer", fontSize: 12, fontWeight: mood === m.key ? 600 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optionele notitie (bijv. slecht geslapen door lawaai)…"
              maxLength={300}
              rows={2}
              style={{
                width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "7px 10px", color: "var(--text-primary)", fontSize: 12,
                resize: "vertical", boxSizing: "border-box",
              }}
            />
          </div>

          <button
            onClick={save}
            disabled={saving}
            style={{
              marginTop: 10, width: "100%", padding: "9px", background: "var(--accent)",
              color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      )}
    </div>
  );
}
