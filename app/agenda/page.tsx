"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import EconomicCalendar from "@/components/EconomicCalendar";

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
  what_went_well: string | null;
  what_went_wrong: string | null;
  lessons: string | null;
  tags: string[];
  marcus_reflection: string | null;
}

const TAGS = [
  { id: "fomo",       label: "FOMO",          color: "var(--red)" },
  { id: "discipline", label: "Discipline ✓",  color: "var(--green)" },
  { id: "goed-setup", label: "Goede setup",   color: "var(--green)" },
  { id: "te-vroeg",   label: "Te vroeg in",   color: "var(--orange)" },
  { id: "te-laat",    label: "Te laat in",    color: "var(--orange)" },
  { id: "slechte-exit", label: "Slechte exit", color: "var(--red)" },
  { id: "revenge",    label: "Revenge trade", color: "var(--red)" },
  { id: "geduldig",   label: "Geduldig",      color: "var(--green)" },
  { id: "overtraded", label: "Overtraded",    color: "var(--red)" },
  { id: "news-trade", label: "News trade",    color: "#a78bfa" },
  { id: "trend-follow", label: "Trend follow", color: "#38bdf8" },
  { id: "sl-geraakt", label: "SL geraakt",    color: "var(--text-muted)" },
  { id: "tp-geraakt", label: "TP geraakt",    color: "var(--green)" },
  { id: "plan-gevolgd", label: "Plan gevolgd", color: "var(--green)" },
  { id: "plan-genegeerd", label: "Plan genegeerd", color: "var(--red)" },
];

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
  const [whatWentWell, setWhatWentWell] = useState("");
  const [whatWentWrong, setWhatWentWrong] = useState("");
  const [lessons, setLessons] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [marcusReflection, setMarcusReflection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marcusAnalysis, setMarcusAnalysis] = useState<string | null>(null);
  const [marcusLoading, setMarcusLoading] = useState(false);
  const [marcusStats, setMarcusStats] = useState<{ totalTrades: number; totalWins: number; totalLosses: number; totalPnl: number; tradeDays: number } | null>(null);
  const marcusFetched = useRef(false);
  const [weeklyReview, setWeeklyReview] = useState<string | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyIsNew, setWeeklyIsNew] = useState(false);
  const [weeklyWeekStart, setWeeklyWeekStart] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<{
    winrateByDay: { label: string; wins: number; total: number; winrate: number | null }[];
    revenge: { revengeDays: number; totalDaysTraded: number; revengeRatio: number; recentExamples: string[] };
    bestDay: { label: string; winrate: number } | null;
    worstDay: { label: string; winrate: number } | null;
    totalTrades: number;
  } | null>(null);
  const weeklyFetched = useRef(false);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  async function fetchWeeklyReview(force = false) {
    if (weeklyFetched.current && !force) return;
    weeklyFetched.current = true;
    setWeeklyLoading(true);
    try {
      const res = await fetch("/api/me/journal/weekly-review");
      const data = await res.json();
      if (data.review) {
        setWeeklyReview(data.review);
        setWeeklyIsNew(data.isNew ?? false);
        setWeeklyWeekStart(data.weekStart ?? null);
      }
    } catch { /* ignore */ }
    setWeeklyLoading(false);
  }

  // Auto-load wekelijkse review bij elke bezoek (cached in DB)
  useEffect(() => {
    fetchWeeklyReview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMarcusAnalysis() {
    setMarcusLoading(true);
    try {
      const res = await fetch("/api/me/journal/patterns");
      const data = await res.json();
      setMarcusAnalysis(data.analysis ?? null);
      setMarcusStats(data.stats ?? null);
    } catch { setMarcusAnalysis("Kon Marcus niet bereiken. Probeer later opnieuw."); }
    setMarcusLoading(false);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/me/journal?month=${monthKey}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTradesByDate(data.tradesByDate ?? {});
    } catch { /* ignore */ }
    setLoading(false);
    // Load behaviour patterns (all-time, no month filter)
    try {
      const pRes = await fetch("/api/me/patterns");
      if (pRes.ok) {
        const pData = await pRes.json();
        setPatterns(pData);
      }
    } catch { /* ignore */ }
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
    setWhatWentWell(entry?.what_went_well ?? "");
    setWhatWentWrong(entry?.what_went_wrong ?? "");
    setLessons(entry?.lessons ?? "");
    setSelectedTags(entry?.tags ?? []);
    setMarcusReflection(entry?.marcus_reflection ?? null);
  }

  function toggleTag(tagId: string) {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  }

  async function save() {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const tradeSummary = selectedDate && tradesByDate[selectedDate]
        ? `${tradesByDate[selectedDate].count} trades, P&L €${tradesByDate[selectedDate].pnl.toFixed(2)}, assets: ${tradesByDate[selectedDate].assets.join(", ")}`
        : "";
      const res = await fetch("/api/me/journal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate, note, emotion,
          what_went_well: whatWentWell,
          what_went_wrong: whatWentWrong,
          lessons,
          tags: selectedTags,
          tradeSummary,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.marcus_reflection) setMarcusReflection(data.marcus_reflection);
      }
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

  const [agendaTab, setAgendaTab] = useState<"journaal" | "kalender">("journaal");

  return (
    <div className="page-container page-wide">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📅 Trading Agenda</h1>
          <p className="page-subtitle">Log je trades, emoties en notities per dag</p>
        </div>
        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {(["journaal", "kalender"] as const).map(t => (
            <button key={t} onClick={() => setAgendaTab(t)} style={{
              padding: "7px 18px", borderRadius: 99, cursor: "pointer",
              fontSize: 13, fontWeight: 600,
              border: `1px solid ${agendaTab === t ? "var(--primary)" : "rgba(255,255,255,0.12)"}`,
              background: agendaTab === t ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "transparent",
              color: agendaTab === t ? "var(--primary)" : "var(--text-muted)",
              transition: "all 0.15s",
            }}>
              {t === "journaal" ? "📓 Journaal" : "🌍 Economisch"}
            </button>
          ))}
        </div>
      </div>

      {/* Economische kalender tab */}
      {agendaTab === "kalender" && (
        <div className="page-narrow" style={{ margin: "0 auto", paddingBottom: 40 }}>
          <EconomicCalendar />
        </div>
      )}

      {agendaTab === "journaal" && <div style={styles.layout}>
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
              let border = "1px solid color-mix(in srgb, var(--primary) 10%, transparent)";
              if (trades) {
                bg = trades.pnl > 0
                  ? "color-mix(in srgb, var(--green) 15%, transparent)"
                  : trades.pnl < 0
                    ? "color-mix(in srgb, var(--red) 15%, transparent)"
                    : "color-mix(in srgb, var(--text-muted) 15%, transparent)";
                border = trades.pnl > 0
                  ? "1px solid color-mix(in srgb, var(--green) 30%, transparent)"
                  : trades.pnl < 0
                    ? "1px solid color-mix(in srgb, var(--red) 30%, transparent)"
                    : "1px solid color-mix(in srgb, var(--text-muted) 30%, transparent)";
              }
              if (isSelected) border = "2px solid var(--primary)";
              if (isToday && !isSelected) border = "2px solid color-mix(in srgb, var(--primary) 50%, transparent)";

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
                    color: isToday ? "var(--primary)" : undefined,
                    fontWeight: isToday ? 700 : undefined,
                  }}>{day}</span>
                  {trades && (
                    <span style={{
                      fontSize: 9,
                      color: trades.pnl > 0 ? "var(--green)" : trades.pnl < 0 ? "var(--red)" : "var(--text-muted)",
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
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "color-mix(in srgb, var(--green) 40%, transparent)" }} /> Winst</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "color-mix(in srgb, var(--red) 40%, transparent)" }} /> Verlies</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "color-mix(in srgb, var(--text-muted) 40%, transparent)" }} /> Break-even</span>
          </div>
        </div>

        {/* Rechter kolom */}
        <div style={styles.rightCol}>

          {/* Wekelijkse review kaart */}
          {(weeklyLoading || weeklyReview) && (
            <div style={{
              ...styles.marcusCard,
              border: weeklyIsNew ? "1px solid color-mix(in srgb, var(--primary) 50%, transparent)" : "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📋</span>
                  <div>
                    <span style={styles.statsTitle}>Wekelijkse review</span>
                    {weeklyWeekStart && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                        Week van {new Date(weeklyWeekStart + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {weeklyIsNew && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 15%, transparent)", borderRadius: 6, padding: "2px 7px" }}>
                      NIEUW
                    </span>
                  )}
                  <button
                    onClick={() => fetchWeeklyReview(true)}
                    disabled={weeklyLoading}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 4 }}
                    title="Vernieuwen"
                  >↻</button>
                </div>
              </div>

              {weeklyLoading ? (
                <div style={{ color: "var(--primary)", fontSize: 13, padding: "8px 0" }}>Marcus schrijft je review…</div>
              ) : weeklyReview ? (
                <div style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                  {weeklyReview}
                </div>
              ) : null}
            </div>
          )}

          {/* Marcus analyse kaart */}
          <div style={styles.marcusCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🧠</span>
                <span style={styles.statsTitle}>Marcus analyseert</span>
              </div>
              <button
                onClick={fetchMarcusAnalysis}
                disabled={marcusLoading}
                style={{
                  background: "color-mix(in srgb, var(--primary) 15%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
                  color: "var(--primary)",
                  borderRadius: 8,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: marcusLoading ? "default" : "pointer",
                  opacity: marcusLoading ? 0.6 : 1,
                }}
              >
                {marcusLoading ? "Analyseren…" : marcusAnalysis ? "↻ Vernieuwen" : "Analyseer"}
              </button>
            </div>

            {marcusStats && (
              <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                <span style={styles.marcusStat}>{marcusStats.tradeDays} handelsdagen</span>
                <span style={styles.marcusStat}>{marcusStats.totalTrades} trades</span>
                <span style={{ ...styles.marcusStat, color: marcusStats.totalPnl >= 0 ? "var(--green)" : "var(--red)" }}>
                  {marcusStats.totalPnl >= 0 ? "+" : ""}€{marcusStats.totalPnl.toFixed(0)}
                </span>
              </div>
            )}

            {marcusLoading && (
              <div style={{ color: "var(--primary)", fontSize: 13, padding: "12px 0", textAlign: "center" }}>
                <span style={{ display: "inline-block", animation: "pulse 1.5s ease-in-out infinite" }}>
                  Marcus bestudeert je patronen…
                </span>
              </div>
            )}

            {!marcusLoading && marcusAnalysis && (
              <div style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                {marcusAnalysis}
              </div>
            )}

            {!marcusLoading && !marcusAnalysis && (
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
                Klik op &ldquo;Analyseer&rdquo; en Marcus bekijkt je trades, emoties en notities van de laatste 60 dagen.
              </p>
            )}
          </div>

          {/* Maandoverzicht */}
          <div style={styles.statsCard}>
            <div style={styles.statsTitle}>📊 {MONTH_NAMES[month]}</div>
            <div style={styles.statsGrid}>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Totaal P&L</span>
                <span style={{ ...styles.statValue, color: totalPnl >= 0 ? "var(--green)" : "var(--red)" }}>
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

          {/* Gedragspatronen kaart */}
          {patterns && patterns.totalTrades >= 3 && (
            <div style={styles.statsCard}>
              <div style={styles.statsTitle}>🧠 Gedragspatronen</div>
              {/* Winrate per dag van de week */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  Winrate per weekdag
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {patterns.winrateByDay.map(d => (
                    <div key={d.label} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{
                        height: 40,
                        background: d.winrate == null ? "rgba(255,255,255,0.04)" :
                          d.winrate >= 60 ? `color-mix(in srgb, var(--green) ${Math.min(90, d.winrate)}%, transparent)` :
                          d.winrate >= 40 ? `color-mix(in srgb, var(--orange) ${Math.min(80, d.winrate)}%, transparent)` :
                          `color-mix(in srgb, var(--red) ${Math.min(90, 100 - d.winrate)}%, transparent)`,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        paddingBottom: 3,
                        marginBottom: 4,
                        position: "relative",
                        overflow: "hidden",
                      }}>
                        {d.winrate != null && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text)" }}>{d.winrate}%</span>
                        )}
                        {d.winrate == null && (
                          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>-</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.label}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{d.total > 0 ? `${d.total}x` : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Beste / slechtste dag */}
              {(patterns.bestDay || patterns.worstDay) && (
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  {patterns.bestDay && (
                    <div style={{ flex: 1, background: "color-mix(in srgb, var(--green) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 20%, transparent)", borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Beste dag</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--green)" }}>{patterns.bestDay.label}</div>
                      <div style={{ fontSize: 11, color: "var(--green)" }}>{patterns.bestDay.winrate}% win</div>
                    </div>
                  )}
                  {patterns.worstDay && patterns.worstDay.label !== patterns.bestDay?.label && (
                    <div style={{ flex: 1, background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 20%, transparent)", borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Slechtste dag</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--red)" }}>{patterns.worstDay.label}</div>
                      <div style={{ fontSize: 11, color: "var(--red)" }}>{patterns.worstDay.winrate}% win</div>
                    </div>
                  )}
                </div>
              )}
              {/* Revenge trading */}
              {patterns.revenge.totalDaysTraded >= 5 && (
                <div style={{
                  background: patterns.revenge.revengeRatio >= 20
                    ? "color-mix(in srgb, var(--red) 8%, transparent)"
                    : "color-mix(in srgb, var(--green) 6%, transparent)",
                  border: `1px solid ${patterns.revenge.revengeRatio >= 20 ? "color-mix(in srgb, var(--red) 25%, transparent)" : "color-mix(in srgb, var(--green) 20%, transparent)"}`,
                  borderRadius: 8, padding: "10px 12px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{patterns.revenge.revengeRatio >= 20 ? "⚠️" : "✅"}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: patterns.revenge.revengeRatio >= 20 ? "var(--red)" : "var(--green)" }}>
                      Revenge trading
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {patterns.revenge.revengeRatio >= 20
                      ? `Gedetecteerd op ${patterns.revenge.revengeDays} van ${patterns.revenge.totalDaysTraded} handelsdagen (${patterns.revenge.revengeRatio}%). Pas op voor impulsieve re-entries na verlies.`
                      : `Onder controle — slechts ${patterns.revenge.revengeRatio}% van de handelsdagen.`
                    }
                  </div>
                </div>
              )}
            </div>
          )}

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
                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      {selectedTrades.count} trade{selectedTrades.count !== 1 ? "s" : ""}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: selectedTrades.pnl >= 0 ? "var(--green)" : "var(--red)" }}>
                      {selectedTrades.pnl >= 0 ? "+" : ""}€{selectedTrades.pnl.toFixed(2)}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {selectedTrades.assets.join(", ")}
                    </span>
                  </div>
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 12px" }}>Geen trades op deze dag</p>
              )}

              {/* Emotie */}
              <div style={{ marginBottom: 14 }}>
                <div style={styles.fieldLabel}>Hoe voelde je je?</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {EMOTIONS.map(e => (
                    <button
                      key={e.value}
                      title={e.desc}
                      onClick={() => setEmotion(e.value)}
                      style={{
                        ...styles.emoBtn,
                        background: emotion === e.value ? "color-mix(in srgb, var(--primary) 20%, transparent)" : "transparent",
                        border: `1px solid ${emotion === e.value ? "var(--primary)" : "color-mix(in srgb, var(--primary) 20%, transparent)"}`,
                      }}
                    >
                      <span>{e.label}</span>
                      <span style={{ fontSize: 9, display: "block", color: "var(--text-muted)", marginTop: 1 }}>{e.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div style={{ marginBottom: 14 }}>
                <div style={styles.fieldLabel}>Tags</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {TAGS.map(tag => {
                    const active = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        style={{
                          fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                          cursor: "pointer", transition: "all 0.15s",
                          background: active ? `${tag.color}22` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${active ? tag.color : "rgba(255,255,255,0.1)"}`,
                          color: active ? tag.color : "var(--text-muted)",
                        }}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Structurele reflectie */}
              <div style={{ marginBottom: 14 }}>
                <div style={styles.fieldLabel}>✅ Wat ging goed?</div>
                <textarea
                  value={whatWentWell}
                  onChange={e => setWhatWentWell(e.target.value)}
                  placeholder="Setup herkend, discipline gehouden, plan gevolgd…"
                  rows={2}
                  style={styles.textarea}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={styles.fieldLabel}>❌ Wat kon beter?</div>
                <textarea
                  value={whatWentWrong}
                  onChange={e => setWhatWentWrong(e.target.value)}
                  placeholder="Te vroeg ingestapt, SL niet gezet, FOMO…"
                  rows={2}
                  style={styles.textarea}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={styles.fieldLabel}>💡 Leerpunten</div>
                <textarea
                  value={lessons}
                  onChange={e => setLessons(e.target.value)}
                  placeholder="Wat neem ik mee naar morgen?"
                  rows={2}
                  style={styles.textarea}
                />
              </div>

              {/* Vrije notitie */}
              <div style={{ marginBottom: 16 }}>
                <div style={styles.fieldLabel}>📝 Extra notitie</div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Vrije ruimte — gedachten, marktobservaties…"
                  rows={2}
                  style={styles.textarea}
                />
              </div>

              <button
                onClick={save}
                disabled={saving}
                style={styles.saveBtn}
              >
                {saving ? "Opslaan + Marcus denkt na…" : "💾 Opslaan"}
              </button>

              {/* Marcus reflectievraag */}
              {marcusReflection && (
                <div style={{
                  marginTop: 14,
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, transparent) 0%, color-mix(in srgb, var(--primary) 3%, transparent) 100%)",
                  border: "1px solid color-mix(in srgb, var(--primary) 35%, transparent)",
                  borderRadius: 12, padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Marcus vraagt
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, fontStyle: "italic" }}>
                    &ldquo;{marcusReflection}&rdquo;
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👆</div>
              <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
                Klik op een dag om je journal in te vullen
              </p>
            </div>
          )}
        </div>
      </div>}

      {loading && (
        <div style={styles.loadOverlay}>Laden…</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  /* wrap/header/title/subtitle moved to page-container/page-header/page-title/page-subtitle CSS classes */
  layout: { display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" },
  calCard: { background: "var(--surface)", border: "1px solid rgba(233,30,99,0.2)", borderRadius: 16, padding: 20 },
  calNav: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  navBtn: { background: "rgba(233,30,99,0.1)", border: "1px solid rgba(233,30,99,0.25)", color: "var(--primary)", borderRadius: 8, width: 36, height: 36, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  calTitle: { fontWeight: 700, fontSize: 18, color: "var(--text)" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  dayHeader: { textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", padding: "4px 0", textTransform: "uppercase" },
  dayCell: { borderRadius: 8, padding: "6px 4px", minHeight: 56, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 2, transition: "all 0.15s" },
  dayNum: { fontSize: 13, color: "var(--text)", lineHeight: 1 },
  legend: { display: "flex", gap: 16, marginTop: 14, justifyContent: "center" },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" },
  legendDot: { width: 10, height: 10, borderRadius: "50%", display: "inline-block" },
  rightCol: { display: "flex", flexDirection: "column", gap: 16 },
  marcusCard: { background: "linear-gradient(135deg, rgba(233,30,99,0.08) 0%, var(--surface) 60%)", border: "1px solid rgba(233,30,99,0.3)", borderRadius: 16, padding: 20 },
  marcusStat: { fontSize: 12, color: "var(--text-muted)", background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "2px 8px" },
  statsCard: { background: "var(--surface)", border: "1px solid rgba(233,30,99,0.2)", borderRadius: 16, padding: 20 },
  statsTitle: { fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 14 },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  statItem: { display: "flex", flexDirection: "column", gap: 2 },
  statLabel: { fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" },
  statValue: { fontSize: 20, fontWeight: 800, color: "var(--text)" },
  dayCard: { background: "var(--surface)", border: "1px solid rgba(233,30,99,0.2)", borderRadius: 16, padding: 20 },
  dayCardTitle: { fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 14, textTransform: "capitalize" },
  tradeSum: { background: "rgba(233,30,99,0.06)", border: "1px solid rgba(233,30,99,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, fontWeight: 600 },
  emoBtn: { minWidth: 52, padding: "6px 4px", borderRadius: 8, fontSize: 18, cursor: "pointer", transition: "all 0.15s", textAlign: "center" as const, lineHeight: 1 },
  textarea: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(233,30,99,0.2)", borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: 14, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  saveBtn: { width: "100%", background: "var(--primary)", border: "none", color: "var(--text)", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  emptyState: { background: "var(--surface)", border: "1px solid rgba(233,30,99,0.15)", borderRadius: 16, padding: "40px 20px", textAlign: "center" },
  loadOverlay: { position: "fixed", bottom: 20, right: 20, background: "rgba(233,30,99,0.15)", border: "1px solid rgba(233,30,99,0.3)", borderRadius: 8, padding: "8px 16px", color: "var(--primary)", fontSize: 13 },
};
