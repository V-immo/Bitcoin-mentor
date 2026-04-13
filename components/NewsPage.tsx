"use client";

import { useEffect, useState } from "react";
import { SCAN_ASSETS } from "@/lib/assets";

type NewsItem = {
  title: string;
  link: string;
  publisher: string;
  published: number;
};

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m geleden`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}u geleden`;
  return `${Math.floor(h / 24)}d geleden`;
}

const QUICK_ASSETS = SCAN_ASSETS.filter(a => a.type === "crypto").slice(0, 8);

export default function NewsPage() {
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
    <div className="news-page">
      <div className="news-header">
        <div>
          <h1 className="news-page-title">📰 Nieuws</h1>
          <p className="news-subtitle">Laatste crypto- en marktnieuws, gefilterd per asset</p>
        </div>
      </div>

      {/* Asset filter */}
      <div className="news-filters">
        {QUICK_ASSETS.map(a => (
          <button
            key={a.symbol}
            className={`news-filter-btn${symbol === a.symbol ? " active" : ""}`}
            onClick={() => setSymbol(a.symbol)}
          >
            {a.emoji} {a.ticker}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="news-loading">
          <div className="news-loading-text">Nieuws laden voor {asset?.ticker}…</div>
        </div>
      ) : news.length === 0 ? (
        <div className="news-empty">Geen nieuwsberichten gevonden voor {asset?.ticker}.</div>
      ) : (
        <div className="news-feed">
          {news.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="news-item"
            >
              <div className="news-item-header">
                <span className="news-publisher">{item.publisher}</span>
                <span className="news-time">{timeAgo(item.published)}</span>
              </div>
              <h2 className="news-item-title">{item.title}</h2>
              <span className="news-read-more">Lees verder →</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
