"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QuizQuestion, QuizResponse } from "@/app/api/quiz/route";
import QuizChat from "@/components/QuizChat";
import { useLanguage } from "@/contexts/LanguageContext";

const XP_PER_CORRECT = 40;
const XP_PER_LEVEL = 500;
const AVG_XP_PER_QUIZ = 200; // ~5 goed op 7 vragen

type QuizHistory = {
  level: number;
  xp: number;
  streak: number;
  lastQuizDate: string; // ISO date string "2026-03-17"
  weakTopics: string[];
  history: { date: string; score: number; total: number; topics: string[] }[];
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function XpBar({ xp, level }: { xp: number; level: number }) {
  const { t } = useLanguage();
  const currentXp = xp % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - currentXp;
  const pct = Math.min(100, (currentXp / XP_PER_LEVEL) * 100);
  const nextLevel = Math.min(5, level + 1);
  const approxQuizzes = Math.ceil(xpToNext / AVG_XP_PER_QUIZ);
  return (
    <div className="quiz-xp-outer">
      <div className="quiz-xp-wrap">
        <div className="quiz-xp-bar">
          <div className="quiz-xp-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="quiz-xp-label">{currentXp} / {XP_PER_LEVEL} XP</span>
      </div>
      {level < 5 && (
        <div className="quiz-xp-to-next">
          {t("quiz_approx_sessions")} ~{approxQuizzes} {t("quiz_approx_sessions2")} {nextLevel}
        </div>
      )}
    </div>
  );
}

type Phase = "home" | "loading" | "quiz" | "result" | "retry";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DEFAULT_HISTORY: QuizHistory = {
  level: 1,
  xp: 0,
  streak: 0,
  lastQuizDate: "",
  weakTopics: [],
  history: [],
};

export default function DailyQuiz() {
  const { t, lang } = useLanguage();
  const [history, setHistory] = useState<QuizHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("home");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [marketSnapshot, setMarketSnapshot] = useState("");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongTopics, setWrongTopics] = useState<string[]>([]);
  const [wrongQuestions, setWrongQuestions] = useState<QuizQuestion[]>([]);
  const [leveledUp, setLeveledUp] = useState(false);
  const [error, setError] = useState("");

  const totalSessionsDone = history?.history?.length ?? 0;

  function openMarcusAssignment() {
    if (!history) return;
    const level = history.level;
    const topics = wrongTopics.length > 0 ? [...new Set(wrongTopics)].join(", ") : null;
    const promptTemplate = topics
      ? t("quiz_marcus_assignment_prompt")
      : t("quiz_marcus_assignment_prompt_ok");
    const prompt = promptTemplate
      .replace("{level}", String(level))
      .replace("{topics}", topics ?? "");
    localStorage.setItem("btcmentor-marcus-prompt", prompt);
    window.location.href = "/trade";
  }

  function getLevelLabel(level: number): string {
    return [
      "",
      t("quiz_level_beginner"),
      t("quiz_level_advanced"),
      t("quiz_level_experienced"),
      t("quiz_level_expert"),
      t("quiz_level_master"),
    ][level] ?? t("quiz_level_beginner");
  }

  const saveHistory = useCallback(async (newHistory: QuizHistory) => {
    try {
      await fetch("/api/me/quiz", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newHistory),
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/me/quiz");
        if (res.ok) {
          const data = await res.json();
          setHistory(data ?? DEFAULT_HISTORY);
        } else {
          setHistory(DEFAULT_HISTORY);
        }
      } catch {
        setHistory(DEFAULT_HISTORY);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const alreadyDoneToday = history?.lastQuizDate === today();

  async function startQuiz() {
    if (!history) return;
    setPhase("loading");
    setError("");
    setCorrectCount(0);
    setWrongTopics([]);
    setWrongQuestions([]);
    setCurrent(0);
    setSelected(null);
    setRevealed(false);
    setLeveledUp(false);

    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: history.level,
          weakTopics: history.weakTopics.slice(0, 3),
          lang,
        }),
      });
      const data = await res.json();
      if (res.status === 429 || data.error === "RATE_LIMIT") throw new Error(t("quiz_error_rate_limit"));
      if (!res.ok) throw new Error(data.error || t("quiz_error_server"));
      if (!data.questions?.length) throw new Error(t("quiz_error_no_questions"));
      setQuestions(data.questions);
      setMarketSnapshot(data.marketSnapshot);
      setPhase("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("quiz_error_server"));
      setPhase("home");
    }
  }

  function selectAnswer(letter: string) {
    if (revealed) return;
    setSelected(letter);
    setRevealed(true);
    const q = questions[current];
    if (letter === q.correct) {
      setCorrectCount((c) => c + 1);
    } else {
      setWrongTopics((wt) => [...wt, q.topic]);
      setWrongQuestions((wq) => [...wq, q]);
    }
  }

  function nextQuestion() {
    if (current + 1 >= questions.length) {
      if (phase === "retry") {
        setPhase("result");
      } else {
        finishQuiz();
      }
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setRevealed(false);
    }
  }

  function finishQuiz() {
    if (!history) return;
    const finalCorrect = correctCount;
    const total = questions.length;

    const xpEarned = finalCorrect * XP_PER_CORRECT;
    const newXp = history.xp + xpEarned;
    const oldLevel = history.level;
    const newLevel = Math.min(5, Math.floor(newXp / XP_PER_LEVEL) + 1);
    const didLevelUp = newLevel > oldLevel;

    const correctTopics = questions
      .filter((q) => !wrongTopics.includes(q.topic))
      .map((q) => q.topic);
    const updatedWeak = [
      ...new Set([...history.weakTopics, ...wrongTopics]),
    ].filter((topic) => !correctTopics.includes(topic)).slice(0, 5);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    const newStreak = history.lastQuizDate === yStr ? history.streak + 1 : 1;

    const newHistory: QuizHistory = {
      level: newLevel,
      xp: newXp,
      streak: newStreak,
      lastQuizDate: today(),
      weakTopics: updatedWeak,
      history: [
        { date: today(), score: finalCorrect, total, topics: wrongTopics },
        ...history.history.slice(0, 29),
      ],
    };

    saveHistory(newHistory);
    setHistory(newHistory);
    setLeveledUp(didLevelUp);
    setPhase("result");
  }

  function startRetry() {
    const retryQs = shuffle(wrongQuestions).map((q) => ({
      ...q,
      options: shuffle(q.options),
    }));
    setQuestions(retryQs);
    setCorrectCount(0);
    setWrongTopics([]);
    setWrongQuestions([]);
    setCurrent(0);
    setSelected(null);
    setRevealed(false);
    setLeveledUp(false);
    setPhase("retry");
  }

  if (loading || !history) return <div className="quiz-loading">{t("quiz_loading")}</div>;

  if (phase === "loading") {
    return (
      <div className="quiz-loading-screen">
        <div className="quiz-spinner" />
        <div className="quiz-loading-text">{t("quiz_generating")}</div>
      </div>
    );
  }

  if (phase === "quiz" || phase === "retry") {
    const q = questions[current];
    const progress = ((current) / questions.length) * 100;

    return (
      <div className="quiz-screen">
        {/* Progress */}
        <div className="quiz-progress-wrap">
          <div className="quiz-progress-bar">
            <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="quiz-progress-label">{current + 1} / {questions.length}</span>
        </div>

        {/* Retry banner */}
        {phase === "retry" && (
          <div className="quiz-retry-banner">
            {t("quiz_retry_banner")}
          </div>
        )}

        {/* Topic badge */}
        <div className="quiz-topic-badge">{q.topic}</div>

        {/* Question */}
        <div className="quiz-question-card">
          <div className="quiz-question-text">{q.question}</div>
          {q.context && <div className="quiz-question-context">{q.context}</div>}
        </div>

        {/* Options */}
        <div className="quiz-options">
          {q.options.map((opt) => {
            const letter = opt.charAt(0);
            let cls = "quiz-option";
            if (revealed) {
              if (letter === q.correct) cls += " correct";
              else if (letter === selected) cls += " wrong";
              else cls += " dimmed";
            } else if (letter === selected) {
              cls += " selected";
            }
            return (
              <button
                key={letter}
                className={cls}
                onClick={() => selectAnswer(letter)}
                disabled={revealed}
              >
                <span className="quiz-option-letter">{letter}</span>
                <span className="quiz-option-text">{opt.slice(3)}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {revealed && (
          <>
            <div className={`quiz-explanation ${selected === q.correct ? "correct" : "wrong"}`}>
              <div className="quiz-explanation-header">
                {selected === q.correct ? t("quiz_correct") : t("quiz_wrong")}
              </div>
              <div className="quiz-explanation-text">{q.explanation}</div>
            </div>

            {/* Marcus mini chat */}
            <QuizChat question={q} selectedAnswer={selected ?? ""} />

            <button className="quiz-next-btn" onClick={nextQuestion}>
              {current + 1 >= questions.length ? t("quiz_result_btn") : t("quiz_next_btn")}
            </button>
          </>
        )}
      </div>
    );
  }

  if (phase === "result") {
    const total = questions.length;
    const pct = Math.round((correctCount / total) * 100);
    const xpEarned = correctCount * XP_PER_CORRECT;
    const grade = pct >= 80 ? t("quiz_grade_excellent") : pct >= 60 ? t("quiz_grade_good") : pct >= 40 ? t("quiz_grade_practice") : t("quiz_grade_study");
    const gradeColor = pct >= 80 ? "var(--green)" : pct >= 60 ? "var(--orange)" : "var(--red)";

    return (
      <div className="quiz-result-screen">
        {leveledUp && (
          <div className="quiz-levelup-banner">
            {t("quiz_levelup")} {getLevelLabel(history.level)}!
          </div>
        )}

        <div className="quiz-result-score" style={{ color: gradeColor }}>
          {correctCount}/{total}
        </div>
        <div className="quiz-result-grade" style={{ color: gradeColor }}>{grade}</div>
        <div className="quiz-result-pct">{pct}{t("quiz_result_pct_correct")}</div>

        <div className="quiz-result-stats">
          <div className="quiz-result-stat">
            <span className="quiz-result-stat-val">+{xpEarned}</span>
            <span className="quiz-result-stat-key">{t("quiz_xp_earned")}</span>
          </div>
          <div className="quiz-result-stat">
            <span className="quiz-result-stat-val">{history.streak}</span>
            <span className="quiz-result-stat-key">{t("quiz_streak_days")}</span>
          </div>
          <div className="quiz-result-stat">
            <span className="quiz-result-stat-val">{getLevelLabel(history.level)}</span>
            <span className="quiz-result-stat-key">{t("quiz_level_label")}</span>
          </div>
        </div>

        <XpBar xp={history.xp} level={history.level} />

        <div className="quiz-result-sessions">
          <span className="quiz-result-sessions-count">{totalSessionsDone}</span>
          <span className="quiz-result-sessions-label"> {t("quiz_sessions_done")}</span>
        </div>

        {wrongQuestions.length > 0 && (
          <div className="quiz-weak-topics">
            <div className="quiz-weak-label">
              {wrongQuestions.length} {wrongQuestions.length === 1 ? t("quiz_weak_title_single") : t("quiz_weak_title_plural")}
            </div>
            <div className="quiz-weak-list">
              {[...new Set(wrongTopics)].map((topic) => (
                <span key={topic} className="quiz-weak-tag">{topic}</span>
              ))}
            </div>
            <button className="quiz-start-btn quiz-retry-wrong-btn" onClick={startRetry}>
              {t("quiz_retry_wrong_btn")} ({wrongQuestions.length})
            </button>
          </div>
        )}

        {wrongQuestions.length === 0 && wrongTopics.length === 0 && correctCount > 0 && (
          <div className="quiz-all-correct">
            {t("quiz_all_correct")}
          </div>
        )}

        {marketSnapshot && (
          <div className="quiz-market-snap">
            <div className="quiz-market-snap-label">{t("quiz_market_snap_label")}</div>
            <pre className="quiz-market-snap-data">{marketSnapshot}</pre>
          </div>
        )}

        <button className="quiz-marcus-btn" onClick={openMarcusAssignment}>
          {t("quiz_marcus_assignment")}
        </button>

        <button className="quiz-retry-btn" onClick={() => setPhase("home")}>
          {t("quiz_back_btn")}
        </button>
      </div>
    );
  }

  // Home phase
  const recentHistory = history.history.slice(0, 7);
  const avgScore = recentHistory.length > 0
    ? Math.round(recentHistory.reduce((a, h) => a + (h.score / h.total) * 100, 0) / recentHistory.length)
    : 0;

  return (
    <div className="quiz-home">
      {/* Header */}
      <div className="quiz-header">
        <div className="quiz-header-left">
          <div className="quiz-level-badge">
            <span className="quiz-level-num">{history.level}</span>
            <span className="quiz-level-label">{getLevelLabel(history.level)}</span>
          </div>
          <XpBar xp={history.xp} level={history.level} />
          {totalSessionsDone > 0 && (
            <div className="quiz-sessions-done-home">
              {totalSessionsDone} {t("quiz_sessions_done")}
            </div>
          )}
        </div>
        <div className="quiz-streak">
          <span className="quiz-streak-fire">🔥</span>
          <span className="quiz-streak-count">{history.streak}</span>
          <span className="quiz-streak-label">{t("quiz_streak_label")}</span>
        </div>
      </div>

      {/* Start button */}
      <div className="quiz-start-section">
        {alreadyDoneToday ? (
          <div className="quiz-done-today">
            <div className="quiz-done-icon">✓</div>
            <div className="quiz-done-text">{t("quiz_done_today")}</div>
            <div className="quiz-done-sub">{t("quiz_done_sub")}</div>
            <button className="quiz-start-btn quiz-start-btn-secondary" onClick={startQuiz}>
              {t("quiz_extra_round")}
            </button>
          </div>
        ) : (
          <>
            <div className="quiz-intro-text">
              {t("quiz_intro_text")} <strong>{t("quiz_intro_market")}</strong>.
              {" "}{t("quiz_intro_desc")}
            </div>
            <button className="quiz-start-btn" onClick={startQuiz}>
              {t("quiz_start_btn")}
            </button>
          </>
        )}
        {error && <div className="quiz-error">{error}</div>}
      </div>

      {/* Weak topics */}
      {history.weakTopics.length > 0 && (
        <div className="quiz-section">
          <div className="quiz-section-title">{t("quiz_focus_title")}</div>
          <div className="quiz-weak-list">
            {history.weakTopics.map((topic) => (
              <span key={topic} className="quiz-weak-tag">{topic}</span>
            ))}
          </div>
          <div className="quiz-section-sub">
            {t("quiz_focus_sub")}
          </div>
        </div>
      )}

      {/* Recent history */}
      {recentHistory.length > 0 && (
        <div className="quiz-section">
          <div className="quiz-section-title">{t("quiz_recent_title")}</div>
          {avgScore > 0 && (
            <div className="quiz-avg-score">
              {t("quiz_avg_prefix")} <strong>{avgScore}%</strong> {t("quiz_avg_suffix_1")} {recentHistory.length} {t("quiz_avg_suffix_2")}
            </div>
          )}
          <div className="quiz-history-list">
            {recentHistory.map((h, i) => {
              const pct = Math.round((h.score / h.total) * 100);
              const color = pct >= 80 ? "var(--green)" : pct >= 60 ? "var(--orange)" : "var(--red)";
              return (
                <div key={i} className="quiz-history-row">
                  <span className="quiz-history-date">{h.date}</span>
                  <div className="quiz-history-bar-wrap">
                    <div className="quiz-history-bar">
                      <div className="quiz-history-bar-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                  <span className="quiz-history-score" style={{ color }}>
                    {h.score}/{h.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Level overview */}
      <div className="quiz-section">
        <div className="quiz-section-title">{t("quiz_levels_title")}</div>
        <div className="quiz-levels-grid">
          {[1, 2, 3, 4, 5].map((l) => (
            <div key={l} className={`quiz-level-card ${history.level >= l ? "unlocked" : "locked"}`}>
              <div className="quiz-level-card-num">{l}</div>
              <div className="quiz-level-card-name">{getLevelLabel(l)}</div>
              {history.level >= l && <div className="quiz-level-card-check">✓</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
