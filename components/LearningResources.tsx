"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type VideoResource = {
  id: string;
  titleNL: string;
  titleEN: string;
  channel: string;
  duration: string;
  topic: string;
  level: number;
  tags: string[];
  views?: string;
};

type NewsSource = {
  name: string;
  url: string;
  descKey: import("@/lib/translations").TranslationKey;
  icon: string;
  category: "crypto" | "stocks" | "macro" | "education";
};

const VIDEOS: VideoResource[] = [
  // Level 1 — Absolute beginner
  {
    id: "Xn7KWR9EOGQ",
    titleNL: "RSI Indicator Uitgelegd",
    titleEN: "RSI Indicator Explained",
    channel: "Rayner Teo",
    duration: "12:23",
    topic: "RSI",
    level: 1,
    tags: ["RSI", "indicators", "beginner"],
  },
  {
    id: "KdJ0PiLkE9M",
    titleNL: "Wat is een Stop Loss? (Beginnersgids)",
    titleEN: "What is a Stop Loss? (Beginner Guide)",
    channel: "Investopedia",
    duration: "4:55",
    topic: "stop-loss",
    level: 1,
    tags: ["stop-loss", "risicobeheer", "beginner"],
  },
  {
    id: "BO3hgIScPbI",
    titleNL: "Bull vs Bear Markt Uitgelegd",
    titleEN: "Bull vs Bear Market Explained",
    channel: "Investopedia",
    duration: "3:17",
    topic: "marktstructuur",
    level: 1,
    tags: ["bull", "bear", "markt", "beginner"],
  },
  {
    id: "fAEntRLMNDs",
    titleNL: "Candlestick Grafieken voor Beginners",
    titleEN: "Candlestick Charts for Beginners",
    channel: "Rayner Teo",
    duration: "17:16",
    topic: "candlesticks",
    level: 1,
    tags: ["candlesticks", "grafieken", "beginner"],
  },
  // Level 2 — Basis trading
  {
    id: "kDrNBH2QQJM",
    titleNL: "Support & Resistance Uitgelegd",
    titleEN: "Support & Resistance Explained",
    channel: "Rayner Teo",
    duration: "19:08",
    topic: "support & resistance",
    level: 2,
    tags: ["support", "resistance", "technische analyse"],
  },
  {
    id: "1J0rBNlpBqA",
    titleNL: "Positiegrootte & Risicobeheer",
    titleEN: "Position Sizing & Risk Management",
    channel: "Rayner Teo",
    duration: "13:41",
    topic: "positiegrootte",
    level: 2,
    tags: ["positiegrootte", "risicobeheer", "R/R"],
  },
  {
    id: "zjMkFz7BKJA",
    titleNL: "Multi-Timeframe Analyse (Complete Gids)",
    titleEN: "Multiple Timeframe Analysis (Complete Guide)",
    channel: "Rayner Teo",
    duration: "18:45",
    topic: "timeframes",
    level: 2,
    tags: ["timeframes", "4H", "dagelijks"],
  },
  // Level 3 — Gevorderd
  {
    id: "wO1PEYZxqOo",
    titleNL: "Moving Average Strategieën die Werken",
    titleEN: "Moving Average Strategies That Actually Work",
    channel: "Rayner Teo",
    duration: "22:14",
    topic: "moving averages",
    level: 3,
    tags: ["MA", "moving average", "crossover"],
  },
  {
    id: "0Tq9-eq_suA",
    titleNL: "Volume Analyse — De Sleutel tot Betere Trades",
    titleEN: "Volume Analysis — The Key to Better Trades",
    channel: "SMB Capital",
    duration: "14:31",
    topic: "volume analyse",
    level: 3,
    tags: ["volume", "analyse", "gevorderd"],
  },
  {
    id: "CaVMNWlBhxU",
    titleNL: "Trading Psychologie: FOMO Overwinnen",
    titleEN: "Trading Psychology: How to Overcome FOMO",
    channel: "Rayner Teo",
    duration: "11:48",
    topic: "psychologie",
    level: 3,
    tags: ["psychologie", "FOMO", "emoties"],
  },
  // Level 4-5 — Expert
  {
    id: "zWKIkBlFpKQ",
    titleNL: "Bitcoin Halving Uitgelegd (En Waarom Het Belangrijk Is)",
    titleEN: "Bitcoin Halving Explained (And Why It Matters)",
    channel: "Coin Bureau",
    duration: "16:55",
    topic: "halving cyclus",
    level: 4,
    tags: ["halving", "cyclus", "Bitcoin", "macro"],
  },
  {
    id: "h-Nz3_k6jyI",
    titleNL: "Crypto Funding Rates Uitgelegd",
    titleEN: "Crypto Funding Rates Explained",
    channel: "Coin Bureau",
    duration: "10:43",
    topic: "funding rates",
    level: 5,
    tags: ["funding rates", "futures", "gevorderd"],
  },
  {
    id: "74M9VoXzBf4",
    titleNL: "Smart Money Concepten (SMC) Volledige Uitleg",
    titleEN: "Smart Money Concepts (SMC) Full Explanation",
    channel: "Inner Circle Trader",
    duration: "25:12",
    topic: "smart money",
    level: 4,
    tags: ["smart money", "institutioneel", "gevorderd"],
  },
];

const TRENDING_VIDEOS: VideoResource[] = [
  {
    id: "dFGZzMHJgSI",
    titleNL: "Price Action Trading: Grafieken Lezen als een Pro",
    titleEN: "Price Action Trading: How to Read Charts Like a Pro",
    channel: "Rayner Teo",
    duration: "20:14",
    topic: "price action",
    level: 2,
    tags: ["price action", "grafieken", "setup"],
    views: "4.1M",
  },
  {
    id: "WCwMT6H1KRY",
    titleNL: "Hoe Breakouts Te Traden (Complete Gids)",
    titleEN: "How to Trade Breakouts (Complete Guide)",
    channel: "Rayner Teo",
    duration: "19:22",
    topic: "breakouts",
    level: 2,
    tags: ["breakout", "strategie", "entry"],
    views: "3.2M",
  },
  {
    id: "GmOzih6I1zs",
    titleNL: "Technische Analyse Masterclass — Bitcoin",
    titleEN: "Technical Analysis Masterclass — Bitcoin",
    channel: "Coin Bureau",
    duration: "21:38",
    topic: "Bitcoin analyse",
    level: 3,
    tags: ["Bitcoin", "technische analyse", "BTC"],
    views: "2.7M",
  },
  {
    id: "1J0rBNlkBqA",
    titleNL: "Risicobeheer: De #1 Reden Waarom Traders Falen",
    titleEN: "Risk Management: The #1 Reason Traders Fail",
    channel: "Rayner Teo",
    duration: "14:28",
    topic: "risicobeheer",
    level: 1,
    tags: ["risico", "positiegrootte", "stops"],
    views: "2.4M",
  },
  {
    id: "vcMNpksnGSI",
    titleNL: "Crypto Trading voor Absolute Beginners",
    titleEN: "Crypto Trading for Absolute Beginners",
    channel: "Andrei Jikh",
    duration: "17:05",
    topic: "crypto basics",
    level: 1,
    tags: ["crypto", "beginner", "basis"],
    views: "2.1M",
  },
  {
    id: "7s5ILbr3HNg",
    titleNL: "Moving Averages: Simpele Maar Krachtige Strategie",
    titleEN: "Moving Averages: Simple But Powerful Strategy",
    channel: "Trading Rush",
    duration: "13:47",
    topic: "moving averages",
    level: 2,
    tags: ["MA", "strategie", "trend"],
    views: "1.8M",
  },
];

const NEWS_SOURCES: NewsSource[] = [
  { name: "CoinDesk",          url: "https://www.coindesk.com",           descKey: "news_desc_coindesk",      icon: "📰", category: "crypto" },
  { name: "The Block",         url: "https://www.theblock.co",            descKey: "news_desc_theblock",      icon: "🔗", category: "crypto" },
  { name: "Cointelegraph",     url: "https://cointelegraph.com",          descKey: "news_desc_cointelegraph", icon: "📡", category: "crypto" },
  { name: "TradingView Ideas", url: "https://www.tradingview.com/ideas/", descKey: "news_desc_tradingview",   icon: "📊", category: "education" },
  { name: "Investopedia",      url: "https://www.investopedia.com",       descKey: "news_desc_investopedia",  icon: "📚", category: "education" },
  { name: "Bloomberg Crypto",  url: "https://www.bloomberg.com/crypto",   descKey: "news_desc_bloomberg",     icon: "🏦", category: "macro" },
  { name: "Glassnode Insights",url: "https://insights.glassnode.com",     descKey: "news_desc_glassnode",     icon: "🔭", category: "crypto" },
  { name: "MacroAxis",         url: "https://www.macroaxis.com",          descKey: "news_desc_macroaxis",     icon: "🌍", category: "macro" },
];

const CATEGORY_COLORS: Record<string, string> = {
  crypto: "#f59e0b",
  stocks: "#22c55e",
  macro: "#60a5fa",
  education: "#a78bfa",
};

function VideoCard({ v, watchYoutubeLabel, lang }: {
  v: VideoResource;
  watchYoutubeLabel: string;
  lang: string;
}) {
  const ytUrl = `https://www.youtube.com/watch?v=${v.id}`;
  const title = lang === "en" ? v.titleEN : v.titleNL;

  return (
    <a
      href={ytUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="resources-video-card resources-video-link"
    >
      <div className="resources-thumbnail">
        <img
          src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
          alt={title}
          className="resources-thumb-img"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="resources-play-btn">▶</div>
        <div className="resources-duration">{v.duration}</div>
        {v.views && <div className="resources-views">{v.views}</div>}
      </div>
      <div className="resources-video-info">
        <div className="resources-video-title">{title}</div>
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
        <div className="resources-yt-open-btn">
          ▶ {watchYoutubeLabel}
        </div>
      </div>
    </a>
  );
}

export default function LearningResources() {
  const { t, lang } = useLanguage();
  const [activeLevel, setActiveLevel] = useState<number | null>(null);

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
              lang={lang}
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
              lang={lang}
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
