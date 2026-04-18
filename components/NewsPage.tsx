"use client";

import { useEffect, useState } from "react";
import { SCAN_ASSETS } from "@/lib/assets";
import { useLanguage } from "@/contexts/LanguageContext";

type NewsItem = {
  title: string;
  link: string;
  publisher: string;
  published: number;
};

function timeAgo(ms: number, lang: string): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (lang === "en") {
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
  if (min < 60) return `${min}m geleden`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}u geleden`;
  return `${Math.floor(h / 24)}d geleden`;
}

const QUICK_ASSETS = SCAN_ASSETS.filter(a => a.type === "crypto").slice(0, 8);

export default function NewsPage() {
  const { lang } = useLanguage();
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/news?symbol=${symbol}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setNews(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [symbol]);

  const asset = SCAN_ASSETS.find(a => a.symbol === symbol);

  return (
    <div className="np-root">

      {/* ── Hero header ── */}
      <div className="np-hero">
        <div className="np-hero-orb" aria-hidden="true" />
        <div className="np-hero-inner">
          <div className="np-hero-label">{lang === "nl" ? "Live marktnieuws" : "Live market news"}</div>
          <h1 className="np-hero-h1">
            {lang === "nl" ? "Nieuws" : "News"}
            <span className="np-hero-accent"> & Marktsignalen</span>
          </h1>
          <p className="np-hero-sub">
            {lang === "nl"
              ? "Gefilterd per asset. Altijd up-to-date."
              : "Filtered by asset. Always up to date."}
          </p>
        </div>
      </div>

      {/* ── Asset filter pills ── */}
      <div className="np-filters-wrap">
        <div className="np-filters">
          {QUICK_ASSETS.map(a => (
            <button
              key={a.symbol}
              className={`np-pill${symbol === a.symbol ? " active" : ""}`}
              onClick={() => setSymbol(a.symbol)}
            >
              <span className="np-pill-emoji">{a.emoji}</span>
              <span className="np-pill-label">{a.ticker}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Feed ── */}
      <div className="np-content">
        {loading ? (
          <div className="np-skeleton-list">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="np-skeleton-item">
                <div className="np-skeleton-line short" />
                <div className="np-skeleton-line" />
                <div className="np-skeleton-line medium" />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="np-empty">
            <div className="np-empty-icon">📭</div>
            <div className="np-empty-text">
              {lang === "nl"
                ? `Geen nieuws gevonden voor ${asset?.ticker}.`
                : `No news found for ${asset?.ticker}.`}
            </div>
          </div>
        ) : (
          <div className="np-feed">
            {news.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="np-item"
              >
                <div className="np-item-num">{String(i + 1).padStart(2, "0")}</div>
                <div className="np-item-body">
                  <div className="np-item-meta">
                    <span className="np-item-publisher">{item.publisher}</span>
                    <span className="np-item-dot">·</span>
                    <span className="np-item-time">{timeAgo(item.published, lang)}</span>
                  </div>
                  <h2 className="np-item-title">{item.title}</h2>
                  <span className="np-item-cta">
                    {lang === "nl" ? "Lees artikel" : "Read article"} →
                  </span>
                </div>
                <div className="np-item-arrow">↗</div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
