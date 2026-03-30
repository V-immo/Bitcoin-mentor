"use client";

import { useState, useEffect, useCallback } from "react";

const EMOTIONS = [
  { value: 1, label: "😨", desc: "Angstig" },
  { value: 2, label: "😟", desc: "Onzeker" },
  { value: 3, label: "😐", desc: "Neutraal" },
  { value: 4, label: "😊", desc: "Goed" },
  { value: 5, label: "🔥", desc: "Top" },
];

interface JournalEntry {
  date: string;
  note: string | null;
  emotion: number;
}

interface TradeDay {
  pnl: number;
  count: number;
  assets: string[];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  // 0=Sun, make Mon=0
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function fmt(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTH_NAMES = ["Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December"];
const DAY_NAMES = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export default function AgendaPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [tradesByDate, setTradesByDate] = useState<Record<string, TradeDay>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [emotion, setEmotion] = useState(3);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/me/journal?month=${monthKey}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTradesByDate(data.tradesByDate ?? {});
    } catch { /* ignore */ }
    setLoading(false);
  }, [monthKey]);

  useEffect(() => { load(); }, [load]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  function selectDay(dateStr: string) {
    setSelectedDate(dateStr);
    const entry = entries.find(e => e.date === dateStr);
    setNote(entry?.note ?? "");
    setEmotion(entry?.emotion ?? 3);
  }

  async function save() {
    if (!selectedDate) return;
    setSaving(true);
    try {
      await fetch("/api/me/journal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, note, emotion }),
      });
      await load();
    } catch { /* ignore */ }
    setSaving(false);
  }

  const entryMap = Object.fromEntries(entries.map(e => [e.date, e]));
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const todayStr = fmt(today.getFullYear(), today.getMonth(), today.getDate());

  // Maandstatistieken
  const monthTrades = Object.entries(tradesByDate).filter(([d]) => d.startsWith(monthKey));
  const totalPnl = monthTrades.reduce((s, [, v]) => s + v.pnl, 0);
  const totalTrades = monthTrades.reduce((s, [, v]) => s + v.count, 0);
  const tradeDays = monthTrades.length;
  const winDays = monthTrades.filter(([, v]) => v.pnl > 0).length;

  const selectedEntry = selectedDate ? entryMap[selectedDate] : null;
  const selectedTrades = selectedDate ? tradesByDate[selectedDate] : null;

  return (
    <div style={styles.wrap}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📅 Trading Agenda</h1>
          <p style={styles.subtitle}>Log je trades, emoties en notities per dag</p>
        </div>
      </div>

      <div style={styles.layout}>
        {/* Kalender */}
        <div style={styles.calCard}>
          {/* Maand navigatie */}
          <div style={styles.calNav}>
            <button style={styles.navBtn} onClick={prevMonth}>‹</button>
            <span style={styles.calTitle}>{MONTH_NAMES[month]} {year}</span>
            <button style={styles.navBtn} onClick={nextMonth}>›</button>
          </div>

          {/* Dag headers */}
          <div style={styles.calGrid}>
            {DAY_NAMES.map(d => (
              <div key={d} style={styles.dayHeader}>{d}</div>
            ))}

            {/* Lege cellen voor offset */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Dag cellen */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = fmt(year, month, day);
              const trades = tradesByDate[dateStr];
              const entry = entryMap[dateStr];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const isFuture = dateStr > todayStr;

              let bg = "transparent";
              let border = "1px solid rgba(233,30,99,0.1)";
              if (trades) {
                bg = trades.pnl > 0
                  ? "rgba(34,197,94,0.15)"
                  : trades.pnl < 0
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(100,116,139,0.15)";
                border = trades.pnl > 0
                  ? "1px solid rgba(34,197,94,0.3)"
                  : trades.pnl < 0
                    ? "1px solid rgba(239,68,68,0.3)"
                    : "1px solid rgba(100,116,139,0.3)";
              }
              if (isSelected) border = "2px solid #e91e63";
              if (isToday && !isSelected) border = "2px solid rgba(233,30,99,0.5)";

              return (
                <div
                  key={dateStr}
                  onClick={() => !isFuture && selectDay(dateStr)}
                  style={{
                    ...styles.dayCell,
                    background: bg,
                    border,
                    opacity: isFuture ? 0.3 : 1,
                    cursor: isFuture ? "default" : "pointer",
                    position: "relative",
                  }}
                >
                  <span style={{
                    ...styles.dayNum,
                    color: isToday ? "#e91e63" : undefined,
                    fontWeight: isToday ? 700 : undefined,
                  }}>{day}</span>
                  {trades && (
                    <span style={{
                      fontSize: 9,
                      color: trades.pnl > 0 ? "#22c55e" : trades.pnl < 0 ? "#ef4444" : "#94a3b8",
                      lineHeight: 1,
                    }}>
                      {trades.pnl > 0 ? "+" : ""}{trades.pnl.toFixed(0)}
                    </span>
                  )}
                  {entry && (
                    <span style={{ fontSize: 9, lineHeight: 1 }}>
                      {EMOTIONS.find(e => e.value === entry.emotion)?.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div style={styles.legend}>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "rgba(34,197,94,0.4)" }} /> Winst</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "rgba(239,68,68,0.4)" }} /> Verlies</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "rgba(100,116,139,0.4)" }} /> Break-even</span>
          </div>
        </div>

        {/* Rechter kolom */}
        <div style={styles.rightCol}>
          {/* Maandoverzicht */}
          <div style={styles.statsCard}>
            <div style={styles.statsTitle}>📊 {MONTH_NAMES[month]}</div>
            <div style={styles.statsGrid}>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Totaal P&L</span>
                <span style={{ ...styles.statValue, color: totalPnl >= 0 ? "#22c55e" : "#ef4444" }}>
                  {totalPnl >= 0 ? "+" : ""}€{totalPnl.toFixed(2)}
                </span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Trades</span>
                <span style={styles.statValue}>{totalTrades}</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Handelsdagen</span>
                <span style={styles.statValue}>{tradeDays}</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Win-dagen</span>
                <span style={styles.statValue}>{tradeDays > 0 ? `${winDays}/${tradeDays}` : "-"}</span>
              </div>
            </div>
          </div>

          {/* Dag detail / editor */}
          {selectedDate ? (
            <div style={styles.dayCard}>
              <div style={styles.dayCardTitle}>
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
              </div>

              {/* Trade samenvatting */}
              {selectedTrades ? (
                <div style={styles.tradeSum}>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ color: "#94a3b8", fontSize: 13 }}>
                      {selectedTrades.count} trade{selectedTrades.count !== 1 ? "s" : ""}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: selectedTrades.pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                      {selectedTrades.pnl >= 0 ? "+" : ""}€{selectedTrades.pnl.toFixed(2)}
                    </span>
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>
                      {selectedTrades.assets.join(", ")}
                    </span>
                  </div>
                </div>
              ) : (
                <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 12px" }}>Geen trades op deze dag</p>
              )}

              {/* Emotie */}
              <div style={{ marginBottom: 14 }}>
                <div style={styles.fieldLabel}>Hoe voelde je je?</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {EMOTIONS.map(e => (
                    <button
                      key={e.value}
                      title={e.desc}
                      onClick={() => setEmotion(e.value)}
                      style={{
                        ...styles.emoBtn,
                        background: emotion === e.value ? "rgba(233,30,99,0.2)" : "transparent",
                        border: `1px solid ${emotion === e.value ? "#e91e63" : "rgba(233,30,99,0.2)"}`,
                      }}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notitie */}
              <div style={{ marginBottom: 14 }}>
                <div style={styles.fieldLabel}>Notitie</div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Wat ging goed? Wat leer je van vandaag?"
                  rows={4}
                  style={styles.textarea}
                />
              </div>

              <button
                onClick={save}
                disabled={saving}
                style={styles.saveBtn}
              >
                {saving ? "Opslaan…" : "💾 Opslaan"}
              </button>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👆</div>
              <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
                Klik op een dag om je notitie en emotie in te vullen
              </p>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div style={styles.loadOverlay}>Laden…</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1100, margin: "0 auto", padding: "24px 16px", position: "relative" },
  header: { marginBottom: 24 },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text-primary, #fce8f0)" },
  subtitle: { margin: "4px 0 0", color: "var(--text-muted, #94a3b8)", fontSize: 14 },
  layout: { display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" },
  calCard: { background: "var(--surface, #1f0d17)", border: "1px solid rgba(233,30,99,0.2)", borderRadius: 16, padding: 20 },
  calNav: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  navBtn: { background: "rgba(233,30,99,0.1)", border: "1px solid rgba(233,30,99,0.25)", color: "#e91e63", borderRadius: 8, width: 36, height: 36, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  calTitle: { fontWeight: 700, fontSize: 18, color: "var(--text-primary, #fce8f0)" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  dayHeader: { textAlign: "center", fontSize: 11, fontWeight: 600, color: "#64748b", padding: "4px 0", textTransform: "uppercase" },
  dayCell: { borderRadius: 8, padding: "6px 4px", minHeight: 56, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 2, transition: "all 0.15s" },
  dayNum: { fontSize: 13, color: "var(--text-primary, #fce8f0)", lineHeight: 1 },
  legend: { display: "flex", gap: 16, marginTop: 14, justifyContent: "center" },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" },
  legendDot: { width: 10, height: 10, borderRadius: "50%", display: "inline-block" },
  rightCol: { display: "flex", flexDirection: "column", gap: 16 },
  statsCard: { background: "var(--surface, #1f0d17)", border: "1px solid rgba(233,30,99,0.2)", borderRadius: 16, padding: 20 },
  statsTitle: { fontWeight: 700, fontSize: 15, color: "var(--text-primary, #fce8f0)", marginBottom: 14 },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  statItem: { display: "flex", flexDirection: "column", gap: 2 },
  statLabel: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  statValue: { fontSize: 20, fontWeight: 800, color: "var(--text-primary, #fce8f0)" },
  dayCard: { background: "var(--surface, #1f0d17)", border: "1px solid rgba(233,30,99,0.2)", borderRadius: 16, padding: 20 },
  dayCardTitle: { fontWeight: 700, fontSize: 15, color: "var(--text-primary, #fce8f0)", marginBottom: 14, textTransform: "capitalize" },
  tradeSum: { background: "rgba(233,30,99,0.06)", border: "1px solid rgba(233,30,99,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, fontWeight: 600 },
  emoBtn: { width: 40, height: 40, borderRadius: 8, fontSize: 20, cursor: "pointer", transition: "all 0.15s" },
  textarea: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(233,30,99,0.2)", borderRadius: 10, padding: "10px 12px", color: "var(--text-primary, #fce8f0)", fontSize: 14, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  saveBtn: { width: "100%", background: "#e91e63", border: "none", color: "#fff", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  emptyState: { background: "var(--surface, #1f0d17)", border: "1px solid rgba(233,30,99,0.15)", borderRadius: 16, padding: "40px 20px", textAlign: "center" },
  loadOverlay: { position: "fixed", bottom: 20, right: 20, background: "rgba(233,30,99,0.15)", border: "1px solid rgba(233,30,99,0.3)", borderRadius: 8, padding: "8px 16px", color: "#e91e63", fontSize: 13 },
};
