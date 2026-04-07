"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DailyQuiz from "@/components/DailyQuiz";
import LearningResources from "@/components/LearningResources";
import MarcusCurriculum from "@/components/MarcusCurriculum";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LerenPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState("lessons");
  const [showIntro, setShowIntro] = useState(false);

  const TABS = [
    { id: "lessons", label: t("leren_tab_lessons"), icon: "📖" },
    { id: "quiz", label: t("leren_tab_quiz"), icon: "🎓" },
    { id: "resources", label: t("leren_tab_resources"), icon: "📺" },
  ];

  useEffect(() => {
    const seen = localStorage.getItem("btcmentor-leren-intro");
    if (!seen) setShowIntro(true);
  }, []);

  function dismissIntro() {
    localStorage.setItem("btcmentor-leren-intro", "1");
    setShowIntro(false);
  }

  return (
    <main className="container-page">
      {/* Terug knop */}
      <div style={{ marginBottom: 12 }}>
        <Link href="/trade" className="page-back-btn">
          {t("leren_back")}
        </Link>
      </div>

      {/* Intro banner (eerste keer) */}
      {showIntro && (
        <div className="intro-banner">
          <div className="intro-banner-content">
            <div className="intro-banner-title">{t("leren_intro_title")}</div>
            <div className="intro-banner-body">
              <p>{t("leren_intro_body1")}</p>
              <ul>
                <li><strong>{t("leren_intro_quiz_title")}</strong> — {t("leren_intro_quiz_desc")}</li>
                <li><strong>{t("leren_intro_resources_title")}</strong> — {t("leren_intro_resources_desc")}</li>
              </ul>
              <p>{t("leren_intro_progress")}</p>
            </div>
            <button className="intro-banner-close" onClick={dismissIntro}>
              {t("leren_intro_cta")}
            </button>
          </div>
        </div>
      )}

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

      {tab === "lessons" && <MarcusCurriculum />}
      {tab === "quiz" && <DailyQuiz />}
      {tab === "resources" && <LearningResources />}

      {/* Onderaan terug knop */}
      <div style={{ marginTop: 32, paddingBottom: 16 }}>
        <Link href="/trade" className="page-back-btn">
          {t("leren_back")}
        </Link>
      </div>
    </main>
  );
}
