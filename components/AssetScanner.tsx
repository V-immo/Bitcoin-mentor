"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ScanResult } from "@/app/api/market-scan/route";
import { useLanguage } from "@/contexts/LanguageContext";

function Sparkline({ candles }: { candles: { close: number }[] }) {
  if (candles.length < 2) return <div style={{ height: 40 }} />;
  const closes = candles.map((c) => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const w = 120, h = 40, pad = 2;
  const pts = closes.map((c, i) => {
    const x = pad + (i / (closes.length - 1)) * (w - pad * 2);
    const y = h - pad - ((c - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const isUp = closes[closes.length - 1] >= closes[0];
  return (
    <svg width={w} height={h} style={{ display: "block", width: "100%" }}>
      <polyline points={pts} fill="none" stroke={isUp ? "#26c57c" : "#ef4444"} strokeWidth="1.5" />
    </svg>
  );
}

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 10) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export default function AssetScanner() {
  const { t } = useLanguage();
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "crypto" | "stock" | "metal" | "etf">("all");
  const router = useRouter();

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/market-scan");
      if (res.ok) setResults(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleClick(symbol: string) {
    localStorage.setItem("bitcoin-mentor-selected-asset", symbol);
    router.push("/trade");
  }

  const filtered = filter === "all" ? results : results.filter((r) => r.type === filter);
  const sorted = [...filtered].sort((a, b) => b.score - a.score);

  const filterLabels: Record<string, string> = {
    all: t("scanner_filter_all"),
    crypto: t("scanner_filter_crypto"),
    stock: t("scanner_filter_stock"),
    metal: t("scanner_filter_metal"),
    etf: t("scanner_filter_etf"),
  };

  return (
    <div className="scanner-page">
      <div className="scanner-header">
        <div>
          <h1 className="scanner-title">{t("scanner_title")}</h1>
          <p className="scanner-subtitle">{t("scanner_subtitle")}</p>
        </div>
        <button className="terminal-btn terminal-btn-muted" onClick={load} disabled={loading} style={{ height: 36 }}>
          {loading ? t("scanner_loading") : t("refresh")}
        </button>
      </div>

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

      <div className="scanner-grid">
        {sorted.map((r) => (
          <button
            key={r.symbol}
            className={`scanner-card scanner-card-${r.color}`}
            onClick={() => handleClick(r.symbol)}
          >
            <div className="scanner-card-top">
              <div className="scanner-card-id">
                <span className="scanner-card-emoji">{r.emoji}</span>
                <div>
                  <div className="scanner-card-ticker">{r.ticker}</div>
                  <div className="scanner-card-name">{r.name}</div>
                </div>
              </div>
              <div className={`scanner-card-signal scanner-signal-${r.color}`}>
                {r.signal}
              </div>
            </div>

            <div className="scanner-card-price">
              ${fmt(r.price)}
              <span className={`scanner-card-change ${r.change24h >= 0 ? "pos" : "neg"}`}>
                {r.change24h >= 0 ? "+" : ""}{r.change24h.toFixed(2)}%
              </span>
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
        ))}
      </div>
    </div>
  );
}
