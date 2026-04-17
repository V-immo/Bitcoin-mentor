"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SocialProof() {
  const { lang } = useLanguage();
  const [active, setActive] = useState<number | null>(null);
  const [quizzes, setQuizzes] = useState<number | null>(null);

  useEffect(() => {
    function load() {
      fetch("/api/stats/daily")
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) {
            setActive(d.active ?? 0);
            setQuizzes(d.quizzes ?? 0);
          }
        })
        .catch(() => {});
    }
    load();
    const iv = setInterval(load, 5 * 60_000);
    return () => clearInterval(iv);
  }, []);

  if (active === null) return null;

  return (
    <div className="social-proof-bar">
      <span className="social-proof-dot" aria-hidden="true" />
      <span className="social-proof-text">
        {lang === "nl"
          ? `${active} trader${active !== 1 ? "s" : ""} actief vandaag`
          : `${active} trader${active !== 1 ? "s" : ""} active today`}
      </span>
      {(quizzes ?? 0) > 0 && (
        <span className="social-proof-divider">·</span>
      )}
      {(quizzes ?? 0) > 0 && (
        <span className="social-proof-text">
          {lang === "nl"
            ? `${quizzes} quiz${quizzes !== 1 ? "zes" : ""} gedaan`
            : `${quizzes} quiz${quizzes !== 1 ? "zes" : ""} completed`}
        </span>
      )}
    </div>
  );
}
