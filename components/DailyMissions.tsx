"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

// Vereenvoudigde les-directory voor aanbevelingen
const LESSON_DIR: { id: string; level: number; titleNL: string; titleEN: string; topics: string[] }[] = [
  { id: "l1-bitcoin",         level: 1, titleNL: "Wat is Bitcoin eigenlijk?",               titleEN: "What is Bitcoin really?",                  topics: ["bitcoin", "crypto", "basis", "blockchain"] },
  { id: "l1-prijs",           level: 1, titleNL: "Hoe werkt de prijs van Bitcoin?",          titleEN: "How does Bitcoin's price work?",            topics: ["prijs", "vraag", "aanbod", "price"] },
  { id: "l1-wallet",          level: 1, titleNL: "Wallets, exchanges en veiligheid",         titleEN: "Wallets, exchanges and security",           topics: ["wallet", "exchange", "veiligheid", "security"] },
  { id: "l1-groen-rood",      level: 1, titleNL: "Groen en rood — de markt begrijpen",       titleEN: "Green and red — understanding the market", topics: ["markt", "candles", "basis"] },
  { id: "l2-candles",         level: 2, titleNL: "Candlestick grafieken",                    titleEN: "Candlestick charts",                        topics: ["candles", "candlestick", "chart"] },
  { id: "l2-orders",          level: 2, titleNL: "Orders — hoe je koopt en verkoopt",        titleEN: "Orders — how you buy and sell",             topics: ["orders", "buy", "sell", "limit", "market"] },
  { id: "l2-trend",           level: 2, titleNL: "Trends herkennen",                         titleEN: "Recognizing trends",                       topics: ["trend", "uptrend", "downtrend"] },
  { id: "l2-risico",          level: 2, titleNL: "Risicobeheer — de #1 skill",               titleEN: "Risk management — the #1 skill",           topics: ["risico", "risk", "stop-loss", "stoploss"] },
  { id: "l3-sr",              level: 3, titleNL: "Support en Resistance",                    titleEN: "Support and Resistance",                   topics: ["support", "resistance", "s&r"] },
  { id: "l3-rsi",             level: 3, titleNL: "RSI — meten of de markt te ver gegaan is", titleEN: "RSI — measuring if the market went too far",topics: ["rsi", "momentum", "overbought", "oversold"] },
  { id: "l3-positiegrootte",  level: 3, titleNL: "Positiegrootte berekenen",                 titleEN: "Calculating position size",                topics: ["positiegrootte", "position size", "risico"] },
  { id: "l4-mtf",             level: 4, titleNL: "Multi-timeframe analyse",                  titleEN: "Multi-timeframe analysis",                 topics: ["timeframe", "multi-timeframe", "mtf"] },
  { id: "l4-funding",         level: 4, titleNL: "Funding rates en Open Interest",           titleEN: "Funding rates and Open Interest",          topics: ["funding", "open interest", "futures"] },
  { id: "l5-psychology",      level: 5, titleNL: "Trading psychologie",                      titleEN: "Trading psychology",                       topics: ["psychologie", "psychology", "emotie", "fear", "greed"] },
  { id: "l5-smc",             level: 5, titleNL: "Smart Money Concepten",                    titleEN: "Smart Money Concepts",                     topics: ["smart money", "smc", "liquiditeit"] },
];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getRecommendedLesson(level: number, weakTopics: string[], readIds: string[], lang: string): { id: string; title: string } {
  const today = todayStr();
  // Kies lessen van huidig niveau of één niveau lager
  const candidates = LESSON_DIR.filter(l => l.level <= level && l.level >= Math.max(1, level - 1));

  // Prioriteit 1: ongelezen les die matcht met zwakke topics
  if (weakTopics.length > 0) {
    const weak = candidates.find(l =>
      !readIds.includes(l.id) &&
      l.topics.some(t => weakTopics.some(w => w.toLowerCase().includes(t) || t.includes(w.toLowerCase())))
    );
    if (weak) return { id: weak.id, title: lang === "nl" ? weak.titleNL : weak.titleEN };
  }

  // Prioriteit 2: eerste ongelezen les van huidig niveau
  const unread = candidates.find(l => !readIds.includes(l.id) && l.level === level);
  if (unread) return { id: unread.id, title: lang === "nl" ? unread.titleNL : unread.titleEN };

  // Prioriteit 3: eerste les van huidig niveau (zelfs al gelezen — review)
  // Gebruik dagelijkse rotatie voor afwisseling
  const levelLessons = LESSON_DIR.filter(l => l.level === level);
  const dayIndex = new Date(today).getDate() % levelLessons.length;
  const pick = levelLessons[dayIndex] ?? levelLessons[0];
  return { id: pick.id, title: lang === "nl" ? pick.titleNL : pick.titleEN };
}

type MissionStatus = {
  quiz: boolean;
  lesson: boolean;
  journal: boolean;
  premarket: boolean;
  chart: boolean;
};

export default function DailyMissions() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [status, setStatus] = useState<MissionStatus>({ quiz: false, lesson: false, journal: false, premarket: false, chart: false });
  const [quizStreak, setQuizStreak] = useState(0);
  const [recommendedLesson, setRecommendedLesson] = useState<{ id: string; title: string } | null>(null);
  const [comboGranted, setComboGranted] = useState(false);
  const [showCombo, setShowCombo] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const today = todayStr();

  const checkStatuses = useCallback(async () => {
    // 1. Quiz status
    let quizDone = false;
    let streak = 0;
    let level = 1;
    let weakTopics: string[] = [];
    try {
      const qh = JSON.parse(localStorage.getItem("btcmentor-quiz-history") || "{}");
      quizDone = qh.lastQuizDate === today;
      streak = qh.streak || 0;
      level = qh.level || 1;
      weakTopics = qh.weakTopics || [];
    } catch { /* ignore */ }

    // 2. Les status (door MarcusCurriculum gezet bij "Gelezen")
    const lessonDone = localStorage.getItem(`btcmentor-lesson-read-${today}`) === "1";

    // 3. Pre-market status
    const premarketDone = localStorage.getItem(`btcmentor-premarket-${today}`) === "1";

    // 4a. Chart challenge status
    const chartDone = localStorage.getItem(`btcmentor-chartchallenge-${today}`) === "1";

    // 4b. Journaal status via API (lichtgewicht)
    let journalDone = false;
    try {
      const res = await fetch(`/api/me/journal?month=${today.slice(0, 7)}`);
      if (res.ok) {
        const data = await res.json();
        journalDone = (data.entries ?? []).some((e: { date: string }) => e.date === today);
      }
    } catch { /* ignore */ }

    // 5. Aanbevolen les
    const readIds = Object.keys(localStorage)
      .filter(k => k.startsWith("btcmentor-read-"))
      .map(k => k.replace("btcmentor-read-", ""));
    const rec = getRecommendedLesson(level, weakTopics, readIds, lang);

    // 6. Combo al verleend vandaag?
    const comboDone = localStorage.getItem(`btcmentor-combo-${today}`) === "1";

    setStatus({ quiz: quizDone, lesson: lessonDone, journal: journalDone, premarket: premarketDone, chart: chartDone });
    setQuizStreak(streak);
    setRecommendedLesson(rec);
    setComboGranted(comboDone);
    setLoaded(true);

    // Combo check
    if (!comboDone && quizDone && lessonDone && journalDone && premarketDone && chartDone) {
      grantCombo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, lang]);

  useEffect(() => {
    checkStatuses();
    // Hercheck elke minuut (bijv. als tab opnieuw actief wordt)
    const iv = setInterval(checkStatuses, 60_000);
    return () => clearInterval(iv);
  }, [checkStatuses]);

  async function grantCombo() {
    localStorage.setItem(`btcmentor-combo-${today}`, "1");
    setComboGranted(true);
    setShowCombo(true);
    setTimeout(() => setShowCombo(false), 4000);

    // Voeg +100 XP toe via quiz API
    try {
      const res = await fetch("/api/me/quiz");
      if (res.ok) {
        const current = await res.json();
        await fetch("/api/me/quiz", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...current, xp: (current.xp || 0) + 100 }),
        });
        // Update ook localStorage zodat DailyQuiz het meteen ziet
        try {
          const lsHistory = JSON.parse(localStorage.getItem("btcmentor-quiz-history") || "{}");
          lsHistory.xp = (lsHistory.xp || 0) + 100;
          localStorage.setItem("btcmentor-quiz-history", JSON.stringify(lsHistory));
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }

  const doneCount = Object.values(status).filter(Boolean).length;
  const allDone = doneCount === 5;
  const hour = new Date().getHours();
  const streakAtRisk = hour >= 20 && !allDone && quizStreak > 0;

  if (!loaded) {
    return (
      <div className="card daily-missions-skeleton">
        <div className="daily-missions-skeleton-bar" />
        <div className="daily-missions-skeleton-bar short" />
      </div>
    );
  }

  return (
    <div className={`card daily-missions${allDone ? " all-done" : ""}`}>
      {/* Header */}
      <div className="daily-missions-header">
        <div className="daily-missions-title">
          <span>🎯</span>
          <span>{lang === "nl" ? "Dagelijkse Missies" : "Daily Missions"}</span>
        </div>
        <div className="daily-missions-count">
          <span className={`daily-missions-fraction${allDone ? " complete" : ""}`}>
            {doneCount}/5
          </span>
          <div className="daily-missions-bar">
            <div className="daily-missions-bar-fill" style={{ width: `${(doneCount / 5) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Combo banner */}
      {showCombo && (
        <div className="daily-missions-combo-toast">
          🎉 {lang === "nl" ? "Dagelijkse Combo!" : "Daily Combo!"} +100 XP
        </div>
      )}

      {/* Streak dreigingswaarschuwing */}
      {streakAtRisk && (
        <div className="daily-missions-streak-warning">
          ⚠️ {lang === "nl"
            ? `Je streak staat op het spel — nog ${4 - doneCount} missie(s) te doen voor middernacht`
            : `Your streak is at risk — ${4 - doneCount} mission(s) left before midnight`}
        </div>
      )}

      {/* Missies */}
      <div className="daily-missions-list">
        {/* Quiz */}
        <button
          className={`daily-mission-row${status.quiz ? " done" : ""}`}
          onClick={() => router.push("/leren")}
          disabled={status.quiz}
        >
          <span className="daily-mission-check">{status.quiz ? "✅" : "⬜"}</span>
          <div className="daily-mission-content">
            <span className="daily-mission-label">
              {lang === "nl" ? "Dagelijkse quiz" : "Daily quiz"}
            </span>
            {quizStreak >= 2 && (
              <span className="daily-mission-streak">🔥 {quizStreak} {lang === "nl" ? "dagen" : "days"}</span>
            )}
          </div>
          {!status.quiz && <span className="daily-mission-arrow">→</span>}
        </button>

        {/* Les */}
        <button
          className={`daily-mission-row${status.lesson ? " done" : ""}`}
          onClick={() => router.push("/leren")}
          disabled={status.lesson}
        >
          <span className="daily-mission-check">{status.lesson ? "✅" : "⬜"}</span>
          <div className="daily-mission-content">
            <span className="daily-mission-label">
              {lang === "nl" ? "Vandaag's les" : "Today's lesson"}
            </span>
            {recommendedLesson && !status.lesson && (
              <span className="daily-mission-sub">{recommendedLesson.title}</span>
            )}
          </div>
          {!status.lesson && <span className="daily-mission-arrow">→</span>}
        </button>

        {/* Journaal */}
        <button
          className={`daily-mission-row${status.journal ? " done" : ""}`}
          onClick={() => router.push("/agenda")}
          disabled={status.journal}
        >
          <span className="daily-mission-check">{status.journal ? "✅" : "⬜"}</span>
          <div className="daily-mission-content">
            <span className="daily-mission-label">
              {lang === "nl" ? "Journaal schrijven" : "Write journal"}
            </span>
            {!status.journal && (
              <span className="daily-mission-sub">
                {lang === "nl" ? "Wat leerde je vandaag?" : "What did you learn today?"}
              </span>
            )}
          </div>
          {!status.journal && <span className="daily-mission-arrow">→</span>}
        </button>

        {/* Pre-market */}
        <button
          className={`daily-mission-row${status.premarket ? " done" : ""}`}
          onClick={() => router.push("/trade")}
          disabled={status.premarket}
        >
          <span className="daily-mission-check">{status.premarket ? "✅" : "⬜"}</span>
          <div className="daily-mission-content">
            <span className="daily-mission-label">
              {lang === "nl" ? "Pre-market ritueel" : "Pre-market ritual"}
            </span>
            {!status.premarket && (
              <span className="daily-mission-sub">
                {lang === "nl" ? "Focus voor de dag zetten" : "Set your focus for the day"}
              </span>
            )}
          </div>
          {!status.premarket && <span className="daily-mission-arrow">→</span>}
        </button>

        {/* Chart challenge */}
        <button
          className={`daily-mission-row${status.chart ? " done" : ""}`}
          onClick={() => router.push("/leren/chart-challenge")}
          disabled={status.chart}
        >
          <span className="daily-mission-check">{status.chart ? "✅" : "⬜"}</span>
          <div className="daily-mission-content">
            <span className="daily-mission-label">
              {lang === "nl" ? "Chart challenge" : "Chart challenge"}
            </span>
            {!status.chart && (
              <span className="daily-mission-sub">
                {lang === "nl" ? "Analyseer het dagelijkse BTC-patroon" : "Analyze today's BTC pattern"}
              </span>
            )}
          </div>
          {!status.chart && <span className="daily-mission-arrow">→</span>}
        </button>
      </div>

      {/* Footer */}
      {!allDone && !comboGranted && (
        <div className="daily-missions-footer">
          🎁 {lang === "nl" ? `Doe alle 5 voor +100 bonus XP vandaag` : `Complete all 5 for +100 bonus XP today`}
        </div>
      )}
      {allDone && (
        <div className="daily-missions-footer complete">
          🏆 {lang === "nl" ? "Alle missies voltooid! Geweldig werk vandaag." : "All missions complete! Great work today."}
        </div>
      )}
    </div>
  );
}
