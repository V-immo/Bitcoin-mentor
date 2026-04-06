"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TestnetPanel from "@/components/TestnetPanel";
import { SCAN_ASSETS } from "@/lib/assets";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TestnetPage() {
  const { t } = useLanguage();
  const [price, setPrice] = useState(0);
  const [asset, setAsset] = useState("BTCUSDT");

  useEffect(() => {
    const stored = localStorage.getItem("bitcoin-mentor-selected-asset");
    if (stored) setAsset(stored);
  }, []);

  useEffect(() => {
    fetch("/api/price?symbol=" + asset)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.price) setPrice(d.price); })
      .catch(() => {});
    const iv = setInterval(() => {
      fetch("/api/price?symbol=" + asset)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.price) setPrice(d.price); })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(iv);
  }, [asset]);

  const cryptoAssets = SCAN_ASSETS.filter(a => a.type === "crypto");

  return (
    <main className="container-page clean-page">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Link href="/trade" className="page-back-btn">{t("page_back")}</Link>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🔬 {t("testnet_page_title")}</h1>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("asset_label")}</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {cryptoAssets.map(a => (
            <button
              key={a.symbol}
              onClick={() => setAsset(a.symbol)}
              className={`asset-bar-btn${asset === a.symbol ? " active" : ""}`}
              style={{ fontSize: 13 }}
            >
              {a.emoji} {a.ticker}
            </button>
          ))}
        </div>
      </div>

      <TestnetPanel currentPrice={price} asset={asset} />
    </main>
  );
}
