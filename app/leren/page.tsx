"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DailyQuiz from "@/components/DailyQuiz";
import LearningResources from "@/components/LearningResources";
import MarcusCurriculum from "@/components/MarcusCurriculum";
import LeagueWidget from "@/components/LeagueWidget";
import { useLanguage } from "@/contexts/LanguageContext";

const XP_PER_LEVEL = 500;

// Vereenvoudigde les-directory (gedeeld met DailyMissions logica)
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

  const TABS = [
    { id: "lessons", label: t("leren_tab_lessons"), icon: "📖" },
    { id: "quiz", label: t("leren_tab_quiz"), icon: "🎓" },
    { id: "resources", label: t("leren_tab_resources"), icon: "📺" },
    { id: "league", label: lang === "nl" ? "Liga" : "League", icon: "🏆" },
  ];

  return (
    <main className="container-page">
      {/* Terug knop */}
      <div style={{ marginBottom: 12 }}>
        <Link href="/trade" className="page-back-btn">
          {t("leren_back")}
        </Link>
      </div>

      {/* Level voortgangskaart */}
      <div className="card leren-progress-card">
        <div className="leren-progress-top">
          <div>
            <span className="leren-level-badge">Level {quizLevel}</span>
            {quizStreak >= 2 && <span className="leren-streak-badge">🔥 {quizStreak}</span>}
          </div>
          <span className="leren-xp-label">{currentXp} / {XP_PER_LEVEL} XP</span>
        </div>
        <div className="leren-xp-bar">
          <div className="leren-xp-fill" style={{ width: `${xpPct}%` }} />
        </div>
        {quizLevel < 5 && (
          <p className="leren-progress-hint">
            {lang === "nl"
              ? `Nog ${XP_PER_LEVEL - currentXp} XP voor Level ${nextLevel} — ~${Math.ceil((XP_PER_LEVEL - currentXp) / 140)} quiz${Math.ceil((XP_PER_LEVEL - currentXp) / 140) === 1 ? "" : "zes"}`
              : `${XP_PER_LEVEL - currentXp} XP to Level ${nextLevel} — ~${Math.ceil((XP_PER_LEVEL - currentXp) / 140)} quiz${Math.ceil((XP_PER_LEVEL - currentXp) / 140) === 1 ? "" : "zes"} away`}
          </p>
        )}
      </div>

      {/* Aanbevolen les kaart */}
      {recommendedLesson && tab === "lessons" && (
        <div className="card leren-recommended-card">
          <div className="leren-recommended-label">
            {lang === "nl" ? "📚 Vandaag aanbevolen" : "📚 Recommended today"}
          </div>
          <div className="leren-recommended-title">{recommendedLesson.title}</div>
          <p className="leren-recommended-sub">
            {lang === "nl" ? "Marcus heeft deze les geselecteerd op basis van jouw quizresultaten." : "Marcus selected this lesson based on your quiz results."}
          </p>
        </div>
      )}

      {/* Live Ready entry */}
      <Link href="/leren/live-ready" className="liveready-entry-card">
        <span className="liveready-entry-card-icon">🏆</span>
        <div className="liveready-entry-card-body">
          <div className="liveready-entry-card-title">
            {lang === "nl" ? "Ben jij Live Ready?" : "Are you Live Ready?"}
          </div>
          <div className="liveready-entry-card-sub">
            {lang === "nl"
              ? "Controleer of je klaar bent voor live trading — Marcus beoordeelt jouw voortgang."
              : "Check if you're ready for live trading — Marcus reviews your progress."}
          </div>
        </div>
        <span className="liveready-entry-card-arrow">→</span>
      </Link>

      <div className="leren-tabs">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            className={`leren-tab${tab === tabItem.id ? " active" : ""}`}
            onClick={() => setTab(tabItem.id)}
          >
            <span>{tabItem.icon}</span>
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === "lessons" && <MarcusCurriculum onQuizTabClick={() => setTab("quiz")} />}
      {tab === "quiz" && <DailyQuiz />}
      {tab === "resources" && <LearningResources />}
      {tab === "league" && (
        <div style={{ marginTop: 8 }}>
          <LeagueWidget />
          <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {lang === "nl" ? "Hoe verdien je punten?" : "How do you earn points?"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { pts: "+10", desc: lang === "nl" ? "Dagelijkse login" : "Daily login" },
                { pts: "+40", desc: lang === "nl" ? "Quiz voltooid" : "Quiz completed" },
                { pts: "+30", desc: lang === "nl" ? "Winnende trade met R/R ≥ 1:2" : "Winning trade with R/R ≥ 1:2" },
                { pts: "+15", desc: lang === "nl" ? "Winnende trade met R/R ≥ 1:1" : "Winning trade with R/R ≥ 1:1" },
                { pts: "+5", desc: lang === "nl" ? "Trade met stop-loss (ook verlies)" : "Trade with stop-loss (even a loss)" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", minWidth: 32 }}>{row.pts}</span>
                  <span style={{ fontSize: 12, color: "var(--text)" }}>{row.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Onderaan terug knop */}
      <div style={{ marginTop: 32, paddingBottom: 16 }}>
        <Link href="/trade" className="page-back-btn">
          {t("leren_back")}
        </Link>
      </div>
    </main>
  );
}
