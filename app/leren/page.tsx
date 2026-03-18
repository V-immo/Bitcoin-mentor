"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DailyQuiz from "@/components/DailyQuiz";
import LearningResources from "@/components/LearningResources";

const TABS = [
  { id: "quiz", label: "Dagelijkse quiz", icon: "🎓" },
  { id: "resources", label: "Leerbronnen", icon: "📚" },
];

export default function LerenPage() {
  const [tab, setTab] = useState("quiz");
  const [showIntro, setShowIntro] = useState(false);

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
          ← Terug naar Traden
        </Link>
      </div>

      {/* Intro banner (eerste keer) */}
      {showIntro && (
        <div className="intro-banner">
          <div className="intro-banner-content">
            <div className="intro-banner-title">Welkom bij Leren 🎓</div>
            <div className="intro-banner-body">
              <p>Hier word je stap voor stap een betere trader. Er zijn twee onderdelen:</p>
              <ul>
                <li><strong>Dagelijkse quiz</strong> — Beantwoord vragen over trading, verdien XP en stijg in niveau. Elke dag nieuwe vragen op basis van actuele marktdata.</li>
                <li><strong>Leerbronnen</strong> — Video&apos;s en artikelen per niveau. Begin bij level 1 als je nieuw bent, of kies een hoger niveau als je al wat weet.</li>
              </ul>
              <p>Je quiz-voortgang (niveau, XP, streak) wordt bijgehouden. Probeer elke dag een quiz te doen voor maximale groei.</p>
            </div>
            <button className="intro-banner-close" onClick={dismissIntro}>
              Begrepen, aan de slag →
            </button>
          </div>
        </div>
      )}

      <div className="leren-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`leren-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "quiz" && <DailyQuiz />}
      {tab === "resources" && <LearningResources />}

      {/* Onderaan terug knop */}
      <div style={{ marginTop: 32, paddingBottom: 16 }}>
        <Link href="/trade" className="page-back-btn">
          ← Terug naar Traden
        </Link>
      </div>
    </main>
  );
}
