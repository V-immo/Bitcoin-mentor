"use client";

import { useEffect, useState } from "react";
import type { CalendarData, EconEvent, EarningsEvent } from "@/app/api/calendar/route";

const IMPACT_COLOR = { 1: "#64748b", 2: "#f59e0b", 3: "#ef4444" };
const IMPACT_LABEL = { 1: "laag", 2: "middel", 3: "hoog" };
const IMPACT_DOT   = { 1: "🟢", 2: "🟡", 3: "🔴" };

const HOUR_LABEL: Record<string, string> = {
  bmo: "vóór markt",
  amc: "na markt",
  dmh: "tijdens markt",
  "":  "",
};

const STOCK_EMOJI: Record<string, string> = {
  NVDA: "🖥", AAPL: "🍎", TSLA: "⚡", MSFT: "🪟",
  GOOGL: "🔍", AMZN: "📦", META: "👤", AMD: "💻",
  NFLX: "🎬", PLTR: "🔭",
};

const DAY_NAMES = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MONTH_NAMES = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Vandaag";
  if (diff === 1) return "Morgen";
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function groupByDate<T extends { time?: string; reportDate?: string }>(items: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const key = (item.time ?? item.reportDate ?? "").slice(0, 10);
    if (!key) continue;
    (out[key] ??= []).push(item);
  }
  return out;
}

function marcusWarning(events: EconEvent[], earnings: EarningsEvent[]): string | null {
  const highImpact = events.filter(e => e.impact === 3);
  const todayOrTomorrow = [...events, ...earnings.map(e => ({ ...e, time: e.reportDate }))].filter(e => {
    const d = new Date((e.time ?? "").slice(0, 10) + "T00:00:00");
    const today = new Date(); today.setHours(0,0,0,0);
    const diff  = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    return diff <= 2;
  });

  if (highImpact.length === 0 && todayOrTomorrow.length === 0) return null;

  const parts: string[] = [];

  // Hoog-impact macro events deze week
  const thisWeek = highImpact.filter(e => {
    const d = new Date(e.time.slice(0, 10) + "T00:00:00");
    const today = new Date(); today.setHours(0,0,0,0);
    return (d.getTime() - today.getTime()) / 86_400_000 <= 7;
  });
  if (thisWeek.length > 0) {
    const names = thisWeek.map(e => e.event).slice(0, 2).join(", ");
    parts.push(`🔴 ${names} deze week — verhoog geen risico voor de release.`);
  }

  // Earnings vandaag of morgen
  const nearEarnings = earnings.filter(e => {
    const d = new Date(e.reportDate + "T00:00:00");
    const today = new Date(); today.setHours(0,0,0,0);
    const diff  = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    return diff <= 1;
  });
  if (nearEarnings.length > 0) {
    const names = nearEarnings.map(e => `${STOCK_EMOJI[e.symbol] ?? ""}${e.symbol}`).join(", ");
    parts.push(`📊 Earnings vandaag/morgen: ${names} — verwacht volatiliteit.`);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

export default function EconomicCalendar() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"macro" | "earnings">("macro");

  useEffect(() => {
    fetch("/api/calendar")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
        Kalenderdata laden…
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
        Kalender niet beschikbaar
      </div>
    );
  }

  const { economic, earnings } = data;
  const warning = marcusWarning(economic, earnings);

  const econByDate    = groupByDate(economic);
  const earningsByDate = groupByDate(earnings.map(e => ({ ...e, time: e.reportDate })));

  const activeGroups = tab === "macro" ? econByDate : earningsByDate;
  const dates = Object.keys(activeGroups).sort();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{
        background: "var(--surface, #1f0d17)",
        border: "1px solid rgba(233,30,99,0.2)",
        borderRadius: 16, overflow: "hidden",
      }}>
        <div style={{
          padding: "14px 18px",
          background: "linear-gradient(135deg, rgba(233,30,99,0.1) 0%, transparent 60%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>📅</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary, #fce8f0)" }}>
                Economische Kalender
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                Komende 14 dagen · {economic.length} macro · {earnings.length} earnings
              </div>
            </div>
          </div>
        </div>

        {/* Marcus waarschuwing */}
        {warning && (
          <div style={{ padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-start",
              background: "rgba(233,30,99,0.06)", borderRadius: 10, padding: "10px 12px",
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🤖</span>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-primary, #fce8f0)", lineHeight: 1.65 }}>
                {warning}
              </p>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div style={{ padding: "12px 18px", display: "flex", gap: 8 }}>
          {(["macro", "earnings"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "5px 14px", borderRadius: 99, cursor: "pointer", fontSize: 12, fontWeight: 600,
                border: `1px solid ${tab === t ? "#e91e63" : "rgba(255,255,255,0.1)"}`,
                background: tab === t ? "rgba(233,30,99,0.15)" : "transparent",
                color: tab === t ? "#e91e63" : "#64748b",
                transition: "all 0.15s",
              }}
            >
              {t === "macro"
                ? `🌍 Macro (${economic.length})`
                : `📊 Earnings (${earnings.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Impact legenda (alleen macro) */}
      {tab === "macro" && (
        <div style={{ display: "flex", gap: 12, padding: "0 4px" }}>
          {([1, 2, 3] as const).map(imp => (
            <div key={imp} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10 }}>{IMPACT_DOT[imp]}</span>
              <span style={{ fontSize: 11, color: IMPACT_COLOR[imp] }}>{IMPACT_LABEL[imp]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Lege state */}
      {dates.length === 0 && (
        <div style={{
          background: "var(--surface, #1f0d17)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: "32px 20px",
          textAlign: "center", color: "#64748b", fontSize: 13,
        }}>
          {tab === "macro" ? "Geen relevante macro-events de komende 14 dagen." : "Geen earnings van gevolgde aandelen de komende 14 dagen."}
        </div>
      )}

      {/* Dag-groepen */}
      {dates.map(date => {
        const dayItems = activeGroups[date] ?? [];
        const label    = dayLabel(date);
        const isToday  = label === "Vandaag";
        const isMorgen = label === "Morgen";

        return (
          <div key={date} style={{
            background: "var(--surface, #1f0d17)",
            border: `1px solid ${isToday ? "rgba(233,30,99,0.35)" : isMorgen ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.07)"}`,
            borderRadius: 14, overflow: "hidden",
          }}>
            {/* Dag header */}
            <div style={{
              padding: "9px 14px",
              background: isToday
                ? "rgba(233,30,99,0.1)"
                : isMorgen
                  ? "rgba(245,158,11,0.07)"
                  : "rgba(255,255,255,0.02)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: isToday ? "#e91e63" : isMorgen ? "#f59e0b" : "#94a3b8",
              }}>
                {label}
              </span>
              <span style={{ fontSize: 10, color: "#475569" }}>
                {dayItems.length} event{dayItems.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Events */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {tab === "macro"
                ? (dayItems as EconEvent[])
                    .sort((a, b) => b.impact - a.impact)
                    .map((e, i) => (
                      <MacroRow key={i} event={e} />
                    ))
                : (dayItems as (EarningsEvent & { time?: string })[]).map((e, i) => (
                    <EarningsRow key={i} event={e} />
                  ))
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MacroRow({ event }: { event: EconEvent }) {
  const color = IMPACT_COLOR[event.impact];
  const dot   = IMPACT_DOT[event.impact];
  const time  = event.time?.includes("T") ? event.time.slice(11, 16) : "";

  return (
    <div style={{
      padding: "9px 14px",
      display: "flex", alignItems: "center", gap: 10,
      borderBottom: "1px solid rgba(255,255,255,0.03)",
    }}>
      <span style={{ fontSize: 12, flexShrink: 0 }}>{dot}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary, #fce8f0)" }}>
          {event.event}
        </div>
        <div style={{ fontSize: 10, color: "#64748b", marginTop: 1, display: "flex", gap: 8 }}>
          {time && <span>{time} UTC</span>}
          {event.estimate && <span>verwacht: {event.estimate}{event.unit}</span>}
          {event.previous && <span>vorig: {event.previous}{event.unit}</span>}
        </div>
      </div>
      {event.actual && (
        <div style={{
          fontSize: 11, fontWeight: 700, color: color,
          background: `${color}20`, padding: "2px 8px", borderRadius: 99, flexShrink: 0,
        }}>
          {event.actual}{event.unit}
        </div>
      )}
      {!event.actual && event.impact === 3 && (
        <div style={{
          fontSize: 9, fontWeight: 700, color: "#ef4444",
          background: "rgba(239,68,68,0.1)", padding: "2px 7px", borderRadius: 99, flexShrink: 0,
        }}>
          HOOG
        </div>
      )}
    </div>
  );
}

function EarningsRow({ event }: { event: EarningsEvent }) {
  const emoji = STOCK_EMOJI[event.symbol] ?? "📈";
  const hourLabel = HOUR_LABEL[event.hour ?? ""] || "";
  const beat = event.epsActual !== null && event.epsEstimate !== null
    ? event.epsActual >= event.epsEstimate : null;

  return (
    <div style={{
      padding: "9px 14px",
      display: "flex", alignItems: "center", gap: 10,
      borderBottom: "1px solid rgba(255,255,255,0.03)",
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary, #fce8f0)" }}>
          {event.symbol}
          <span style={{ fontWeight: 400, fontSize: 11, color: "#64748b", marginLeft: 6 }}>
            {event.name}
          </span>
        </div>
        <div style={{ fontSize: 10, color: "#64748b", marginTop: 1, display: "flex", gap: 8 }}>
          {hourLabel && <span>{hourLabel}</span>}
          {event.epsEstimate !== null && <span>EPS verwacht: ${event.epsEstimate?.toFixed(2)}</span>}
          {event.epsActual !== null && <span>EPS actueel: ${event.epsActual?.toFixed(2)}</span>}
        </div>
      </div>
      {beat !== null && (
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: beat ? "#22c55e" : "#ef4444",
          background: beat ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          padding: "2px 8px", borderRadius: 99, flexShrink: 0,
        }}>
          {beat ? "✓ BEAT" : "✗ MISS"}
        </div>
      )}
    </div>
  );
}
