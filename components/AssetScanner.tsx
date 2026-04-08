"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ScanResult } from "@/app/api/market-scan/route";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLivePrices } from "@/hooks/useLivePrices";

const REFRESH_INTERVAL = 15; // seconden — ≤25s verschil met server cache (10s)

function Sparkline({ candles }: { candles: { close: number }[] }) {
  if (candles.length < 2) return <div style={{ height: 36 }} />;
  const closes = candles.map((c) => c.close);
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
  const color = isUp ? "#22d47a" : "#f05252";
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

function fgColor(fg: string): string {
  const val = parseInt(fg);
  if (isNaN(val)) return "#94a3b8";
  if (val >= 75) return "#f59e0b";
  if (val >= 55) return "#22d47a";
  if (val >= 45) return "#94a3b8";
  if (val >= 25) return "#f59e0b";
  return "#f05252";
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

export default function AssetScanner() {
  const { t } = useLanguage();
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "crypto" | "stock" | "metal" | "etf">("all");
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live WebSocket prijzen — crypto sub-seconde, stocks tijdens beurstijden
  const livePrices = useLivePrices();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/market-scan");
      if (res.ok) {
        setResults(await res.json());
        setLastUpdated(new Date());
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/market-stats");
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
  }, []);

  // Initieel laden
  useEffect(() => {
    load();
    loadStats();
  }, [load, loadStats]);

  // Auto-refresh elke 30 seconden
  useEffect(() => {
    timerRef.current = setInterval(() => {
      load();
      loadStats();
      setCountdown(REFRESH_INTERVAL);
    }, REFRESH_INTERVAL * 1000);

    countdownRef.current = setInterval(() => {
      setCountdown(c => Math.max(0, c - 1));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [load, loadStats]);

  function handleClick(symbol: string) {
    localStorage.setItem("bitcoin-mentor-selected-asset", symbol);
    router.push("/trade");
  }

  function handleRefresh() {
    setLoading(true);
    setCountdown(REFRESH_INTERVAL);
    load();
    loadStats();
  }

  const filtered = filter === "all" ? results : results.filter((r) => r.type === filter);
  const sorted = [...filtered].sort((a, b) => b.score - a.score);

  const counts = stats?.counts ?? {
    green: results.filter(r => r.color === "green").length,
    yellow: results.filter(r => r.color === "yellow").length,
    red: results.filter(r => r.color === "red").length,
  };

  const fgRaw = stats?.fearGreed ?? "";
  const fgNum = fgRaw.split("/")[0] ?? "—";

  const filterLabels: Record<string, string> = {
    all: t("scanner_filter_all"),
    crypto: t("scanner_filter_crypto"),
    stock: t("scanner_filter_stock"),
    metal: t("scanner_filter_metal"),
    etf: t("scanner_filter_etf"),
  };

  return (
    <div className="scanner-page">

      {/* ── Market Stats Balk ── */}
      <div className="dash-stats-bar">
        {/* Sentiment */}
        <div className="dash-stat-pill" style={{ "--accent": fgColor(fgNum) } as React.CSSProperties}>
          <span className="dash-stat-label">Fear & Greed</span>
          <span className="dash-stat-value" style={{ color: fgColor(fgNum) }}>
            {fgNum !== "—" ? `${fgNum} · ` : ""}{fgLabel(fgNum)}
          </span>
        </div>

        {/* BTC prijs */}
        {stats?.btcPrice && (
          <div className="dash-stat-pill">
            <span className="dash-stat-label">₿ Bitcoin</span>
            <span className="dash-stat-value">
              ${fmt(stats.btcPrice)}
              {stats.btcChange != null && (
                <span style={{ color: stats.btcChange >= 0 ? "#22d47a" : "#f05252", marginLeft: 6, fontSize: 11 }}>
                  {stats.btcChange >= 0 ? "+" : ""}{stats.btcChange.toFixed(2)}%
                </span>
              )}
            </span>
          </div>
        )}

        {/* BTC dominance */}
        {stats?.globalMetrics?.btcDominance && stats.globalMetrics.btcDominance !== "onbekend" && (
          <div className="dash-stat-pill">
            <span className="dash-stat-label">BTC Dom.</span>
            <span className="dash-stat-value">{stats.globalMetrics.btcDominance}</span>
          </div>
        )}

        {/* Market cap */}
        {stats?.globalMetrics?.totalMarketCap && stats.globalMetrics.totalMarketCap !== "onbekend" && (
          <div className="dash-stat-pill">
            <span className="dash-stat-label">Markt Cap</span>
            <span className="dash-stat-value">
              {stats.globalMetrics.totalMarketCap}
              {stats.globalMetrics.marketCapChange24h && stats.globalMetrics.marketCapChange24h !== "onbekend" && (
                <span style={{
                  color: stats.globalMetrics.marketCapChange24h.startsWith("-") ? "#f05252" : "#22d47a",
                  marginLeft: 6, fontSize: 11
                }}>
                  {stats.globalMetrics.marketCapChange24h.startsWith("-") ? "" : "+"}{stats.globalMetrics.marketCapChange24h}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Signaal teller */}
        {results.length > 0 && (
          <div className="dash-stat-pill dash-signals-pill">
            <span className="dash-stat-label">Signalen</span>
            <span className="dash-stat-value" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "#22d47a" }}>🟢 {counts.green}</span>
              <span style={{ color: "#f59e0b" }}>🟡 {counts.yellow}</span>
              <span style={{ color: "#f05252" }}>🔴 {counts.red}</span>
            </span>
          </div>
        )}

        {/* Live badge + countdown */}
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
        <button
          className="terminal-btn terminal-btn-muted"
          onClick={handleRefresh}
          disabled={loading}
          style={{ height: 36 }}
        >
          {loading ? t("scanner_loading") : t("refresh")}
        </button>
      </div>

      {/* ── Filter knoppen ── */}
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
      </div>

      {loading && results.length === 0 && (
        <div className="scanner-loading">
          <div className="scanner-loading-text">{t("scanner_fetching")}</div>
          <div className="scanner-loading-sub">{t("scanner_fetching_sub")}</div>
        </div>
      )}

      {/* ── Grid ── */}
      <div className="scanner-grid">
        {sorted.map((r) => {
          // Gebruik live WebSocket prijs als beschikbaar, anders REST prijs
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
              {/* Score glow accent */}
              <div className={`scanner-card-accent scanner-accent-${r.color}`} />

              <div className="scanner-card-top">
                <div className="scanner-card-id">
                  <span className="scanner-card-emoji">{r.emoji}</span>
                  <div>
                    <div className="scanner-card-ticker">{r.ticker}</div>
                    <div className="scanner-card-name">{r.name}</div>
                  </div>
                </div>
                <div className={`scanner-card-signal scanner-signal-${r.color}`}>
                  {r.signal === "Goed moment" ? t("status_good_moment")
                    : r.signal === "Wachten" ? t("status_wait")
                    : t("status_no_buy")}
                </div>
              </div>

              <div className="scanner-card-price">
                ${fmt(displayPrice)}
                <span className={`scanner-card-change ${displayChange >= 0 ? "pos" : "neg"}`}>
                  {displayChange >= 0 ? "+" : ""}{displayChange.toFixed(2)}%
                </span>
                {isLive && <span className="scanner-live-dot" title="Live WebSocket" />}
              </div>

              <div className="scanner-card-chart">
                <Sparkline candles={r.candles} />
              </div>

              <div className="scanner-card-bottom">
                <div className="scanner-card-score">
                  <div className="scanner-score-bar">
                    <div
                      className={`scanner-score-fill scanner-score-fill-${r.color}`}
                      style={{ width: `${r.score}%` }}
                    />
                  </div>
                  <span className="scanner-score-num">{r.score}/100</span>
                </div>
                <div className="scanner-card-meta">
                  RSI {r.rsi} · {r.trend}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
