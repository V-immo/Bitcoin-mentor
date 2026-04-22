"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";

type ScriptData = {
  hook: string;
  analyse: string;
  cta: string;
  hashtags: string;
  script: string;
  btcData: { price: number; change24h: number; trend: string; rsi: number; signal: string } | null;
  count: number;
  maxCount: number;
};

const PLATFORMS = [
  { key: "tiktok",  label: "TikTok",      emoji: "▶" },
  { key: "reels",   label: "Reels",       emoji: "◉" },
  { key: "shorts",  label: "Shorts",      emoji: "▲" },
  { key: "twitter", label: "X / Twitter", emoji: "✕" },
];

export default function ContentPage() {
  const { data: session } = useSession();
  const { lang } = useLanguage();
  const isNL = lang === "nl";

  const [data, setData] = useState<ScriptData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [copied, setCopied]     = useState<string>("");
  const [generated, setGenerated] = useState(false);

  async function generate() {
    if (!session?.user) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/me/content-script?lang=${lang}`);
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Genereren mislukt"); setLoading(false); return; }
      setData(d);
      setGenerated(true);
    } catch { setError("Verbindingsfout"); }
    setLoading(false);
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 2500);
    });
  }

  function platformScript(platform: string): string {
    if (!data) return "";
    if (platform === "twitter") {
      return `${data.hook}\n\n${data.cta}\n\n${data.hashtags.split(" ").slice(0, 4).join(" ")}`;
    }
    return data.script;
  }

  return (
    <div className="content-page">
      <div className="content-header">
        <h1 className="content-title">
          {isNL ? "📱 Vandaag's analyse — deel het" : "📱 Today's analysis — share it"}
        </h1>
        <p className="content-subtitle">
          {isNL
            ? "Marcus genereert een kant-en-klaar 30-seconden script op basis van de live markt. Kopieer en post op TikTok, Reels of Shorts — met vermelding van bitcoinmentor.be."
            : "Marcus generates a ready-made 30-second script based on the live market. Copy and post on TikTok, Reels or Shorts — mentioning bitcoinmentor.be."}
        </p>
      </div>

      {/* Generate button */}
      {!generated && (
        <div className="content-generate-wrap">
          <button className="content-generate-btn" onClick={generate} disabled={loading}>
            {loading
              ? (isNL ? "Marcus analyseert…" : "Marcus is analyzing…")
              : (isNL ? "✨ Genereer vandaag's script" : "✨ Generate today's script")}
          </button>
          {error && <p className="content-error">{error}</p>}
          <p className="content-generate-hint">
            {isNL ? "Gebaseerd op de live BTC-markt • Max 3× per dag" : "Based on live BTC market • Max 3× per day"}
          </p>
        </div>
      )}

      {data && (
        <>
          {/* BTC context pill */}
          {data.btcData && (
            <div className="content-btc-pill">
              <span className="content-btc-price">
                €{Math.round(data.btcData.price).toLocaleString("nl-NL")}
              </span>
              <span className={`content-btc-change ${data.btcData.change24h >= 0 ? "content-btc-up" : "content-btc-down"}`}>
                {data.btcData.change24h >= 0 ? "▲" : "▼"} {Math.abs(data.btcData.change24h).toFixed(1)}%
              </span>
              <span className="content-btc-detail">RSI {data.btcData.rsi} · {data.btcData.trend}</span>
            </div>
          )}

          {/* Script sections */}
          <div className="content-script-card">
            <div className="content-script-header">
              <span className="content-script-label">
                {isNL ? "30-seconden script" : "30-second script"}
              </span>
              <button
                className="content-copy-btn"
                onClick={() => copyText(data.script, "full")}
              >
                {copied === "full" ? (isNL ? "✓ Gekopieerd!" : "✓ Copied!") : (isNL ? "📋 Kopieer alles" : "📋 Copy all")}
              </button>
            </div>

            <div className="content-section">
              <div className="content-section-tag content-tag-hook">HOOK · 5 sec</div>
              <p className="content-section-text">{data.hook}</p>
            </div>

            <div className="content-section">
              <div className="content-section-tag content-tag-analyse">ANALYSE · 20 sec</div>
              <p className="content-section-text">{data.analyse}</p>
            </div>

            <div className="content-section">
              <div className="content-section-tag content-tag-cta">CTA · 5 sec</div>
              <p className="content-section-text">{data.cta}</p>
            </div>

            <div className="content-hashtags">
              <span className="content-hashtags-text">{data.hashtags}</span>
              <button
                className="content-copy-small"
                onClick={() => copyText(data.hashtags, "tags")}
              >
                {copied === "tags" ? "✓" : "📋"}
              </button>
            </div>
          </div>

          {/* Platform copy buttons */}
          <div className="content-platforms">
            <p className="content-platforms-label">
              {isNL ? "Kopieer voor platform:" : "Copy for platform:"}
            </p>
            <div className="content-platforms-row">
              {PLATFORMS.map(p => (
                <button
                  key={p.key}
                  className={`content-platform-btn ${copied === p.key ? "content-platform-btn--copied" : ""}`}
                  onClick={() => copyText(platformScript(p.key), p.key)}
                >
                  <span>{p.emoji}</span>
                  <span>{copied === p.key ? "✓" : p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Regenerate */}
          <div className="content-regen-row">
            <span className="content-regen-count">{data.count}/{data.maxCount} {isNL ? "scripts vandaag" : "scripts today"}</span>
            {data.count < data.maxCount && (
              <button className="content-regen-btn" onClick={generate} disabled={loading}>
                {loading ? "…" : (isNL ? "↻ Nieuw script" : "↻ New script")}
              </button>
            )}
          </div>

          {/* How to use */}
          <div className="content-howto">
            <h3 className="content-howto-title">
              {isNL ? "💡 Zo gebruik je dit" : "💡 How to use this"}
            </h3>
            <ol className="content-howto-list">
              <li>{isNL ? "Open TikTok, Reels of Shorts en start een video-opname" : "Open TikTok, Reels or Shorts and start recording"}</li>
              <li>{isNL ? "Lees het script op als je praat — HOOK trekt aandacht, ANALYSE geeft waarde" : "Read the script as you talk — HOOK grabs attention, ANALYSE gives value"}</li>
              <li>{isNL ? "Voeg de gekopieerde hashtags toe aan je caption" : "Add the copied hashtags to your caption"}</li>
              <li>{isNL ? "Vermeld bitcoinmentor.be in je bio als link" : "Put bitcoinmentor.be in your bio as a link"}</li>
            </ol>
            <p className="content-howto-note">
              {isNL
                ? "Elke post die bitcoinmentor.be vermeldt helpt de community groeien. Meer traders = meer signalen = betere analyses."
                : "Every post mentioning bitcoinmentor.be helps the community grow. More traders = more signals = better analysis."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
