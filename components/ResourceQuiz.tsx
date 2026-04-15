"use client";

import { useState, useEffect } from "react";
import type { QuizQuestion } from "@/app/api/quiz/route";
import { useLanguage } from "@/contexts/LanguageContext";

type Phase = "loading" | "quiz" | "result" | "error";

export default function ResourceQuiz({
  topic,
  level,
  onClose,
}: {
  topic: string;
  level: number;
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quick: true, count: 3, todayTopic: topic, level, lang }),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data.questions?.length) {
          setQuestions(data.questions.slice(0, 3));
          setPhase("quiz");
        } else {
          setPhase("error");
        }
      })
      .catch(() => setPhase("error"))
      .finally(() => clearTimeout(timeout));

    return () => { controller.abort(); clearTimeout(timeout); };
  }, [topic, level, lang]);

  function selectAnswer(letter: string) {
    if (revealed) return;
    setSelected(letter);
    setRevealed(true);
    if (letter === questions[current].correct) {
      setScore((s) => s + 1);
    }
  }

  function next() {
    if (current + 1 >= questions.length) {
      setPhase("result");
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setRevealed(false);
    }
  }

  const total = questions.length;
  const q = questions[current];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(0,0,0,0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: 16,
          padding: 24,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 3 }}>
              🎓 {t("resources_test_yourself")}
            </div>
            <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{topic}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
              fontSize: 20,
              lineHeight: 1,
              padding: "2px 6px",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Loading */}
        {phase === "loading" && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)" }}>
            <div className="quiz-spinner" style={{ margin: "0 auto 14px" }} />
            <div style={{ fontSize: 14 }}>{t("resources_quiz_loading")}</div>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ color: "var(--red)", marginBottom: 14, fontSize: 14 }}>{t("resources_quiz_error")}</div>
            <button
              onClick={onClose}
              style={{
                padding: "10px 24px",
                background: "var(--card-hover)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {t("resources_quiz_close")}
            </button>
          </div>
        )}

        {/* Quiz */}
        {phase === "quiz" && q && (
          <>
            {/* Progress bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div
                style={{
                  flex: 1,
                  height: 5,
                  background: "var(--border)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(current / total) * 100}%`,
                    height: "100%",
                    background: "var(--accent)",
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                {current + 1} / {total}
              </span>
            </div>

            {/* Question */}
            <div
              style={{
                fontWeight: 600,
                fontSize: 15,
                color: "var(--text)",
                marginBottom: q.context ? 8 : 14,
                lineHeight: 1.55,
              }}
            >
              {q.question}
            </div>
            {q.context && (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  marginBottom: 14,
                  fontStyle: "italic",
                  lineHeight: 1.4,
                }}
              >
                {q.context}
              </div>
            )}

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {q.options.map((opt) => {
                const letter = opt.charAt(0);
                let bg = "var(--card-hover)";
                let color = "var(--text)";
                let borderColor = "var(--border)";
                if (revealed) {
                  if (letter === q.correct) {
                    bg = "rgba(34,197,94,0.12)";
                    borderColor = "var(--green)";
                    color = "var(--green)";
                  } else if (letter === selected) {
                    bg = "rgba(239,68,68,0.12)";
                    borderColor = "var(--red)";
                    color = "var(--red)";
                  } else {
                    bg = "transparent";
                    color = "var(--muted)";
                  }
                } else if (letter === selected) {
                  borderColor = "var(--accent)";
                }
                return (
                  <button
                    key={letter}
                    onClick={() => selectAnswer(letter)}
                    disabled={revealed}
                    style={{
                      background: bg,
                      color,
                      border: `1.5px solid ${borderColor}`,
                      borderRadius: 10,
                      padding: "10px 14px",
                      textAlign: "left",
                      cursor: revealed ? "default" : "pointer",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      fontSize: 14,
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontWeight: 700, minWidth: 18 }}>{letter}.</span>
                    <span>{opt.slice(3)}</span>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {revealed && (
              <>
                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 14px",
                    background:
                      selected === q.correct
                        ? "rgba(34,197,94,0.08)"
                        : "rgba(239,68,68,0.08)",
                    borderRadius: 10,
                    borderLeft: `3px solid ${selected === q.correct ? "var(--green)" : "var(--red)"}`,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 5,
                      fontSize: 13,
                      color:
                        selected === q.correct ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {selected === q.correct
                      ? t("resources_quiz_correct")
                      : t("resources_quiz_wrong")}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
                    {q.explanation}
                  </div>
                </div>
                <button
                  onClick={next}
                  style={{
                    marginTop: 12,
                    width: "100%",
                    padding: "12px 0",
                    background: "var(--accent)",
                    color: "var(--text)",
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {current + 1 >= total
                    ? t("resources_quiz_finish")
                    : t("resources_quiz_next")}
                </button>
              </>
            )}
          </>
        )}

        {/* Result */}
        {phase === "result" && (
          <div style={{ textAlign: "center", padding: "8px 0 8px" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>
              {score === total ? "🎯" : score >= Math.ceil(total / 2) ? "👍" : "📖"}
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 20,
                color: "var(--text)",
                marginBottom: 6,
              }}
            >
              {t("resources_quiz_done_title")}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color:
                  score === total
                    ? "var(--green)"
                    : score >= Math.ceil(total / 2)
                    ? "var(--orange)"
                    : "var(--red)",
                marginBottom: 24,
              }}
            >
              {t("resources_quiz_done_sub")
                .replace("{score}", String(score))
                .replace("{total}", String(total))}
            </div>
            <button
              onClick={onClose}
              style={{
                padding: "12px 36px",
                background: "var(--accent)",
                color: "var(--text)",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              {t("resources_quiz_close")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
