"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Table2, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ScanResult } from "@/app/api/market-scan/route";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLivePrices } from "@/hooks/useLivePrices";

const REFRESH_INTERVAL = 15;

function Sparkline({ candles, livePrice }: { candles: { close: number }[]; livePrice?: number }) {
  if (candles.length < 2) return <div style={{ height: 36 }} />;
  const closes = candles.map((c) => c.close);
  if (livePrice && livePrice > 0) closes[closes.length - 1] = livePrice;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const w = 120, h = 36, pad = 2;
  const pts = closes.map((c, i) => {
    const x = pad + (i / (closes.length - 1)) * (w - pad * 2);
    const y = h - pad - ((c - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const isUp = closes[closes.length - 1] >= closes[0];
  const color = isUp ? "var(--green)" : "var(--red)";
  return (
    <svg width={w} height={h} style={{ display: "block", width: "100%" }} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`sg-${isUp}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 10) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

type MarketStats = {
  fearGreed: string;
  globalMetrics: { btcDominance: string; totalMarketCap: string; marketCapChange24h: string };
  btcPrice: number | null;
  btcChange: number | null;
  counts: { green: number; yellow: number; red: number };
};

type SortKey = "score" | "rsi" | "change24h" | "price" | "signal";
type SortDir = "asc" | "desc";

function fgColor(fg: string): string {
  const val = parseInt(fg);
  if (isNaN(val)) return "var(--text-muted)";
  if (val >= 75) return "var(--orange)";
  if (val >= 55) return "var(--green)";
  if (val >= 45) return "var(--text-muted)";
  if (val >= 25) return "var(--orange)";
  return "var(--red)";
}

function fgLabel(fg: string): string {
  const val = parseInt(fg);
  if (isNaN(val)) return "—";
  if (val >= 75) return "Extreme Greed";
  if (val >= 55) return "Greed";
  if (val >= 45) return "Neutral";
  if (val >= 25) return "Fear";
  return "Extreme Fear";
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 100 }}>
      <div style={{ flex: 1, height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          width: `${score}%`, height: "100%", borderRadius: 3,
          background: color === "green" ? "var(--green)" : color === "yellow" ? "var(--orange)" : "var(--red)"
        }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 28, textAlign: "right" }}>{score}</span>
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  const tl = trend.toLowerCase();
  if (tl === "stijgend" || tl === "bullish" || tl.includes("stijg")) return <TrendingUp size={13} color="var(--green)" />;
  if (tl === "dalend" || tl === "bearish" || tl.includes("dal")) return <TrendingDown size={13} color="var(--red)" />;
  return <Minus size={13} color="var(--text-muted)" />;
}

export default function AssetScanner() {
  const { t } = useLanguage();
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "crypto" | "stock" | "metal" | "etf">("all");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [bestOnly, setBestOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const livePrices = useLivePrices();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/market-scan");
      if (res.ok) { setResults(await res.json()); setLastUpdated(new Date()); }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/market-stats");
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); loadStats(); }, [load, loadStats]);

  useEffect(() => {
    timerRef.current = setInterval(() => { load(); loadStats(); setCountdown(REFRESH_INTERVAL); }, REFRESH_INTERVAL * 1000);
    countdownRef.current = setInterval(() => { setCountdown(c => Math.max(0, c - 1)); }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [load, loadStats]);

  function handleClick(symbol: string) {
    localStorage.setItem("bitcoin-mentor-selected-asset", symbol);
    router.push("/trade");
  }

  function handleRefresh() { setLoading(true); setCountdown(REFRESH_INTERVAL); load(); loadStats(); }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown size={11} style={{ opacity: 0.4 }} />;
    return sortDir === "desc"
      ? <ArrowDown size={11} color="var(--accent)" />
      : <ArrowUp size={11} color="var(--accent)" />;
  }

  const filtered = results
    .filter(r => filter === "all" || r.type === filter)
    .filter(r => !bestOnly || r.color !== "red");

  const sorted = [...filtered].sort((a, b) => {
    const la = livePrices.get(a.symbol);
    const lb = livePrices.get(b.symbol);
    let va: number, vb: number;
    if (sortKey === "score") { va = a.score; vb = b.score; }
    else if (sortKey === "rsi") { va = a.rsi; vb = b.rsi; }
    else if (sortKey === "change24h") { va = la?.change24h ?? a.change24h; vb = lb?.change24h ?? b.change24h; }
    else if (sortKey === "price") { va = la?.price ?? a.price; vb = lb?.price ?? b.price; }
    else { va = a.color === "green" ? 2 : a.color === "yellow" ? 1 : 0; vb = b.color === "green" ? 2 : b.color === "yellow" ? 1 : 0; }
    return sortDir === "desc" ? vb - va : va - vb;
  });

  const counts = stats?.counts ?? {
    green: results.filter(r => r.color === "green").length,
    yellow: results.filter(r => r.color === "yellow").length,
    red: results.filter(r => r.color === "red").length,
  };

  const fgRaw = stats?.fearGreed ?? "";
  const fgNum = fgRaw.split("/")[0] ?? "—";

  const filterLabels: Record<string, string> = {
    all: t("scanner_filter_all"), crypto: t("scanner_filter_crypto"),
    stock: t("scanner_filter_stock"), metal: t("scanner_filter_metal"), etf: t("scanner_filter_etf"),
  };

  const signalLabel = (r: ScanResult) =>
    r.signal === "Goed moment" ? t("status_good_moment")
    : r.signal === "Wachten" ? t("status_wait")
    : t("status_no_buy");

  return (
    <div className="scanner-page">

      {/* ── Market Stats Balk ── */}
      <div className="dash-stats-bar">
        <div className="dash-stat-pill" style={{ "--accent": fgColor(fgNum) } as React.CSSProperties}>
          <span className="dash-stat-label">Fear & Greed</span>
          <span className="dash-stat-value" style={{ color: fgColor(fgNum) }}>
            {fgNum !== "—" ? `${fgNum} · ` : ""}{fgLabel(fgNum)}
          </span>
        </div>
        {stats?.btcPrice && (
          <div className="dash-stat-pill">
            <span className="dash-stat-label">₿ Bitcoin</span>
            <span className="dash-stat-value">
              ${fmt(stats.btcPrice)}
              {stats.btcChange != null && (
                <span style={{ color: stats.btcChange >= 0 ? "var(--green)" : "var(--red)", marginLeft: 6, fontSize: 11 }}>
                  {stats.btcChange >= 0 ? "+" : ""}{stats.btcChange.toFixed(2)}%
                </span>
              )}
            </span>
          </div>
        )}
        {stats?.globalMetrics?.btcDominance && stats.globalMetrics.btcDominance !== "onbekend" && (
          <div className="dash-stat-pill">
            <span className="dash-stat-label">BTC Dom.</span>
            <span className="dash-stat-value">{stats.globalMetrics.btcDominance}</span>
          </div>
        )}
        {stats?.globalMetrics?.totalMarketCap && stats.globalMetrics.totalMarketCap !== "onbekend" && (
          <div className="dash-stat-pill">
            <span className="dash-stat-label">Markt Cap</span>
            <span className="dash-stat-value">
              {stats.globalMetrics.totalMarketCap}
              {stats.globalMetrics.marketCapChange24h && stats.globalMetrics.marketCapChange24h !== "onbekend" && (
                <span style={{
                  color: stats.globalMetrics.marketCapChange24h.startsWith("-") ? "var(--red)" : "var(--green)",
                  marginLeft: 6, fontSize: 11
                }}>
                  {stats.globalMetrics.marketCapChange24h.startsWith("-") ? "" : "+"}{stats.globalMetrics.marketCapChange24h}
                </span>
              )}
            </span>
          </div>
        )}
        {results.length > 0 && (
          <div className="dash-stat-pill dash-signals-pill">
            <span className="dash-stat-label">Signalen</span>
            <span className="dash-stat-value" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "var(--green)" }}>{counts.green}</span>
              <span style={{ color: "var(--orange)" }}>{counts.yellow}</span>
              <span style={{ color: "var(--red)" }}>{counts.red}</span>
            </span>
          </div>
        )}
        <div className="dash-live-wrap">
          <span className="dash-live-dot" />
          <span className="dash-live-label">LIVE</span>
          <span className="dash-countdown">{countdown}s</span>
        </div>
      </div>

      {/* ── Scanner header ── */}
      <div className="scanner-header">
        <div>
          <h1 className="scanner-title">{t("scanner_title")}</h1>
          <p className="scanner-subtitle">
            {lastUpdated
              ? `Bijgewerkt om ${lastUpdated.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : t("scanner_subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Kaart / Tabel toggle */}
          <div className="scanner-view-toggle">
            <button
              className={`scanner-view-btn${view === "cards" ? " active" : ""}`}
              onClick={() => setView("cards")}
              title="Kaartweergave"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={`scanner-view-btn${view === "table" ? " active" : ""}`}
              onClick={() => setView("table")}
              title="Vergelijkingstabel"
            >
              <Table2 size={15} />
            </button>
          </div>
          <button
            className="terminal-btn terminal-btn-muted"
            onClick={handleRefresh}
            disabled={loading}
            style={{ height: 36 }}
          >
            {loading ? t("scanner_loading") : t("refresh")}
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="scanner-filters">
        {(["all", "crypto", "stock", "metal", "etf"] as const).map((f) => (
          <button
            key={f}
            className={`scanner-filter-btn${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {filterLabels[f]}
          </button>
        ))}
        <button
          className={`scanner-filter-btn scanner-filter-best${bestOnly ? " active" : ""}`}
          onClick={() => setBestOnly(v => !v)}
          style={{ marginLeft: "auto" }}
        >
          ★ Beste setups
        </button>
      </div>

      {loading && results.length === 0 && (
        <div className="scanner-loading">
          <div className="scanner-loading-text">{t("scanner_fetching")}</div>
          <div className="scanner-loading-sub">{t("scanner_fetching_sub")}</div>
        </div>
      )}

      {/* ── KAARTWEERGAVE ── */}
      {view === "cards" && (
        <div className="scanner-grid">
          {sorted.map((r) => {
            const live = livePrices.get(r.symbol);
            const displayPrice = live?.price ?? r.price;
            const displayChange = live?.change24h ?? r.change24h;
            const isLive = live?.live === true;
            return (
              <button
                key={r.symbol}
                className={`scanner-card scanner-card-${r.color}`}
                onClick={() => handleClick(r.symbol)}
              >
                <div className={`scanner-card-accent scanner-accent-${r.color}`} />
                <div className="scanner-card-top">
                  <div className="scanner-card-id">
                    <span className="scanner-card-emoji">{r.emoji}</span>
                    <div>
                      <div className="scanner-card-ticker">{r.ticker}</div>
                      <div className="scanner-card-name">{r.name}</div>
                    </div>
                  </div>
                  <div className={`scanner-card-signal scanner-signal-${r.color}`}>{signalLabel(r)}</div>
                </div>
                <div className="scanner-card-price">
                  ${fmt(displayPrice)}
                  <span className={`scanner-card-change ${displayChange >= 0 ? "pos" : "neg"}`}>
                    {displayChange >= 0 ? "+" : ""}{displayChange.toFixed(2)}%
                  </span>
                  {isLive && <span className="scanner-live-dot" title="Live WebSocket" />}
                </div>
                <div className="scanner-card-chart">
                  <Sparkline candles={r.candles} livePrice={displayPrice} />
                </div>
                <div className="scanner-card-bottom">
                  <div className="scanner-card-score">
                    <div className="scanner-score-bar">
                      <div className={`scanner-score-fill scanner-score-fill-${r.color}`} style={{ width: `${r.score}%` }} />
                    </div>
                    <span className="scanner-score-num">{r.score}/100</span>
                  </div>
                  <div className="scanner-card-meta">RSI {r.rsi} · {r.trend}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── VERGELIJKINGSTABEL ── */}
      {view === "table" && (
        <div className="scanner-table-wrap">
          <table className="scanner-table">
            <thead>
              <tr>
                <th className="scanner-th scanner-th-asset">Asset</th>
                <th className="scanner-th">Signaal</th>
                <th className="scanner-th scanner-th-sort" onClick={() => toggleSort("score")}>
                  Score <SortIcon k="score" />
                </th>
                <th className="scanner-th scanner-th-sort" onClick={() => toggleSort("rsi")}>
                  RSI <SortIcon k="rsi" />
                </th>
                <th className="scanner-th">Trend</th>
                <th className="scanner-th scanner-th-sort" onClick={() => toggleSort("price")}>
                  Prijs <SortIcon k="price" />
                </th>
                <th className="scanner-th scanner-th-sort" onClick={() => toggleSort("change24h")}>
                  24h% <SortIcon k="change24h" />
                </th>
                <th className="scanner-th">Grafiek</th>
                <th className="scanner-th"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const live = livePrices.get(r.symbol);
                const displayPrice = live?.price ?? r.price;
                const displayChange = live?.change24h ?? r.change24h;
                const isLive = live?.live === true;
                const rsiColor = r.rsi < 35 ? "var(--green)" : r.rsi > 70 ? "var(--red)" : "var(--text-primary)";
                return (
                  <tr
                    key={r.symbol}
                    className={`scanner-tr scanner-tr-${r.color}`}
                    onClick={() => handleClick(r.symbol)}
                  >
                    <td className="scanner-td scanner-td-asset">
                      <span style={{ fontSize: 20 }}>{r.emoji}</span>
                      <div>
                        <div className="scanner-td-ticker">{r.ticker}</div>
                        <div className="scanner-td-name">{r.name}</div>
                      </div>
                    </td>
                    <td className="scanner-td">
                      <span className={`scanner-table-signal scanner-signal-${r.color}`}>{signalLabel(r)}</span>
                    </td>
                    <td className="scanner-td scanner-td-score">
                      <ScoreBar score={r.score} color={r.color} />
                    </td>
                    <td className="scanner-td" style={{ color: rsiColor, fontWeight: 600, fontSize: 13 }}>
                      {r.rsi}
                    </td>
                    <td className="scanner-td scanner-td-trend">
                      <TrendIcon trend={r.trend} />
                      <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>{r.trend}</span>
                    </td>
                    <td className="scanner-td scanner-td-price">
                      ${fmt(displayPrice)}
                      {isLive && <span className="scanner-live-dot" style={{ marginLeft: 4 }} />}
                    </td>
                    <td className="scanner-td" style={{ color: displayChange >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600, fontSize: 13 }}>
                      {displayChange >= 0 ? "+" : ""}{displayChange.toFixed(2)}%
                    </td>
                    <td className="scanner-td scanner-td-spark">
                      <Sparkline candles={r.candles} livePrice={displayPrice} />
                    </td>
                    <td className="scanner-td scanner-td-action">
                      <button
                        className="scanner-table-btn"
                        onClick={(e) => { e.stopPropagation(); handleClick(r.symbol); }}
                      >
                        Trade →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              Geen assets gevonden voor deze filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
