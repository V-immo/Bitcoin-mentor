"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RealtimeDashboard from "@/components/RealtimeDashboard";
import { SCAN_ASSETS } from "@/lib/assets";
import type { MentorSignal } from "@/lib/types";

export default function TradePage() {
  const [signal, setSignal] = useState<MentorSignal | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("bitcoin-mentor-selected-asset");
    const seenIntro = localStorage.getItem("btcmentor-trade-intro");

    if (!stored) {
      // Eerste bezoek: toon asset picker
      setShowPicker(true);
    } else {
      setSelectedAsset(stored);
      if (!seenIntro) setShowIntro(true);
      loadSignal(stored);
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
    return (
      <main className="container-page">
        <div style={{ marginBottom: 12 }}>
          <Link href="/leren" className="page-back-btn">
            ← Ga eerst leren
          </Link>
        </div>
        <div className="asset-picker-screen">
          <div className="asset-picker-title">Wat wil je vandaag traden?</div>
          <div className="asset-picker-sub">
            Kies een asset om de analyse, grafiek en Marcus AI te laden.
            Je kunt later altijd wisselen.
          </div>
          <div className="asset-picker-grid">
            {SCAN_ASSETS.map((a) => (
              <button
                key={a.symbol}
                className="asset-picker-card"
                onClick={() => pickAsset(a.symbol)}
              >
                <span className="asset-picker-emoji">{a.emoji}</span>
                <span className="asset-picker-name">{a.name}</span>
                <span className="asset-picker-ticker">{a.ticker}</span>
                <span className="asset-picker-type">{a.type === "crypto" ? "Crypto" : a.type === "metal" ? "Edelmetaal" : "Aandeel"}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container-page clean-page">
        <div className="card">
          <div className="value-sm red">Kon analyse niet laden</div>
          <p className="small-text muted" style={{ marginTop: 8 }}>
            Controleer je verbinding en probeer opnieuw.
          </p>
          <button className="admin-btn admin-btn-primary" style={{ marginTop: 12 }} onClick={() => selectedAsset && loadSignal(selectedAsset)}>
            Opnieuw proberen
          </button>
        </div>
      </main>
    );
  }

  if (!signal) {
    const assetDef = SCAN_ASSETS.find(a => a.symbol === selectedAsset);
    return (
      <main className="container-page">
        <div className="trade-loading">
          <div className="trade-loading-text">Analyse laden…</div>
          <div className="trade-loading-sub">
            {assetDef ? `${assetDef.emoji} ${assetDef.name} marktdata ophalen` : `Marktdata ophalen voor ${selectedAsset}`}
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
            <div className="intro-banner-title">Hoe werkt het handelsscherm? 📈</div>
            <div className="intro-banner-body">
              <ul>
                <li><strong>Grafiek</strong> — Live koersgrafiek. Wissel tijdsframe (1u, 4u, dagelijks). Zet Bollinger Bands of MACD aan voor extra analyse.</li>
                <li><strong>Marcus AI (eerste tab)</strong> — Jouw persoonlijke mentor. Stel vragen, klik op &quot;Moet ik nu kopen?&quot; of laat hem de markt uitleggen.</li>
                <li><strong>Paper Trading</strong> — Oefen met nep-geld. Koop en verkoop zonder echt risico om strategieën te testen.</li>
                <li><strong>Analyse</strong> — Automatisch gegenereerde signalen: trend, RSI, support/resistance, advies.</li>
                <li><strong>Asset wisselen</strong> — Gebruik de balk boven de grafiek om naar BTC, ETH, aandelen of goud te switchen.</li>
              </ul>
            </div>
            <button className="intro-banner-close" onClick={dismissIntro}>
              Begrepen, laten we traden →
            </button>
          </div>
        </div>
      )}
      <RealtimeDashboard initialData={signal} initialAsset={selectedAsset ?? "BTCUSDT"} />
    </>
  );
}
