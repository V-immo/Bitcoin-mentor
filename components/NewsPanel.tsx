"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type NewsItem = {
  title: string;
  link: string;
  publisher: string;
  published: number;
};

export default function NewsPanel({ asset }: { asset: string }) {
  const { t } = useLanguage();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  function timeAgo(ts: number): string {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return t("time_just_now");
    if (diff < 3600) return `${Math.floor(diff / 60)}${t("time_min_ago")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${t("time_hour_ago")}`;
    return `${Math.floor(diff / 86400)}${t("time_day_ago")}`;
  }

  async function load(sym: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/news?symbol=${encodeURIComponent(sym)}`);
      if (res.ok) setNews(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => {
    if (asset) load(asset);
  }, [asset]);

  return (
    <section className="terminal-side-card news-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="terminal-label">{t("news_label")}</div>
        <button
          className="terminal-btn terminal-btn-muted"
          onClick={() => load(asset)}
          disabled={loading}
          style={{ fontSize: 11, height: 24, padding: "0 8px" }}
        >
          {loading ? "⟳" : t("news_refresh")}
        </button>
      </div>

      {loading && news.length === 0 && (
        <div className="news-loading">{t("news_loading")}</div>
      )}

      {!loading && news.length === 0 && (
        <div className="news-empty">{t("news_empty")} {asset.replace("USDT", "")}.</div>
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
