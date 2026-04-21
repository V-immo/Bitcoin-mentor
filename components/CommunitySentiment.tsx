"use client";

import { useEffect, useState } from "react";
import { Globe, TrendingUp, BarChart3, TrendingDown, Flame } from "lucide-react";

type SentimentData = {
  bullishPct: number;
  openLongs: number;
  totalOpen: number;
  recentBuys: number;
  recentSells: number;
  hotAssets: { asset: string; count: number }[];
  activeTraders: number;
};

export default function CommunitySentiment() {
  const [data, setData] = useState<SentimentData | null>(null);

  useEffect(() => {
    fetch("/api/community/sentiment")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && !d.error && setData(d))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const { bullishPct, activeTraders, hotAssets, recentBuys, recentSells } = data;
  const bearishPct = 100 - bullishPct;

  // Kleur gebaseerd op sentiment
  const sentimentColor = bullishPct >= 65 ? "var(--green)"
    : bullishPct >= 45 ? "var(--orange)"
    : "var(--red)";
  const sentimentLabel = bullishPct >= 65 ? "Bullish"
    : bullishPct >= 45 ? "Gemengd"
    : "Bearish";

  const totalRecent = recentBuys + recentSells;

  return (
    <div style={{
      background: "var(--surface-2, rgba(255,255,255,0.03))",
      border: "1px solid var(--border, rgba(255,255,255,0.08))",
      borderRadius: 14, padding: "16px 18px",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}><Globe size={14} /> Community Sentiment</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {activeTraders > 0 ? `${activeTraders} actieve trader${activeTraders !== 1 ? "s" : ""}` : "Community data"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: sentimentColor }}>{bullishPct}%</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sentimentLabel}</div>
        </div>
      </div>

      {/* Bull/Bear meter */}
      <div style={{ height: 8, borderRadius: 99, overflow: "hidden", background: "rgba(240,82,82,0.3)", marginBottom: 12 }}>
        <div style={{
          height: "100%",
          width: `${bullishPct}%`,
          background: `linear-gradient(90deg, #22d47a, #16a34a)`,
          borderRadius: 99,
          transition: "width 0.6s ease",
        }} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {/* Bull/Bear labels */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
          <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}><TrendingUp size={12} /> Bull {bullishPct}%</span>
          <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}><TrendingDown size={12} /> Bear {bearishPct}%</span>
        </div>

        {/* Recente activiteit */}
        {totalRecent > 0 && (
          <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
            <span>↑ {recentBuys} buys</span>
            <span>↓ {recentSells} sells</span>
            <span style={{ color: "var(--text-muted)" }}>laatste 24u</span>
          </div>
        )}
      </div>

      {/* Hot assets */}
      {hotAssets.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center", display: "flex", alignItems: "center", gap: 3 }}><Flame size={11} /> Trending:</span>
          {hotAssets.map(a => (
            <span key={a.asset} style={{
              fontSize: 11, fontWeight: 600,
              background: "rgba(34,212,122,0.1)",
              color: "var(--green)",
              borderRadius: 4, padding: "2px 7px",
            }}>
              {a.asset} ×{a.count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
