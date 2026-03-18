"use client";

import { useState } from "react";

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
  description: string;
  icon: string;
  category: "crypto" | "stocks" | "macro" | "education";
};

const VIDEOS: VideoResource[] = [
  // Level 1 — Basics
  {
    id: "EADr1xNnI60",
    title: "RSI uitgelegd in 3 minuten",
    channel: "TradingView",
    duration: "3:12",
    topic: "RSI",
    level: 1,
    tags: ["RSI", "indicatoren", "beginner"],
  },
  {
    id: "eynxyoKgpng",
    title: "Wat is een Stop-Loss? (Beginner gids)",
    channel: "Crypto Academy",
    duration: "5:44",
    topic: "risk management",
    level: 1,
    tags: ["stop-loss", "risk management", "beginner"],
  },
  {
    id: "GRqkfTZNAko",
    title: "Bull vs Bear markt: alles wat je moet weten",
    channel: "Investopedia",
    duration: "4:20",
    topic: "marktstructuur",
    level: 1,
    tags: ["bull", "bear", "markt", "beginner"],
  },
  {
    id: "bIWn5zNhL-A",
    title: "Candlestick charts voor beginners",
    channel: "TradingView",
    duration: "6:02",
    topic: "candlesticks",
    level: 1,
    tags: ["candlesticks", "charts", "beginner"],
  },
  // Level 2 — Intermediate
  {
    id: "9f2MoRgE0-E",
    title: "Support & Resistance: Hoe werkt het?",
    channel: "Rayner Teo",
    duration: "14:53",
    topic: "support & resistance",
    level: 2,
    tags: ["support", "resistance", "technische analyse"],
  },
  {
    id: "EFmH9QV_tFM",
    title: "Positiegrootte berekenen (Risk Management)",
    channel: "Investopedia",
    duration: "7:28",
    topic: "positiegrootte",
    level: 2,
    tags: ["positiegrootte", "risk management", "R/R"],
  },
  {
    id: "Wx5Q1O_7P2E",
    title: "Timeframes: Welke gebruik je wanneer?",
    channel: "Rayner Teo",
    duration: "11:17",
    topic: "timeframes",
    level: 2,
    tags: ["timeframes", "4H", "daily", "multi-timeframe"],
  },
  // Level 3 — Advanced
  {
    id: "tqV5ypnhSR8",
    title: "Moving Average Crossovers (MA strategie)",
    channel: "TradingView",
    duration: "9:35",
    topic: "MA crossovers",
    level: 3,
    tags: ["MA", "moving average", "crossover", "strategie"],
  },
  {
    id: "LlXLNUTCZVM",
    title: "Volume analyse: De sleutel tot betere trades",
    channel: "SMB Capital",
    duration: "16:42",
    topic: "volume analyse",
    level: 3,
    tags: ["volume", "analyse", "gevorderd"],
  },
  {
    id: "9ZYrGE3Vmhk",
    title: "Trading psychologie: FOMO overwinnen",
    channel: "Investopedia",
    duration: "8:14",
    topic: "psychologie",
    level: 3,
    tags: ["psychologie", "FOMO", "emoties"],
  },
  // Level 4-5 — Expert
  {
    id: "r2r2GGvbKZc",
    title: "Bitcoin Halving cyclus uitgelegd",
    channel: "Coin Bureau",
    duration: "18:30",
    topic: "halving cyclus",
    level: 4,
    tags: ["halving", "cyclus", "Bitcoin", "macro"],
  },
  {
    id: "1Qaz9L4vAhM",
    title: "Funding Rates: Wat zijn ze en hoe gebruik je ze?",
    channel: "Crypto Banter",
    duration: "12:05",
    topic: "funding rates",
    level: 5,
    tags: ["funding rates", "futures", "geavanceerd"],
  },
  {
    id: "E3BKFGT2Znc",
    title: "Institutioneel gedrag: Hoe slimme partijen traden",
    channel: "SMB Capital",
    duration: "22:18",
    topic: "institutioneel gedrag",
    level: 4,
    tags: ["institutioneel", "smart money", "geavanceerd"],
  },
];

const TRENDING_VIDEOS: VideoResource[] = [
  {
    id: "dFGZzMHJgSI",
    title: "Price Action Trading: Zo lees je charts als een pro",
    channel: "Rayner Teo",
    duration: "20:14",
    topic: "price action",
    level: 2,
    tags: ["price action", "charts", "setup"],
    views: "4.1M views",
  },
  {
    id: "X7PVXpFkGE4",
    title: "How to Trade Breakouts (Most Watched Method)",
    channel: "Rayner Teo",
    duration: "17:33",
    topic: "breakouts",
    level: 2,
    tags: ["breakout", "strategie", "entry"],
    views: "3.8M views",
  },
  {
    id: "LzIRbIT7I4I",
    title: "Bitcoin Technische Analyse — Meest bekeken video",
    channel: "Coin Bureau",
    duration: "24:51",
    topic: "Bitcoin analyse",
    level: 3,
    tags: ["Bitcoin", "technische analyse", "BTC"],
    views: "2.9M views",
  },
  {
    id: "eynxyoKgpng",
    title: "Risk Management: De #1 reden waarom traders falen",
    channel: "Investopedia",
    duration: "11:02",
    topic: "risk management",
    level: 1,
    tags: ["risk", "positiegrootte", "stops"],
    views: "2.4M views",
  },
  {
    id: "4HzBiMpCVFg",
    title: "Crypto Trading voor absolute beginners (2024)",
    channel: "Andrei Jikh",
    duration: "18:29",
    topic: "crypto basics",
    level: 1,
    tags: ["crypto", "beginner", "basics"],
    views: "2.1M views",
  },
  {
    id: "7s5ILbr3HNg",
    title: "Moving Averages: Simpele maar krachtige strategie",
    channel: "Trading Rush",
    duration: "13:47",
    topic: "moving averages",
    level: 2,
    tags: ["MA", "strategie", "trend"],
    views: "1.8M views",
  },
];

const NEWS_SOURCES: NewsSource[] = [
  {
    name: "CoinDesk",
    url: "https://www.coindesk.com",
    description: "Toonaangevend crypto nieuws, analyses en marktdata",
    icon: "📰",
    category: "crypto",
  },
  {
    name: "The Block",
    url: "https://www.theblock.co",
    description: "Diepgaand crypto onderzoek en nieuws voor gevorderden",
    icon: "🔗",
    category: "crypto",
  },
  {
    name: "Cointelegraph",
    url: "https://cointelegraph.com",
    description: "Dagelijks crypto nieuws, prijsanalyses en features",
    icon: "📡",
    category: "crypto",
  },
  {
    name: "TradingView Ideas",
    url: "https://www.tradingview.com/ideas/",
    description: "Chart analyses van duizenden traders wereldwijd",
    icon: "📊",
    category: "education",
  },
  {
    name: "Investopedia",
    url: "https://www.investopedia.com",
    description: "Educatief platform: definitie van elk trading begrip",
    icon: "📚",
    category: "education",
  },
  {
    name: "Bloomberg Crypto",
    url: "https://www.bloomberg.com/crypto",
    description: "Professioneel financieel nieuws voor crypto & markten",
    icon: "🏦",
    category: "macro",
  },
  {
    name: "Glassnode Insights",
    url: "https://insights.glassnode.com",
    description: "On-chain data analyses — Bitcoin network metrics",
    icon: "🔭",
    category: "crypto",
  },
  {
    name: "MacroAxis",
    url: "https://www.macroaxis.com",
    description: "Macro-economische data en correlaties met crypto",
    icon: "🌍",
    category: "macro",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  crypto: "Crypto",
  stocks: "Aandelen",
  macro: "Macro",
  education: "Educatie",
};

const CATEGORY_COLORS: Record<string, string> = {
  crypto: "#f59e0b",
  stocks: "#22c55e",
  macro: "#60a5fa",
  education: "#a78bfa",
};

function VideoCard({ v, playing, onPlay }: { v: VideoResource; playing: boolean; onPlay: () => void }) {
  return (
    <div className="resources-video-card">
      {playing ? (
        <div className="resources-embed-wrap">
          <iframe
            className="resources-embed"
            src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`}
            title={v.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div
          className="resources-thumbnail"
          onClick={onPlay}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onPlay()}
        >
          <img
            src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
            alt={v.title}
            className="resources-thumb-img"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${v.id}/default.jpg`; }}
          />
          <div className="resources-play-btn">▶</div>
          <div className="resources-duration">{v.duration}</div>
          {v.views && <div className="resources-views">{v.views}</div>}
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
          {v.tags.slice(0, 3).map((t) => (
            <span key={t} className="resources-tag">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LearningResources() {
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const filteredVideos = activeLevel
    ? VIDEOS.filter((v) => v.level === activeLevel)
    : VIDEOS;

  return (
    <div className="resources-wrap">

      {/* Trending section */}
      <div className="resources-section">
        <div className="resources-section-title">
          <span>🔥</span> Trending — Meest bekeken
        </div>
        <div className="resources-videos-grid">
          {TRENDING_VIDEOS.map((v) => (
            <VideoCard
              key={v.id}
              v={v}
              playing={playingId === v.id}
              onPlay={() => setPlayingId(v.id)}
            />
          ))}
        </div>
      </div>

      {/* Level-based videos section */}
      <div className="resources-section">
        <div className="resources-section-header">
          <div className="resources-section-title">
            <span>▶</span> Leervideo&apos;s per niveau
          </div>
          <div className="resources-level-filter">
            <button
              className={`resources-level-btn ${activeLevel === null ? "active" : ""}`}
              onClick={() => setActiveLevel(null)}
            >
              Alle
            </button>
            {[1, 2, 3, 4, 5].map((l) => (
              <button
                key={l}
                className={`resources-level-btn ${activeLevel === l ? "active" : ""}`}
                onClick={() => setActiveLevel(l === activeLevel ? null : l)}
              >
                Lvl {l}
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
            />
          ))}
        </div>
      </div>

      {/* News sources section */}
      <div className="resources-section">
        <div className="resources-section-title">
          <span>🌐</span> Volg deze bronnen
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
              <div className="resources-news-desc">{s.description}</div>
              <div className="resources-news-arrow">→</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
