"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DailyQuiz from "@/components/DailyQuiz";
import LearningResources from "@/components/LearningResources";
import MarcusCurriculum from "@/components/MarcusCurriculum";
import LeagueWidget from "@/components/LeagueWidget";
import { useLanguage } from "@/contexts/LanguageContext";

const XP_PER_LEVEL = 500;

const LESSON_DIR: { id: string; level: number; titleNL: string; titleEN: string; topics: string[] }[] = [
  { id: "l1-bitcoin",        level: 1, titleNL: "Wat is Bitcoin eigenlijk?",               titleEN: "What is Bitcoin really?",                  topics: ["bitcoin", "crypto", "basis"] },
  { id: "l1-prijs",          level: 1, titleNL: "Hoe werkt de prijs van Bitcoin?",          titleEN: "How does Bitcoin's price work?",            topics: ["prijs", "vraag", "aanbod"] },
  { id: "l1-wallet",         level: 1, titleNL: "Wallets, exchanges en veiligheid",         titleEN: "Wallets, exchanges and security",           topics: ["wallet", "exchange"] },
  { id: "l1-groen-rood",     level: 1, titleNL: "Groen en rood — de markt begrijpen",       titleEN: "Green and red — understanding the market", topics: ["markt", "candles"] },
  { id: "l2-candles",        level: 2, titleNL: "Candlestick grafieken",                    titleEN: "Candlestick charts",                        topics: ["candles", "chart"] },
  { id: "l2-orders",         level: 2, titleNL: "Orders — hoe je koopt en verkoopt",        titleEN: "Orders — how you buy and sell",             topics: ["orders"] },
  { id: "l2-trend",          level: 2, titleNL: "Trends herkennen",                         titleEN: "Recognizing trends",                       topics: ["trend"] },
  { id: "l2-risico",         level: 2, titleNL: "Risicobeheer — de #1 skill",               titleEN: "Risk management",                          topics: ["risico", "risk", "stop-loss"] },
  { id: "l3-sr",             level: 3, titleNL: "Support en Resistance",                    titleEN: "Support and Resistance",                   topics: ["support", "resistance"] },
  { id: "l3-rsi",            level: 3, titleNL: "RSI — meten of de markt te ver gegaan is", titleEN: "RSI",                                      topics: ["rsi", "momentum"] },
  { id: "l3-positiegrootte", level: 3, titleNL: "Positiegrootte berekenen",                 titleEN: "Calculating position size",                topics: ["positiegrootte"] },
  { id: "l4-mtf",            level: 4, titleNL: "Multi-timeframe analyse",                  titleEN: "Multi-timeframe analysis",                 topics: ["timeframe", "mtf"] },
  { id: "l4-funding",        level: 4, titleNL: "Funding rates en Open Interest",           titleEN: "Funding rates and Open Interest",          topics: ["funding", "futures"] },
  { id: "l5-psychology",     level: 5, titleNL: "Trading psychologie",                      titleEN: "Trading psychology",                       topics: ["psychologie"] },
  { id: "l5-smc",            level: 5, titleNL: "Smart Money Concepten",                    titleEN: "Smart Money Concepts",                     topics: ["smart money"] },
];

function getRecommendedLesson(level: number, weakTopics: string[], readIds: string[], lang: string): { id: string; title: string } | null {
  const candidates = LESSON_DIR.filter(l => l.level <= level);
  if (weakTopics.length > 0) {
    const weak = candidates.find(l =>
      !readIds.includes(l.id) &&
      l.topics.some(t => weakTopics.some(w => w.toLowerCase().includes(t) || t.includes(w.toLowerCase())))
    );
    if (weak) return { id: weak.id, title: lang === "nl" ? weak.titleNL : weak.titleEN };
  }
  const unread = candidates.find(l => !readIds.includes(l.id) && l.level === level);
  if (unread) return { id: unread.id, title: lang === "nl" ? unread.titleNL : unread.titleEN };
  const levelLessons = LESSON_DIR.filter(l => l.level === level);
  const dayIndex = new Date().getDate() % Math.max(1, levelLessons.length);
  const pick = levelLessons[dayIndex] ?? levelLessons[0];
  return pick ? { id: pick.id, title: lang === "nl" ? pick.titleNL : pick.titleEN } : null;
}

const LEVEL_NAMES: Record<number, string> = {
  1: "Beginner",
  2: "Basis",
  3: "Gevorderd",
  4: "Pro",
  5: "Expert",
};

export default function LerenPage() {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState("lessons");
  const [quizLevel, setQuizLevel] = useState(1);
  const [quizXp, setQuizXp] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [recommendedLesson, setRecommendedLesson] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    try {
      const qh = JSON.parse(localStorage.getItem("btcmentor-quiz-history") || "{}");
      setQuizLevel(qh.level || 1);
      setQuizXp(qh.xp || 0);
      setQuizStreak(qh.streak || 0);
      const readIds = Object.keys(localStorage)
        .filter(k => k.startsWith("btcmentor-read-"))
        .map(k => k.replace("btcmentor-read-", ""));
      setRecommendedLesson(getRecommendedLesson(qh.level || 1, qh.weakTopics || [], readIds, lang));
    } catch { /* ignore */ }
  }, [lang]);

  const currentXp = quizXp % XP_PER_LEVEL;
  const xpPct = Math.min(100, (currentXp / XP_PER_LEVEL) * 100);
  const nextLevel = Math.min(5, quizLevel + 1);
  const levelName = LEVEL_NAMES[quizLevel] ?? `Level ${quizLevel}`;

  const TABS = [
    { id: "lessons",   label: t("leren_tab_lessons"),   icon: "" },
    { id: "quiz",      label: t("leren_tab_quiz"),       icon: "" },
    { id: "resources", label: t("leren_tab_resources"),  icon: "" },
    { id: "league",    label: lang === "nl" ? "Liga" : "League", icon: "" },
  ];

  return (
    <div className="lp2-root">

      {/* ── Hero ── */}
      <div className="lp2-hero">
        <div className="lp2-hero-orb" aria-hidden="true" />
        <div className="lp2-hero-inner">
          <div className="lp2-hero-label">
            {lang === "nl" ? "Marcus Curriculum" : "Marcus Curriculum"}
          </div>
          <h1 className="lp2-hero-h1">
            {lang === "nl" ? "Leren" : "Learn"}
            <span className="lp2-hero-accent"> & Groeien</span>
          </h1>
          <p className="lp2-hero-sub">
            {lang === "nl"
              ? "Van basis tot Smart Money Concepts. Op jouw tempo, met Marcus als coach."
              : "From basics to Smart Money Concepts. At your pace, with Marcus as coach."}
          </p>
        </div>

        {/* Level progress inlined in hero */}
        <div className="lp2-hero-progress">
          <div className="lp2-progress-labels">
            <div className="lp2-progress-level">
              <span className="lp2-level-pill">Level {quizLevel}</span>
              <span className="lp2-level-name">{levelName}</span>
              {quizStreak >= 2 && (
                <span className="lp2-streak-badge">{quizStreak} dagen</span>
              )}
            </div>
            <span className="lp2-xp-count">{currentXp} <span className="lp2-xp-slash">/</span> {XP_PER_LEVEL} XP</span>
          </div>
          <div className="lp2-xp-track">
            <div className="lp2-xp-fill" style={{ width: `${xpPct}%` }} />
            <div className="lp2-xp-glow" style={{ left: `${xpPct}%` }} />
          </div>
          {quizLevel < 5 && (
            <p className="lp2-xp-hint">
              {lang === "nl"
                ? `Nog ${XP_PER_LEVEL - currentXp} XP voor Level ${nextLevel}`
                : `${XP_PER_LEVEL - currentXp} XP to Level ${nextLevel}`}
            </p>
          )}
        </div>
      </div>

      {/* ── Aanbevolen les + Live Ready in een rij ── */}
      <div className="lp2-cards-row">
        {recommendedLesson && tab === "lessons" && (
          <div className="lp2-rec-card">
            <div className="lp2-rec-glow" aria-hidden="true" />
            <div className="lp2-rec-top">
              <span className="lp2-rec-label">
                {lang === "nl" ? "Vandaag aanbevolen" : "Recommended today"}
              </span>
            </div>
            <div className="lp2-rec-title">{recommendedLesson.title}</div>
            <p className="lp2-rec-sub">
              {lang === "nl"
                ? "Marcus selecteerde dit op basis van jouw quizresultaten."
                : "Marcus selected this based on your quiz results."}
            </p>
          </div>
        )}

        <Link href="/leren/live-ready" className="lp2-liveready-card">
          <div className="lp2-liveready-icon">▲</div>
          <div className="lp2-liveready-body">
            <div className="lp2-liveready-title">
              {lang === "nl" ? "Ben jij Live Ready?" : "Are you Live Ready?"}
            </div>
            <div className="lp2-liveready-sub">
              {lang === "nl"
                ? "Marcus beoordeelt jouw voortgang voor live trading."
                : "Marcus reviews your progress for live trading."}
            </div>
          </div>
          <div className="lp2-liveready-arrow">→</div>
        </Link>
      </div>

      {/* ── Tabs ── */}
      <div className="lp2-tabs">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            className={`lp2-tab${tab === tabItem.id ? " active" : ""}`}
            onClick={() => setTab(tabItem.id)}
          >
            <span className="lp2-tab-icon">{tabItem.icon}</span>
            <span className="lp2-tab-label">{tabItem.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="lp2-content">
        {tab === "lessons" && <MarcusCurriculum onQuizTabClick={() => setTab("quiz")} />}
        {tab === "quiz" && <DailyQuiz />}
        {tab === "resources" && <LearningResources />}
        {tab === "league" && (
          <div className="lp2-league-wrap">
            <LeagueWidget />
            <div className="lp2-points-card">
              <div className="lp2-points-title">
                {lang === "nl" ? "Hoe verdien je punten?" : "How do you earn points?"}
              </div>
              <div className="lp2-points-list">
                {[
                  { pts: "+10", desc: lang === "nl" ? "Dagelijkse login" : "Daily login" },
                  { pts: "+40", desc: lang === "nl" ? "Quiz voltooid" : "Quiz completed" },
                  { pts: "+30", desc: lang === "nl" ? "Winnende trade met R/R ≥ 1:2" : "Winning trade with R/R ≥ 1:2" },
                  { pts: "+15", desc: lang === "nl" ? "Winnende trade met R/R ≥ 1:1" : "Winning trade with R/R ≥ 1:1" },
                  { pts: "+5",  desc: lang === "nl" ? "Trade met stop-loss (ook verlies)" : "Trade with stop-loss (even a loss)" },
                ].map((row, i) => (
                  <div key={i} className="lp2-points-row">
                    <span className="lp2-points-val">{row.pts}</span>
                    <span className="lp2-points-desc">{row.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
