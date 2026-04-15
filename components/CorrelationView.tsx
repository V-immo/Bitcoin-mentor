"use client";

import { useEffect, useState, useRef } from "react";
import { SCAN_ASSETS } from "@/lib/assets";

type ScanEntry = {
  symbol: string;
  ticker: string;
  name: string;
  type: string;
  emoji: string;
  price: number;
  change24h: number;
  trend: string;
  rsi: number;
  score: number;
};

const TYPE_LABELS: Record<string, string> = {
  crypto: "Crypto",
  stock:  "Aandelen",
  etf:    "ETF",
  metal:  "Grondstoffen",
};

const TYPE_ORDER = ["crypto", "stock", "etf", "metal"];

function pctColor(pct: number): string {
  if (pct >= 5)   return "var(--green)";
  if (pct >= 2)   return "#84cc16";
  if (pct >= 0.5) return "#a3e635";
  if (pct >= -0.5) return "var(--text-muted)";
  if (pct >= -2)  return "var(--orange)";
  if (pct >= -5)  return "var(--red)";
  return "#dc2626";
}

function pctBg(pct: number): string {
  if (pct >= 3)    return "rgba(34,197,94,0.18)";
  if (pct >= 0.5)  return "rgba(134,197,34,0.12)";
  if (pct >= -0.5) return "rgba(148,163,184,0.08)";
  if (pct >= -3)   return "rgba(239,68,68,0.12)";
  return "rgba(220,38,38,0.2)";
}

function formatPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function betaLabel(beta: number): { text: string; color: string } {
  const abs = Math.abs(beta);
  if (abs > 2)    return { text: "2× volatiel", color: "var(--primary)" };
  if (abs > 1.3)  return { text: "hoge beta",   color: "var(--orange)" };
  if (abs > 0.8)  return { text: "volgt BTC",   color: "var(--text-muted)" };
  if (abs > 0.3)  return { text: "lage beta",   color: "#84cc16" };
  return           { text: "ontkoppeld",         color: "var(--green)" };
}

function sectorSummary(entries: ScanEntry[]): { avg: number; green: number; red: number } {
  if (entries.length === 0) return { avg: 0, green: 0, red: 0 };
  const avg   = entries.reduce((s, e) => s + e.change24h, 0) / entries.length;
  const green = entries.filter(e => e.change24h > 0.5).length;
  const red   = entries.filter(e => e.change24h < -0.5).length;
  return { avg, green, red };
}

type Props = { currentAsset?: string };

export default function CorrelationView({ currentAsset = "BTCUSDT" }: Props) {
  const [entries, setEntries] = useState<ScanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/market-scan");
      if (!res.ok) return;
      const data = await res.json() as { results?: ScanEntry[] };
      if (data.results && data.results.length > 0) {
        setEntries(data.results);
        setLastUpdate(new Date());
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "24px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton" style={{ height: 18, width: "40%" }} />
        <div className="skeleton" style={{ height: 80 }} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: "24px 18px", color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
        Geen marktdata beschikbaar
      </div>
    );
  }

  const btc    = entries.find(e => e.symbol === "BTCUSDT");
  const btcPct = btc?.change24h ?? 0;
  const focus  = entries.find(e => e.symbol === currentAsset);

  // Groepeer per type
  const grouped: Record<string, ScanEntry[]> = {};
  for (const type of TYPE_ORDER) {
    grouped[type] = entries.filter(e => {
      const def = SCAN_ASSETS.find(a => a.symbol === e.symbol);
      return def?.type === type;
    });
  }

  // Crypto alts (excl BTC)
  const cryptoAlts = (grouped.crypto ?? []).filter(e => e.symbol !== "BTCUSDT");

  // Marktinterpretatie
  const cryptoAvg = sectorSummary(grouped.crypto ?? []);
  const stockAvg  = sectorSummary(grouped.stock  ?? []);
  const metalAvg  = sectorSummary(grouped.metal  ?? []);

  function marketRead(): string {
    if (!btc) return "";
    const dir = btcPct >= 0 ? "stijgt" : "daalt";
    const abs = Math.abs(btcPct).toFixed(1);

    // Alt divergentie
    const altAvg = cryptoAvg.avg;
    const div    = altAvg - btcPct;
    let altNote = "";
    if (Math.abs(btcPct) > 1) {
      if (div > 1.5)      altNote = "Alts outperformen — risk-on rotatie.";
      else if (div < -1.5) altNote = "Alts underperformen — hoge beta selling.";
      else                 altNote = "Alts volgen BTC proportioneel.";
    }

    // Risk-off check
    const riskOff = stockAvg.avg < -1 && btcPct < -1;
    const riskOn  = stockAvg.avg > 1  && btcPct > 1;
    let marketNote = "";
    if (riskOff) marketNote = "📉 Risk-off omgeving — aandelen én crypto dalen samen.";
    if (riskOn)  marketNote = "📈 Risk-on — aandelen en crypto bewegen samen omhoog.";

    // Goud als vlucht
    const gold = entries.find(e => e.symbol === "GC=F");
    let goldNote = "";
    if (gold && btcPct < -2 && gold.change24h > 1) goldNote = "🥇 Goud stijgt terwijl BTC daalt — safe haven vraag zichtbaar.";

    return [`BTC ${dir} ${abs}%.`, altNote, marketNote, goldNote].filter(Boolean).join(" ");
  }

  const interpretation = marketRead();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{
        background: "var(--surface)",
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
            <span style={{ fontSize: 20 }}>📡</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                Markt Correlatie
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                24h snapshot — {entries.length} assets
                {lastUpdate && <span style={{ marginLeft: 6 }}>· {lastUpdate.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</span>}
              </div>
            </div>
          </div>
          {/* BTC referentie */}
          {btc && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>BTC (ref)</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: pctColor(btcPct) }}>
                {formatPct(btcPct)}
              </div>
            </div>
          )}
        </div>

        {/* Marcus interpretatie */}
        {interpretation && (
          <div style={{ padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-start",
              background: "rgba(233,30,99,0.06)", borderRadius: 10, padding: "10px 12px",
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🤖</span>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text)", lineHeight: 1.6 }}>
                {interpretation}
              </p>
            </div>
          </div>
        )}

        {/* Sector overzicht */}
        <div style={{
          padding: "12px 18px",
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
        }}>
          {[
            { label: "Crypto",       data: cryptoAvg, icon: "₿" },
            { label: "Aandelen",     data: stockAvg,  icon: "📈" },
            { label: "Grondstoffen", data: metalAvg,  icon: "🥇" },
          ].map(s => (
            <div key={s.label} style={{
              background: pctBg(s.data.avg),
              borderRadius: 10, padding: "8px 10px", textAlign: "center",
            }}>
              <div style={{ fontSize: 14, marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: pctColor(s.data.avg) }}>
                {formatPct(s.data.avg)}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-muted)" }}>
                {s.data.green}↑ {s.data.red}↓
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crypto beta vs BTC */}
      {btc && cryptoAlts.length > 0 && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            fontSize: 12, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            Crypto alts vs BTC
          </div>
          <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
            {/* BTC zelf als referentie */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 8px", borderRadius: 8,
              background: pctBg(btcPct),
            }}>
              <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>{btc.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                  BTC <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)" }}>referentie</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: pctColor(btcPct) }}>
                  {formatPct(btcPct)}
                </div>
              </div>
            </div>

            {/* Alts gesorteerd op change24h */}
            {[...cryptoAlts].sort((a, b) => b.change24h - a.change24h).map(entry => {
              const beta    = Math.abs(btcPct) > 0.2 ? entry.change24h / btcPct : 0;
              const bl      = betaLabel(beta);
              const isActive = entry.symbol === currentAsset;
              return (
                <div
                  key={entry.symbol}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 8px", borderRadius: 8,
                    background: isActive ? "rgba(233,30,99,0.08)" : pctBg(entry.change24h),
                    border: isActive ? "1px solid rgba(233,30,99,0.25)" : "1px solid transparent",
                  }}
                >
                  <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>{entry.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                      {entry.ticker}
                      {isActive && <span style={{ marginLeft: 4, fontSize: 9, color: "var(--primary)" }}>← huidig</span>}
                    </div>
                  </div>
                  {/* Beta indicator */}
                  {Math.abs(btcPct) > 0.2 && (
                    <div style={{
                      fontSize: 9, padding: "1px 6px", borderRadius: 99,
                      background: "rgba(255,255,255,0.06)",
                      color: bl.color, fontWeight: 600, flexShrink: 0,
                    }}>
                      {beta > 0 ? "+" : ""}{beta.toFixed(1)}β {bl.text}
                    </div>
                  )}
                  <div style={{ textAlign: "right", minWidth: 52 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: pctColor(entry.change24h) }}>
                      {formatPct(entry.change24h)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Heatmap: alle assets */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16, overflow: "hidden",
      }}>
        <div style={{
          padding: "12px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          fontSize: 12, fontWeight: 700, color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          Heatmap — alle assets
        </div>
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          {TYPE_ORDER.map(type => {
            const group = grouped[type] ?? [];
            if (group.length === 0) return null;
            return (
              <div key={type}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {TYPE_LABELS[type]}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {[...group].sort((a, b) => b.change24h - a.change24h).map(entry => {
                    const isActive = entry.symbol === currentAsset;
                    const pct = entry.change24h;
                    // Intensiteit op basis van absolute waarde (max 10%)
                    const intensity = Math.min(1, Math.abs(pct) / 8);
                    const baseGreen = `rgba(34,197,94,${0.12 + intensity * 0.5})`;
                    const baseRed   = `rgba(239,68,68,${0.12 + intensity * 0.5})`;
                    const bg        = pct > 0.2 ? baseGreen : pct < -0.2 ? baseRed : "rgba(148,163,184,0.1)";
                    return (
                      <div
                        key={entry.symbol}
                        title={`${entry.name}: ${formatPct(pct)} | RSI: ${entry.rsi?.toFixed(0) ?? "?"} | Trend: ${entry.trend}`}
                        style={{
                          background: bg,
                          border: isActive ? "1px solid var(--primary)" : `1px solid ${pct > 0.2 ? "rgba(34,197,94,0.25)" : pct < -0.2 ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.06)"}`,
                          borderRadius: 8,
                          padding: "6px 8px",
                          minWidth: 54,
                          cursor: "default",
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", textAlign: "center" }}>
                          {entry.emoji} {entry.ticker}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: pctColor(pct), textAlign: "center", marginTop: 2 }}>
                          {formatPct(pct)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Focus asset detail (als het geen BTC is) */}
      {focus && focus.symbol !== "BTCUSDT" && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid rgba(233,30,99,0.25)",
          borderRadius: 16, padding: "14px 18px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            {focus.emoji} {focus.ticker} — detail
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              { label: "24u",    value: formatPct(focus.change24h),        color: pctColor(focus.change24h) },
              { label: "RSI",    value: focus.rsi?.toFixed(0) ?? "—",       color: (focus.rsi ?? 50) < 35 ? "var(--green)" : (focus.rsi ?? 50) > 70 ? "var(--red)" : "var(--text)" },
              { label: "Trend",  value: focus.trend ?? "—",                 color: focus.trend === "stijgend" ? "var(--green)" : focus.trend === "dalend" ? "var(--red)" : "var(--text-muted)" },
              { label: "Score",  value: `${focus.score}/100`,               color: focus.score >= 65 ? "var(--green)" : focus.score >= 40 ? "var(--orange)" : "var(--red)" },
              { label: "vs BTC", value: btcPct !== 0 ? `${((focus.change24h / btcPct) * 100 - 100).toFixed(0)}%` : "—", color: focus.change24h > btcPct ? "var(--green)" : "var(--red)" },
              { label: "Prijs",  value: `$${focus.price.toLocaleString("en-US", { maximumFractionDigits: focus.price < 1 ? 4 : 0 })}`, color: "var(--text)" },
            ].map(item => (
              <div key={item.label} style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px", textAlign: "center",
              }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
