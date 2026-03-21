"use client";

import { useState, useRef, useEffect } from "react";
import type { QuizQuestion } from "@/app/api/quiz/route";
import { useLanguage } from "@/contexts/LanguageContext";

const QUIZ_KEY = "bitcoin-mentor-quiz";

type Msg = { role: "user" | "assistant"; content: string };

function loadQuizProfile(): { level: number; weakTopics: string[] } {
  try {
    const raw = localStorage.getItem(QUIZ_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return { level: d.level ?? 1, weakTopics: d.weakTopics ?? [] };
    }
  } catch { /* ignore */ }
  return { level: 1, weakTopics: [] };
}

type Props = {
  question: QuizQuestion;
  selectedAnswer: string;
};

export default function QuizChat({ question, selectedAnswer }: Props) {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset chat when question changes
  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [question.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const questionContext = `Quizvraag: "${question.question}"
Topic: ${question.topic}
Correct antwoord: ${question.correct} — ${question.options.find(o => o.startsWith(question.correct)) ?? ""}
Uitleg: ${question.explanation}
Gegeven antwoord van de trader: ${selectedAnswer}${selectedAnswer !== question.correct ? " (fout)" : " (correct)"}`;

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const profile = loadQuizProfile();
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          marketContext: "",
          traderLevel: profile.level,
          weakTopics: profile.weakTopics,
          questionContext,
          lang,
        }),
      });
      const json = await res.json();
      const reply = json.reply ?? t("quiz_chat_no_reply");
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: t("quiz_chat_error") }]);
    }
    setLoading(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="quiz-chat">
      <div className="quiz-chat-header">
        <span className="quiz-chat-avatar">M</span>
        <span className="quiz-chat-title">{t("quiz_chat_title")}</span>
        <span className="quiz-chat-hint">{t("quiz_chat_hint")}</span>
      </div>

      {messages.length > 0 && (
        <div className="quiz-chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`quiz-chat-msg quiz-chat-msg-${m.role}`}>
              {m.role === "assistant" && (
                <span className="quiz-chat-msg-avatar">M</span>
              )}
              <div className="quiz-chat-msg-bubble">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="quiz-chat-msg quiz-chat-msg-assistant">
              <span className="quiz-chat-msg-avatar">M</span>
              <div className="quiz-chat-msg-bubble quiz-chat-typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="quiz-chat-input-row">
        <textarea
          ref={inputRef}
          className="quiz-chat-input"
          placeholder={t("quiz_chat_placeholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          disabled={loading}
        />
        <button
          className="quiz-chat-send"
          onClick={send}
          disabled={loading || !input.trim()}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
