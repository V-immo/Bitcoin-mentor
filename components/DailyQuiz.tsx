"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuizQuestion, QuizResponse } from "@/app/api/quiz/route";
import QuizChat from "@/components/QuizChat";

const XP_PER_CORRECT = 40;
const XP_PER_LEVEL = 500;

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

function getLevelLabel(level: number): string {
  return ["", "Beginner", "Gevorderd", "Ervaren", "Expert", "Master"][level] ?? "Beginner";
}

function XpBar({ xp, level }: { xp: number; level: number }) {
  const currentXp = xp % XP_PER_LEVEL;
  const pct = Math.min(100, (currentXp / XP_PER_LEVEL) * 100);
  return (
    <div className="quiz-xp-wrap">
      <div className="quiz-xp-bar">
        <div className="quiz-xp-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="quiz-xp-label">{currentXp} / {XP_PER_LEVEL} XP</span>
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
        }),
      });
      if (!res.ok) throw new Error("Server fout");
      const data: QuizResponse = await res.json();
      if (!data.questions?.length) throw new Error("Geen vragen ontvangen");
      setQuestions(data.questions);
      setMarketSnapshot(data.marketSnapshot);
      setPhase("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout");
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
        // If still wrong questions remain, keep them for another retry round
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

    // Update weak topics: add wrong, remove if recently correct
    const correctTopics = questions
      .filter((q) => !wrongTopics.includes(q.topic))
      .map((q) => q.topic);
    const updatedWeak = [
      ...new Set([...history.weakTopics, ...wrongTopics]),
    ].filter((t) => !correctTopics.includes(t)).slice(0, 5);

    // Streak
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
    // Only wrong questions, shuffled, options also shuffled per question
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

  if (loading || !history) return <div className="quiz-loading">Laden…</div>;

  if (phase === "loading") {
    return (
      <div className="quiz-loading-screen">
        <div className="quiz-spinner" />
        <div className="quiz-loading-text">Quiz genereren met actuele marktdata…</div>
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
            🔁 Herhaling — foute vragen in willekeurige volgorde
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
                {selected === q.correct ? "✓ Correct!" : "✗ Fout"}
              </div>
              <div className="quiz-explanation-text">{q.explanation}</div>
            </div>

            {/* Marcus mini chat */}
            <QuizChat question={q} selectedAnswer={selected ?? ""} />

            <button className="quiz-next-btn" onClick={nextQuestion}>
              {current + 1 >= questions.length ? "Resultaat bekijken →" : "Volgende vraag →"}
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
    const grade = pct >= 80 ? "Uitstekend" : pct >= 60 ? "Goed" : pct >= 40 ? "Oefenen" : "Bijspijkeren";
    const gradeColor = pct >= 80 ? "var(--green)" : pct >= 60 ? "var(--orange)" : "var(--red)";

    return (
      <div className="quiz-result-screen">
        {leveledUp && (
          <div className="quiz-levelup-banner">
            🎉 Level up! Je bent nu {getLevelLabel(history.level)}!
          </div>
        )}

        <div className="quiz-result-score" style={{ color: gradeColor }}>
          {correctCount}/{total}
        </div>
        <div className="quiz-result-grade" style={{ color: gradeColor }}>{grade}</div>
        <div className="quiz-result-pct">{pct}% correct</div>

        <div className="quiz-result-stats">
          <div className="quiz-result-stat">
            <span className="quiz-result-stat-val">+{xpEarned}</span>
            <span className="quiz-result-stat-key">XP verdiend</span>
          </div>
          <div className="quiz-result-stat">
            <span className="quiz-result-stat-val">{history.streak}</span>
            <span className="quiz-result-stat-key">Dagen streak</span>
          </div>
          <div className="quiz-result-stat">
            <span className="quiz-result-stat-val">{getLevelLabel(history.level)}</span>
            <span className="quiz-result-stat-key">Niveau</span>
          </div>
        </div>

        <XpBar xp={history.xp} level={history.level} />

        {wrongQuestions.length > 0 && (
          <div className="quiz-weak-topics">
            <div className="quiz-weak-label">
              {wrongQuestions.length} vra{wrongQuestions.length === 1 ? "ag" : "gen"} fout — wil je ze opnieuw proberen?
            </div>
            <div className="quiz-weak-list">
              {[...new Set(wrongTopics)].map((t) => (
                <span key={t} className="quiz-weak-tag">{t}</span>
              ))}
            </div>
            <button className="quiz-start-btn quiz-retry-wrong-btn" onClick={startRetry}>
              🔁 Herhaal foute vragen ({wrongQuestions.length})
            </button>
          </div>
        )}

        {wrongQuestions.length === 0 && wrongTopics.length === 0 && correctCount > 0 && (
          <div className="quiz-all-correct">
            🎯 Alle vragen goed! Geweldig gedaan.
          </div>
        )}

        {marketSnapshot && (
          <div className="quiz-market-snap">
            <div className="quiz-market-snap-label">Marktdata gebruikt in deze quiz:</div>
            <pre className="quiz-market-snap-data">{marketSnapshot}</pre>
          </div>
        )}

        <button className="quiz-retry-btn" onClick={() => setPhase("home")}>
          ← Terug naar overzicht
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
        </div>
        <div className="quiz-streak">
          <span className="quiz-streak-fire">🔥</span>
          <span className="quiz-streak-count">{history.streak}</span>
          <span className="quiz-streak-label">streak</span>
        </div>
      </div>

      {/* Start button */}
      <div className="quiz-start-section">
        {alreadyDoneToday ? (
          <div className="quiz-done-today">
            <div className="quiz-done-icon">✓</div>
            <div className="quiz-done-text">Quiz vandaag al gedaan!</div>
            <div className="quiz-done-sub">Kom morgen terug voor een nieuwe quiz.</div>
            <button className="quiz-start-btn quiz-start-btn-secondary" onClick={startQuiz}>
              Nog een oefenronde doen →
            </button>
          </div>
        ) : (
          <>
            <div className="quiz-intro-text">
              Dagelijkse trading quiz op basis van <strong>actuele marktdata</strong>.
              Beantwoord vragen, verdien XP en word een betere trader.
            </div>
            <button className="quiz-start-btn" onClick={startQuiz}>
              Start dagelijkse quiz →
            </button>
          </>
        )}
        {error && <div className="quiz-error">{error}</div>}
      </div>

      {/* Weak topics */}
      {history.weakTopics.length > 0 && (
        <div className="quiz-section">
          <div className="quiz-section-title">Jouw focuspunten</div>
          <div className="quiz-weak-list">
            {history.weakTopics.map((t) => (
              <span key={t} className="quiz-weak-tag">{t}</span>
            ))}
          </div>
          <div className="quiz-section-sub">
            Deze onderwerpen komen vaker terug in je quiz.
          </div>
        </div>
      )}

      {/* Recent history */}
      {recentHistory.length > 0 && (
        <div className="quiz-section">
          <div className="quiz-section-title">Recente resultaten</div>
          {avgScore > 0 && (
            <div className="quiz-avg-score">
              Gemiddeld: <strong>{avgScore}%</strong> de laatste {recentHistory.length} quizzes
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
        <div className="quiz-section-title">Niveaus</div>
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
