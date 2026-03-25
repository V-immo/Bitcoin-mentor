"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type VideoResource = {
  id: string;       // YouTube video ID
  title: string;
  channel: string;
  duration: string;
  topic: string;
  level: number;    // 1-5
  tags: string[];
  views?: string;   // e.g. "2.3M views"
};

type NewsSource = {
  name: string;
  url: string;
  descKey: import("@/lib/translations").TranslationKey;
  icon: string;
  category: "crypto" | "stocks" | "macro" | "education";
};

const VIDEOS: VideoResource[] = [
  // Level 1 — Basics
  {
    id: "Xn7KWR9EOGQ",
    title: "RSI Indicator Explained",
    channel: "Rayner Teo",
    duration: "12:23",
    topic: "RSI",
    level: 1,
    tags: ["RSI", "indicators", "beginner"],
  },
  {
    id: "KdJ0PiLkE9M",
    title: "What is a Stop Loss? (Beginner Guide)",
    channel: "Investopedia",
    duration: "4:55",
    topic: "risk management",
    level: 1,
    tags: ["stop-loss", "risk management", "beginner"],
  },
  {
    id: "BO3hgIScPbI",
    title: "Bull vs Bear Market Explained",
    channel: "Investopedia",
    duration: "3:17",
    topic: "market structure",
    level: 1,
    tags: ["bull", "bear", "market", "beginner"],
  },
  {
    id: "fAEntRLMNDs",
    title: "Candlestick Charts for Beginners",
    channel: "Rayner Teo",
    duration: "17:16",
    topic: "candlesticks",
    level: 1,
    tags: ["candlesticks", "charts", "beginner"],
  },
  // Level 2 — Intermediate
  {
    id: "kDrNBH2QQJM",
    title: "Support & Resistance Explained",
    channel: "Rayner Teo",
    duration: "19:08",
    topic: "support & resistance",
    level: 2,
    tags: ["support", "resistance", "technical analysis"],
  },
  {
    id: "1J0rBNlpBqA",
    title: "Position Sizing & Risk Management",
    channel: "Rayner Teo",
    duration: "13:41",
    topic: "position sizing",
    level: 2,
    tags: ["position sizing", "risk management", "R/R"],
  },
  {
    id: "zjMkFz7BKJA",
    title: "Multiple Timeframe Analysis (Complete Guide)",
    channel: "Rayner Teo",
    duration: "18:45",
    topic: "timeframes",
    level: 2,
    tags: ["timeframes", "4H", "daily", "multi-timeframe"],
  },
  // Level 3 — Advanced
  {
    id: "wO1PEYZxqOo",
    title: "Moving Average Strategies That Actually Work",
    channel: "Rayner Teo",
    duration: "22:14",
    topic: "moving averages",
    level: 3,
    tags: ["MA", "moving average", "crossover", "strategy"],
  },
  {
    id: "0Tq9-eq_suA",
    title: "Volume Analysis — The Key to Better Trades",
    channel: "SMB Capital",
    duration: "14:31",
    topic: "volume analysis",
    level: 3,
    tags: ["volume", "analysis", "advanced"],
  },
  {
    id: "CaVMNWlBhxU",
    title: "Trading Psychology: How to Overcome FOMO",
    channel: "Rayner Teo",
    duration: "11:48",
    topic: "psychology",
    level: 3,
    tags: ["psychology", "FOMO", "emotions"],
  },
  // Level 4-5 — Expert
  {
    id: "zWKIkBlFpKQ",
    title: "Bitcoin Halving Explained (And Why It Matters)",
    channel: "Coin Bureau",
    duration: "16:55",
    topic: "halving cycle",
    level: 4,
    tags: ["halving", "cycle", "Bitcoin", "macro"],
  },
  {
    id: "h-Nz3_k6jyI",
    title: "Crypto Funding Rates Explained",
    channel: "Coin Bureau",
    duration: "10:43",
    topic: "funding rates",
    level: 5,
    tags: ["funding rates", "futures", "advanced"],
  },
  {
    id: "74M9VoXzBf4",
    title: "Smart Money Concepts (SMC) Full Explanation",
    channel: "Inner Circle Trader",
    duration: "25:12",
    topic: "smart money",
    level: 4,
    tags: ["smart money", "institutional", "advanced"],
  },
];

const TRENDING_VIDEOS: VideoResource[] = [
  {
    id: "dFGZzMHJgSI",
    title: "Price Action Trading: How to Read Charts Like a Pro",
    channel: "Rayner Teo",
    duration: "20:14",
    topic: "price action",
    level: 2,
    tags: ["price action", "charts", "setup"],
    views: "4.1M views",
  },
  {
    id: "WCwMT6H1KRY",
    title: "How to Trade Breakouts (Complete Guide)",
    channel: "Rayner Teo",
    duration: "19:22",
    topic: "breakouts",
    level: 2,
    tags: ["breakout", "strategy", "entry"],
    views: "3.2M views",
  },
  {
    id: "GmOzih6I1zs",
    title: "Technical Analysis Masterclass — Bitcoin",
    channel: "Coin Bureau",
    duration: "21:38",
    topic: "Bitcoin analysis",
    level: 3,
    tags: ["Bitcoin", "technical analysis", "BTC"],
    views: "2.7M views",
  },
  {
    id: "1J0rBNlkBqA",
    title: "Risk Management: The #1 Reason Traders Fail",
    channel: "Rayner Teo",
    duration: "14:28",
    topic: "risk management",
    level: 1,
    tags: ["risk", "position sizing", "stops"],
    views: "2.4M views",
  },
  {
    id: "vcMNpksnGSI",
    title: "Crypto Trading for Absolute Beginners",
    channel: "Andrei Jikh",
    duration: "17:05",
    topic: "crypto basics",
    level: 1,
    tags: ["crypto", "beginner", "basics"],
    views: "2.1M views",
  },
  {
    id: "7s5ILbr3HNg",
    title: "Moving Averages: Simple But Powerful Strategy",
    channel: "Trading Rush",
    duration: "13:47",
    topic: "moving averages",
    level: 2,
    tags: ["MA", "strategy", "trend"],
    views: "1.8M views",
  },
];

const NEWS_SOURCES: NewsSource[] = [
  { name: "CoinDesk",         url: "https://www.coindesk.com",            descKey: "news_desc_coindesk",     icon: "📰", category: "crypto" },
  { name: "The Block",        url: "https://www.theblock.co",             descKey: "news_desc_theblock",     icon: "🔗", category: "crypto" },
  { name: "Cointelegraph",    url: "https://cointelegraph.com",           descKey: "news_desc_cointelegraph",icon: "📡", category: "crypto" },
  { name: "TradingView Ideas",url: "https://www.tradingview.com/ideas/",  descKey: "news_desc_tradingview",  icon: "📊", category: "education" },
  { name: "Investopedia",     url: "https://www.investopedia.com",        descKey: "news_desc_investopedia", icon: "📚", category: "education" },
  { name: "Bloomberg Crypto", url: "https://www.bloomberg.com/crypto",    descKey: "news_desc_bloomberg",    icon: "🏦", category: "macro" },
  { name: "Glassnode Insights",url: "https://insights.glassnode.com",     descKey: "news_desc_glassnode",    icon: "🔭", category: "crypto" },
  { name: "MacroAxis",        url: "https://www.macroaxis.com",           descKey: "news_desc_macroaxis",    icon: "🌍", category: "macro" },
];

const CATEGORY_COLORS: Record<string, string> = {
  crypto: "#f59e0b",
  stocks: "#22c55e",
  macro: "#60a5fa",
  education: "#a78bfa",
};

function VideoCard({ v, playing, onPlay, watchYoutubeLabel, notWorkingLabel }: {
  v: VideoResource;
  playing: boolean;
  onPlay: () => void;
  watchYoutubeLabel: string;
  notWorkingLabel: string;
}) {
  const [embedFailed, setEmbedFailed] = useState(false);
  const failTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ytUrl = `https://www.youtube.com/watch?v=${v.id}`;

  // Auto-detect geblokkeerde embed via YouTube postMessage
  // Als na 5s geen bericht van YouTube iframe, dan is de embed geblokkeerd
  useEffect(() => {
    if (!playing) { setEmbedFailed(false); return; }
    failTimerRef.current = setTimeout(() => setEmbedFailed(true), 5000);

    function handleMessage(e: MessageEvent) {
      if (typeof e.origin === "string" && e.origin.includes("youtube")) {
        if (failTimerRef.current) clearTimeout(failTimerRef.current);
        setEmbedFailed(false);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (failTimerRef.current) clearTimeout(failTimerRef.current);
    };
  }, [playing]);

  return (
    <div className="resources-video-card">
      {playing ? (
        embedFailed ? (
          // Embed geblokkeerd — grote YouTube knop
          <div className="resources-embed-blocked">
            <div className="resources-blocked-icon">▶</div>
            <div className="resources-blocked-msg">{notWorkingLabel}</div>
            <a
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="resources-yt-big-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#e91e63",
                color: "#fff",
                fontSize: "15px",
                fontWeight: 600,
                padding: "10px 24px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              ▶ {watchYoutubeLabel}
            </a>
          </div>
        ) : (
          <div className="resources-embed-wrap">
            <iframe
              className="resources-embed"
              src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&enablejsapi=1`}
              title={v.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )
      ) : (
        <div className="resources-thumbnail" onClick={onPlay} style={{ cursor: "pointer" }}>
          <img
            src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
            alt={v.title}
            className="resources-thumb-img"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="resources-play-btn" aria-label={`Play ${v.title}`}>▶</div>
          <div className="resources-duration">{v.duration}</div>
          {v.views && <div className="resources-views">{v.views}</div>}
          <a
            href={ytUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="resources-yt-direct"
            onClick={(e) => e.stopPropagation()}
          >
            YouTube ↗
          </a>
        </div>
      )}
      <div className="resources-video-info">
        <div className="resources-video-title">{v.title}</div>
        <div className="resources-video-meta">
          <span className="resources-video-channel">{v.channel}</span>
          <span
            className="resources-video-level"
            style={{ background: `rgba(139,92,246,${0.1 + v.level * 0.06})` }}
          >
            Level {v.level}
          </span>
        </div>
        <div className="resources-video-tags">
          {v.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="resources-tag">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LearningResources() {
  const { t } = useLanguage();
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const filteredVideos = activeLevel
    ? VIDEOS.filter((v) => v.level === activeLevel)
    : VIDEOS;

  const CATEGORY_LABELS: Record<string, string> = {
    crypto: t("resources_cat_crypto"),
    stocks: t("resources_cat_stocks"),
    macro: t("resources_cat_macro"),
    education: t("resources_cat_education"),
  };

  return (
    <div className="resources-wrap">

      {/* Trending section */}
      <div className="resources-section">
        <div className="resources-section-title">
          <span>🔥</span> {t("resources_trending_title")}
        </div>
        <div className="resources-videos-grid">
          {TRENDING_VIDEOS.map((v) => (
            <VideoCard
              key={v.id}
              v={v}
              playing={playingId === v.id}
              onPlay={() => setPlayingId(v.id)}
              notWorkingLabel={t("resources_video_not_working")}
              watchYoutubeLabel={t("resources_watch_youtube")}
            />
          ))}
        </div>
      </div>

      {/* Level-based videos section */}
      <div className="resources-section">
        <div className="resources-section-header">
          <div className="resources-section-title">
            <span>▶</span> {t("resources_videos_title")}
          </div>
          <div className="resources-level-filter">
            <button
              className={`resources-level-btn ${activeLevel === null ? "active" : ""}`}
              onClick={() => setActiveLevel(null)}
            >
              {t("resources_filter_all")}
            </button>
            {[1, 2, 3, 4, 5].map((l) => (
              <button
                key={l}
                className={`resources-level-btn ${activeLevel === l ? "active" : ""}`}
                onClick={() => setActiveLevel(l === activeLevel ? null : l)}
              >
                {t("resources_filter_lvl")} {l}
              </button>
            ))}
          </div>
        </div>

        <div className="resources-videos-grid">
          {filteredVideos.map((v) => (
            <VideoCard
              key={v.id}
              v={v}
              playing={playingId === v.id}
              onPlay={() => setPlayingId(v.id)}
              notWorkingLabel={t("resources_video_not_working")}
              watchYoutubeLabel={t("resources_watch_youtube")}
            />
          ))}
        </div>
      </div>

      {/* News sources section */}
      <div className="resources-section">
        <div className="resources-section-title">
          <span>🌐</span> {t("resources_news_title")}
        </div>
        <div className="resources-news-grid">
          {NEWS_SOURCES.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="resources-news-card"
            >
              <div className="resources-news-top">
                <span className="resources-news-icon">{s.icon}</span>
                <div>
                  <div className="resources-news-name">{s.name}</div>
                  <span
                    className="resources-news-cat"
                    style={{ color: CATEGORY_COLORS[s.category] }}
                  >
                    {CATEGORY_LABELS[s.category]}
                  </span>
                </div>
              </div>
              <div className="resources-news-desc">{t(s.descKey)}</div>
              <div className="resources-news-arrow">→</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
