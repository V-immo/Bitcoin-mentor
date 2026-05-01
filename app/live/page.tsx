"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BitvavoPanel from "@/components/BitvavoPanel";
import BybitPanel from "@/components/BybitPanel";
import OKXPanel from "@/components/OKXPanel";
import MEXCPanel from "@/components/MEXCPanel";
import { SCAN_ASSETS } from "@/lib/assets";
import { useLanguage } from "@/contexts/LanguageContext";

type Exchange = "bitvavo" | "bybit" | "okx" | "mexc";

export default function LivePage() {
  const { t } = useLanguage();
  const [price, setPrice]       = useState(0);
  const [asset, setAsset]       = useState("BTCUSDT");
  const [exchange, setExchange] = useState<Exchange>("bitvavo");

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
    <main className="page-container page-narrow">
      <div className="page-back-row">
        <Link href="/trade" className="page-back-btn">{t("page_back")}</Link>
        <h1 className="page-title">▲ {t("live_page_title")}</h1>
      </div>

      {/* Asset selector */}
      <div style={{ marginBottom: 16 }}>
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

      {/* Exchange tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
        {([
          { key: "bitvavo" as Exchange, label: "Bitvavo", desc: t("live_exchange_bitvavo_desc") },
          { key: "bybit"   as Exchange, label: "Bybit",   desc: t("live_exchange_bybit_desc") },
          { key: "okx"     as Exchange, label: "OKX",     desc: "Global spot" },
          { key: "mexc"    as Exchange, label: "MEXC",    desc: "0% maker fee" },
        ]).map(ex => (
          <button
            key={ex.key}
            onClick={() => setExchange(ex.key)}
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "none",
              cursor: "pointer",
              background: exchange === ex.key ? "var(--accent)" : "var(--surface-2)",
              color: exchange === ex.key ? "#fff" : "var(--text-secondary)",
              fontWeight: exchange === ex.key ? 700 : 400,
              fontSize: 13,
              transition: "all 0.15s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span>{ex.label}</span>
            <span style={{ fontSize: 10, opacity: 0.75, fontWeight: 400 }}>{ex.desc}</span>
          </button>
        ))}
      </div>

      {/* Panel */}
      {exchange === "bitvavo" && <BitvavoPanel currentPrice={price} asset={asset} />}
      {exchange === "bybit"   && <BybitPanel   currentPrice={price} asset={asset} />}
      {exchange === "okx"     && <OKXPanel     currentPrice={price} asset={asset} />}
      {exchange === "mexc"    && <MEXCPanel    currentPrice={price} asset={asset} />}
    </main>
  );
}
