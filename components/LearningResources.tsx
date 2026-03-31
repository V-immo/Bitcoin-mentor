"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import ResourceQuiz from "@/components/ResourceQuiz";

type VideoResource = {
  id: string;
  titleNL: string;
  titleEN: string;
  channel: string;
  duration: string;
  topic: string;
  level: number;
  tags: string[];
};

type NewsSource = {
  name: string;
  url: string;
  descKey: import("@/lib/translations").TranslationKey;
  icon: string;
  category: "crypto" | "stocks" | "macro" | "education";
};

// Alle IDs gecontroleerd via YouTube oEmbed API — alleen werkende videos
const VIDEOS: VideoResource[] = [
  {
    id: "Um63OQz3bjo",
    titleNL: "Wat is Bitcoin? (Klassieke uitleg)",
    titleEN: "What is Bitcoin? (Classic Explanation)",
    channel: "WeUseCoins",
    duration: "2:23",
    topic: "Bitcoin basis",
    level: 1,
    tags: ["Bitcoin", "beginner", "basis"],
  },
  {
    id: "rYQgy8QDEBI",
    titleNL: "Hoe Cryptocurrency ECHT werkt",
    titleEN: "How Cryptocurrency ACTUALLY Works",
    channel: "Mrwhosetheboss",
    duration: "13:12",
    topic: "crypto basics",
    level: 1,
    tags: ["crypto", "blockchain", "beginner"],
  },
  {
    id: "SSo_EIwHSd4",
    titleNL: "Hoe werkt een blockchain? (Simpel uitgelegd)",
    titleEN: "How Does a Blockchain Work? (Simply Explained)",
    channel: "Simply Explained",
    duration: "6:00",
    topic: "blockchain",
    level: 1,
    tags: ["blockchain", "beginner", "uitleg"],
  },
  {
    id: "hYip_Vuv8J0",
    titleNL: "Blockchain Expert legt uit op 5 niveaus",
    titleEN: "Blockchain Expert Explains in 5 Levels",
    channel: "WIRED",
    duration: "18:30",
    topic: "blockchain niveaus",
    level: 1,
    tags: ["blockchain", "beginner", "expert"],
  },
  {
    id: "bBC-nXj3Ng4",
    titleNL: "Maar hoe werkt Bitcoin eigenlijk?",
    titleEN: "But How Does Bitcoin Actually Work?",
    channel: "3Blue1Brown",
    duration: "26:21",
    topic: "Bitcoin technisch",
    level: 2,
    tags: ["Bitcoin", "technisch", "cryptografie"],
  },
  {
    id: "LYi8LCOda1Y",
    titleNL: "Beleggen 101 in 60 seconden",
    titleEN: "Investing 101 in 60 Seconds",
    channel: "Trading 212",
    duration: "0:60",
    topic: "beleggen basis",
    level: 1,
    tags: ["beleggen", "beginner", "snel"],
  },
  {
    id: "_v3MdC0M6N8",
    titleNL: "De 'Koop de dip' val",
    titleEN: "The 'Buy the Dip' Trap",
    channel: "Trading 212",
    duration: "3:00",
    topic: "trading psychologie",
    level: 2,
    tags: ["psychologie", "FOMO", "dip"],
  },
  {
    id: "Yb6825iv0Vk",
    titleNL: "Hoe investeren in crypto — volledige beginnersgids",
    titleEN: "How To Invest In Crypto — Full Beginners Guide",
    channel: "Brian Jung",
    duration: "25:00",
    topic: "crypto investeren",
    level: 2,
    tags: ["crypto", "investeren", "gids"],
  },
  {
    id: "eynxyoKgpng",
    titleNL: "De enige technische analyse video die je ooit nodig hebt",
    titleEN: "The Only Technical Analysis Video You Will Ever Need",
    channel: "The Trading Channel",
    duration: "3:00:00",
    topic: "technische analyse",
    level: 3,
    tags: ["TA", "technisch", "complete cursus"],
  },
  {
    id: "tPQs6eQ4zIU",
    titleNL: "Stock to Flow — Bitcoin prijs model uitgelegd",
    titleEN: "Stock to Flow — Bitcoin Price Model Explained",
    channel: "Whiteboard Crypto",
    duration: "12:00",
    topic: "Bitcoin waardering",
    level: 4,
    tags: ["S2F", "Bitcoin", "macro"],
  },
  {
    id: "vi4cPN_4VPc",
    titleNL: "BIP39 uitgelegd — seed phrases en private keys",
    titleEN: "BIP39 Explained — Seed Phrases and Private Keys",
    channel: "Whiteboard Crypto",
    duration: "14:00",
    topic: "wallet beveiliging",
    level: 2,
    tags: ["wallet", "seed phrase", "beveiliging"],
  },
  {
    id: "PHe0bXAIuk0",
    titleNL: "Hoe de economische machine werkt — Ray Dalio",
    titleEN: "How The Economic Machine Works — Ray Dalio",
    channel: "Principles by Ray Dalio",
    duration: "31:00",
    topic: "macro economie",
    level: 4,
    tags: ["macro", "economie", "Dalio"],
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
  crypto:    "#f59e0b",
  stocks:    "#22c55e",
  macro:     "#60a5fa",
  education: "#a78bfa",
};

const LEVEL_COLORS: Record<number, string> = {
  1: "#22c55e",
  2: "#3b82f6",
  3: "#f59e0b",
  4: "#f97316",
  5: "#ef4444",
};

function VideoCard({ v, watchLabel, testLabel, lang, onQuiz }: {
  v: VideoResource;
  watchLabel: string;
  testLabel: string;
  lang: string;
  onQuiz: (topic: string, level: number) => void;
}) {
  const ytUrl = `https://www.youtube.com/watch?v=${v.id}`;
  const title = lang === "en" ? v.titleEN : v.titleNL;

  return (
    <div className="resources-video-card">
      <a href={ytUrl} target="_blank" rel="noopener noreferrer" className="resources-video-link resources-thumbnail">
        <img
          src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
          alt={title}
          className="resources-thumb-img"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="resources-play-btn">▶</div>
        <div className="resources-duration">{v.duration}</div>
        <div
          className="resources-level-badge-thumb"
          style={{ background: LEVEL_COLORS[v.level] }}
        >
          L{v.level}
        </div>
      </a>
      <div className="resources-video-info">
        <div className="resources-video-title">{title}</div>
        <div className="resources-video-meta">
          <span className="resources-video-channel">{v.channel}</span>
        </div>
        <div className="resources-video-tags">
          {v.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="resources-tag">{tag}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <a
            href={ytUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="resources-yt-open-btn"
            style={{ flex: 1 }}
          >
            ▶ {watchLabel}
          </a>
          <button
            onClick={() => onQuiz(v.topic, v.level)}
            className="resources-quiz-btn"
          >
            🎓 {testLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LearningResources() {
  const { t, lang } = useLanguage();
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [quizTopic, setQuizTopic] = useState<string | null>(null);
  const [quizLevel, setQuizLevel] = useState<number>(1);

  function openQuiz(topic: string, level: number) {
    setQuizTopic(topic);
    setQuizLevel(level);
  }

  const filteredVideos = activeLevel
    ? VIDEOS.filter((v) => v.level === activeLevel)
    : VIDEOS;

  const CATEGORY_LABELS: Record<string, string> = {
    crypto:    t("resources_cat_crypto"),
    stocks:    t("resources_cat_stocks"),
    macro:     t("resources_cat_macro"),
    education: t("resources_cat_education"),
  };

  return (
    <>
    {quizTopic && (
      <ResourceQuiz
        topic={quizTopic}
        level={quizLevel}
        onClose={() => setQuizTopic(null)}
      />
    )}
    <div className="resources-wrap">

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
            {[1, 2, 3, 4].map((l) => (
              <button
                key={l}
                className={`resources-level-btn ${activeLevel === l ? "active" : ""}`}
                onClick={() => setActiveLevel(l === activeLevel ? null : l)}
                style={activeLevel === l ? { borderColor: LEVEL_COLORS[l], color: LEVEL_COLORS[l] } : {}}
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
              watchLabel={t("resources_watch_youtube")}
              testLabel={t("resources_test_yourself")}
              onQuiz={openQuiz}
            />
          ))}
        </div>
      </div>

      {/* Nieuws */}
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
                  <span className="resources-news-cat" style={{ color: CATEGORY_COLORS[s.category] }}>
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
    </>
  );
}
