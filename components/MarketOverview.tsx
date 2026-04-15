"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SCAN_ASSETS, type AssetDef } from "@/lib/assets";
import { useLanguage } from "@/contexts/LanguageContext";

type PriceData = { price: number; change24h: number };
type PriceMap = Record<string, PriceData>;

const GROUPS = [
  { key: "all",         types: null },
  { key: "crypto",      types: ["crypto"] },
  { key: "stock_etf",   types: ["stock", "etf"] },
  { key: "metal",       types: ["metal"] },
] as const;

function fmtPrice(price: number, asset: AssetDef): string {
  if (price <= 0) return "—";
  if (asset.type === "crypto") {
    if (price >= 1000) return "$" + price.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (price >= 10)   return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MarketOverview({ compact }: { compact?: boolean }) {
  const { t } = useLanguage();
  const [prices, setPrices] = useState<PriceMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "change">("change");

  async function loadPrices() {
    setError(false);
    try {
      // Gebruik server-side /api/market-scan (voorkomt CORS-problemen met Binance)
      const res = await fetch("/api/market-scan");
      if (!res.ok) throw new Error("scan failed");
      const scan: { symbol: string; price: number; change24h: number }[] = await res.json();
      const map: PriceMap = {};
      for (const item of scan) {
        map[item.symbol] = { price: item.price, change24h: item.change24h };
      }
      setPrices(map);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrices();
    const id = setInterval(loadPrices, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupLabels: Record<string, string> = {
    all:       t("market_overview_all"),
    crypto:    t("group_crypto"),
    stock_etf: t("group_stocks"),
    metal:     t("group_commodities"),
  };

  const visibleAssets = SCAN_ASSETS
    .filter(a => {
      if (activeGroup === "all") return true;
      if (activeGroup === "stock_etf") return a.type === "stock" || a.type === "etf";
      return a.type === activeGroup;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      const ca = prices[a.symbol]?.change24h ?? 0;
      const cb = prices[b.symbol]?.change24h ?? 0;
      return cb - ca;
    });

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div className="label">{t("market_overview_title")}</div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            className={`btn-secondary${sortBy === "change" ? " active" : ""}`}
            style={{ fontSize: 11, padding: "2px 8px" }}
            onClick={() => setSortBy("change")}
          >
            {t("market_overview_change")} ↕
          </button>
          <button
            className={`btn-secondary${sortBy === "name" ? " active" : ""}`}
            style={{ fontSize: 11, padding: "2px 8px" }}
            onClick={() => setSortBy("name")}
          >
            A–Z
          </button>
          <button
            className="btn-secondary"
            style={{ fontSize: 11, padding: "2px 8px" }}
            onClick={loadPrices}
            disabled={loading}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Groep tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {GROUPS.map(g => (
          <button
            key={g.key}
            onClick={() => setActiveGroup(g.key)}
            style={{
              padding: "3px 10px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: activeGroup === g.key ? 700 : 400,
              background: activeGroup === g.key ? "var(--primary)" : "var(--surface-1)",
              color: activeGroup === g.key ? "#fff" : "var(--text-secondary)",
              border: "none",
              cursor: "pointer",
            }}
          >
            {groupLabels[g.key]}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="warning-box" style={{ marginBottom: 10 }}>{t("market_overview_error")}</div>
      )}

      {/* Grid */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #2a1a28" }}>
              <th style={{ padding: "5px 6px", textAlign: "left",  color: "var(--text-secondary)", fontWeight: 600 }}>Asset</th>
              <th style={{ padding: "5px 6px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600 }}>{t("market_overview_price")}</th>
              <th style={{ padding: "5px 6px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600 }}>{t("market_overview_change")}</th>
              <th style={{ padding: "5px 6px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && Object.keys(prices).length === 0
              ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1a0f18" }}>
                  {[180, 80, 60, 50].map((w, j) => (
                    <td key={j} style={{ padding: "9px 6px" }}>
                      <div style={{ height: 11, width: w, borderRadius: 5, background: "var(--surface-1)", animation: "pulse 1.4s ease-in-out infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
              : visibleAssets.map(asset => {
                const pd = prices[asset.symbol];
                const change = pd?.change24h ?? null;
                const isPos = change !== null && change > 0;
                const isNeg = change !== null && change < 0;
                return (
                  <tr key={asset.symbol} style={{ borderBottom: "1px solid #1a0f18" }}>
                    <td style={{ padding: "9px 6px" }}>
                      <span style={{ marginRight: 6 }}>{asset.emoji}</span>
                      <span style={{ fontWeight: 500, color: "var(--text)" }}>{asset.name}</span>
                      <span style={{ marginLeft: 5, fontSize: 10, color: "var(--text-muted)" }}>{asset.ticker}</span>
                    </td>
                    <td style={{ padding: "9px 6px", textAlign: "right", fontWeight: 600, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                      {pd ? fmtPrice(pd.price, asset) : <span style={{ color: "var(--surface-1)" }}>—</span>}
                    </td>
                    <td style={{ padding: "9px 6px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums",
                      color: isPos ? "var(--green)" : isNeg ? "var(--red)" : "var(--text-secondary)" }}>
                      {change !== null
                        ? `${isPos ? "+" : ""}${change.toFixed(2)}%`
                        : <span style={{ color: "var(--surface-1)" }}>—</span>}
                    </td>
                    <td style={{ padding: "9px 6px", textAlign: "right" }}>
                      <Link
                        href={`/trade?asset=${asset.symbol}`}
                        style={{ fontSize: 11, color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}
                      >
                        {t("market_overview_trade")} →
                      </Link>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        .btn-secondary.active { background: #3d2a3b; color: #e5d4e7; }
      `}</style>
    </div>
  );
}
