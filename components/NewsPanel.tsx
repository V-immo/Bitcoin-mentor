"use client";

import { useEffect, useState } from "react";

type NewsItem = {
  title: string;
  link: string;
  publisher: string;
  published: number;
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "zojuist";
  if (diff < 3600) return `${Math.floor(diff / 60)}m geleden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}u geleden`;
  return `${Math.floor(diff / 86400)}d geleden`;
}

export default function NewsPanel({ asset }: { asset: string }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAsset, setLastAsset] = useState("");

  async function load(sym: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/news?symbol=${encodeURIComponent(sym)}`);
      if (res.ok) setNews(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
    setLastAsset(sym);
  }

  useEffect(() => {
    if (asset) load(asset);
  }, [asset]);

  return (
    <section className="terminal-side-card news-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="terminal-label">Nieuws</div>
        <button
          className="terminal-btn terminal-btn-muted"
          onClick={() => load(asset)}
          disabled={loading}
          style={{ fontSize: 11, height: 24, padding: "0 8px" }}
        >
          {loading ? "⟳" : "↻ Vernieuwen"}
        </button>
      </div>

      {loading && news.length === 0 && (
        <div className="news-loading">Nieuws ophalen…</div>
      )}

      {!loading && news.length === 0 && (
        <div className="news-empty">Geen nieuws gevonden voor {asset.replace("USDT", "")}.</div>
      )}

      <div className="news-list">
        {news.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="news-item"
          >
            <div className="news-title">{item.title}</div>
            <div className="news-meta">
              {item.publisher} · {timeAgo(item.published)}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
