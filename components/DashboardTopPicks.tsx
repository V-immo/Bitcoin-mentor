"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ScanResult } from "@/app/api/market-scan/route";
import { useLivePrices } from "@/hooks/useLivePrices";

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 10) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export default function DashboardTopPicks() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const livePrices = useLivePrices();

  useEffect(() => {
    fetch("/api/market-scan")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setResults(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Top 3 groene assets + 2 rode als waarschuwing
  const green = results.filter(r => r.color === "green").sort((a, b) => b.score - a.score).slice(0, 3);
  const red = results.filter(r => r.color === "red").sort((a, b) => a.score - b.score).slice(0, 2);

  function handleClick(symbol: string) {
    localStorage.setItem("bitcoin-mentor-selected-asset", symbol);
    router.push("/trade");
  }

  if (loading) return (
    <div className="dash-picks-wrap">
      <div className="dash-picks-loading">Markt laden…</div>
    </div>
  );

  return (
    <div className="dash-picks-wrap">
      {/* Beste kansen */}
      {green.length > 0 && (
        <section className="dash-picks-section">
          <div className="dash-picks-label">🟢 Beste kansen nu</div>
          <div className="dash-picks-grid">
            {green.map(r => {
              const live = livePrices.get(r.symbol);
              const price = live?.price ?? r.price;
              const chg = live?.change24h ?? r.change24h;
              return (
                <button key={r.symbol} className="dash-pick-card dash-pick-green" onClick={() => handleClick(r.symbol)}>
                  <div className="dash-pick-top">
                    <span className="dash-pick-emoji">{r.emoji}</span>
                    <div>
                      <div className="dash-pick-ticker">{r.ticker}</div>
                      <div className="dash-pick-name">{r.name}</div>
                    </div>
                    <div className="dash-pick-score">{r.score}/100</div>
                  </div>
                  <div className="dash-pick-price">
                    ${fmt(price)}
                    <span className={chg >= 0 ? "pos" : "neg"}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</span>
                  </div>
                  <div className="dash-pick-meta">RSI {r.rsi} · {r.trend} · {r.signal}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Vermijden */}
      {red.length > 0 && (
        <section className="dash-picks-section">
          <div className="dash-picks-label">🔴 Vermijden nu</div>
          <div className="dash-picks-grid">
            {red.map(r => {
              const live = livePrices.get(r.symbol);
              const price = live?.price ?? r.price;
              const chg = live?.change24h ?? r.change24h;
              return (
                <button key={r.symbol} className="dash-pick-card dash-pick-red" onClick={() => handleClick(r.symbol)}>
                  <div className="dash-pick-top">
                    <span className="dash-pick-emoji">{r.emoji}</span>
                    <div>
                      <div className="dash-pick-ticker">{r.ticker}</div>
                      <div className="dash-pick-name">{r.name}</div>
                    </div>
                    <div className="dash-pick-score">{r.score}/100</div>
                  </div>
                  <div className="dash-pick-price">
                    ${fmt(price)}
                    <span className={chg >= 0 ? "pos" : "neg"}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</span>
                  </div>
                  <div className="dash-pick-meta">RSI {r.rsi} · {r.trend} · {r.signal}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="dash-picks-footer">
        <a href="/scanner" className="dash-picks-all-link">Volledige scanner bekijken →</a>
      </div>
    </div>
  );
}
