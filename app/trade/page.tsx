"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import RealtimeDashboard from "@/components/RealtimeDashboard";
import { SCAN_ASSETS } from "@/lib/assets";
import type { MentorSignal } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";

function TradePageInner() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [signal, setSignal] = useState<MentorSignal | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [error, setError] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  useEffect(() => {
    const paramAsset = searchParams.get("asset");
    const stored = localStorage.getItem("bitcoin-mentor-selected-asset");
    const seenIntro = localStorage.getItem("btcmentor-trade-intro");

    // URL param heeft prioriteit (vanuit MarketOverview)
    const asset = paramAsset ?? stored;

    if (!asset) {
      setShowPicker(true);
    } else {
      if (paramAsset) localStorage.setItem("bitcoin-mentor-selected-asset", paramAsset);
      setSelectedAsset(asset);
      if (!seenIntro) setShowIntro(true);
      loadSignal(asset);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadSignal(asset: string) {
    setError(false);
    setSignal(null);
    fetch("/api/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: asset }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setSignal(data))
      .catch(() => setError(true));
  }

  function pickAsset(symbol: string) {
    localStorage.setItem("bitcoin-mentor-selected-asset", symbol);
    setSelectedAsset(symbol);
    setShowPicker(false);
    const seenIntro = localStorage.getItem("btcmentor-trade-intro");
    if (!seenIntro) setShowIntro(true);
    loadSignal(symbol);
  }

  function dismissIntro() {
    localStorage.setItem("btcmentor-trade-intro", "1");
    setShowIntro(false);
  }

  // Asset picker (eerste bezoek)
  if (showPicker) {
    const q = pickerSearch.toLowerCase().trim();
    const filteredAssets = q
      ? SCAN_ASSETS.filter(a =>
          a.name.toLowerCase().includes(q) ||
          a.ticker.toLowerCase().includes(q) ||
          a.symbol.toLowerCase().includes(q)
        )
      : SCAN_ASSETS;

    return (
      <main className="page-container">
        <div style={{ marginBottom: 12 }}>
          <Link href="/leren" className="page-back-btn">
            {t("trade_back_learn")}
          </Link>
        </div>
        <div className="asset-picker-screen">
          <div className="asset-picker-title">{t("trade_picker_title")}</div>
          <div className="asset-picker-sub">
            {t("trade_picker_sub")}
          </div>
          <div className="asset-picker-search-wrap">
            <input
              className="asset-picker-search"
              type="text"
              placeholder="Zoeken..."
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="asset-picker-grid">
            {filteredAssets.map((a) => (
              <button
                key={a.symbol}
                className="asset-picker-card"
                onClick={() => pickAsset(a.symbol)}
              >
                <span className="asset-picker-emoji">{a.emoji}</span>
                <span className="asset-picker-name">{a.name}</span>
                <span className="asset-picker-ticker">{a.ticker}</span>
                <span className="asset-picker-type">
                  {a.type === "crypto" ? t("trade_type_crypto") : a.type === "metal" ? t("trade_type_metal") : t("trade_type_stock")}
                </span>
              </button>
            ))}
            {filteredAssets.length === 0 && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--text-muted)", padding: "32px 0", fontSize: 14 }}>
                Geen resultaten voor &ldquo;{pickerSearch}&rdquo;
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-container page-narrow">
        <div className="card">
          <div className="value-sm red">{t("trade_error_load")}</div>
          <p className="small-text muted" style={{ marginTop: 8 }}>
            {t("trade_error_desc")}
          </p>
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => selectedAsset && loadSignal(selectedAsset)}>
            {t("trade_error_retry")}
          </button>
        </div>
      </main>
    );
  }

  if (!signal) {
    const assetDef = SCAN_ASSETS.find(a => a.symbol === selectedAsset);
    return (
      <main className="page-container">
        <div className="trade-loading">
          <div className="trade-loading-text">{t("trade_loading_text")}</div>
          <div className="trade-loading-sub">
            {assetDef ? `${assetDef.emoji} ${assetDef.name} ${t("trade_loading_market")}` : `${t("trade_loading_market")} ${selectedAsset}`}
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      {/* Intro banner (eerste keer na asset keuze) */}
      {showIntro && (
        <div className="intro-banner intro-banner-overlay">
          <div className="intro-banner-content">
            <div className="intro-banner-title">{t("trade_intro_title")}</div>
            <div className="intro-banner-body">
              <ul>
                <li><strong>{t("trade_intro_chart")}</strong> — {t("trade_intro_chart_desc")}</li>
                <li><strong>{t("trade_intro_marcus")}</strong> — {t("trade_intro_marcus_desc")}</li>
                <li><strong>{t("trade_intro_paper")}</strong> — {t("trade_intro_paper_desc")}</li>
                <li><strong>{t("trade_intro_analysis")}</strong> — {t("trade_intro_analysis_desc")}</li>
                <li><strong>{t("trade_intro_switch")}</strong> — {t("trade_intro_switch_desc")}</li>
              </ul>
            </div>
            <button className="intro-banner-close" onClick={dismissIntro}>
              {t("trade_intro_cta")}
            </button>
          </div>
        </div>
      )}
      <RealtimeDashboard initialData={signal} initialAsset={selectedAsset ?? "BTCUSDT"} />
    </>
  );
}

export default function TradePage() {
  return (
    <Suspense>
      <TradePageInner />
    </Suspense>
  );
}
