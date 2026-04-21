"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// Milestones: welke badges kan een gebruiker verdienen?
// Elke badge heeft een key (uniek), een label, XP-beloning en een check-functie.
// De check leest uit localStorage — dezelfde keys die DailyMissions en MarcusCurriculum gebruiken.
const MILESTONES = [
  {
    key: "lesson_1",
    labelNL: "Eerste les gelezen",
    labelEN: "First lesson read",
    emoji: "★",
    xp: 50,
    check: () => {
      try {
        return Object.keys(JSON.parse(localStorage.getItem("btcmentor-curriculum-read") ?? "{}")).length >= 1;
      } catch { return false; }
    },
  },
  {
    key: "lessons_5",
    labelNL: "5 lessen gelezen",
    labelEN: "5 lessons read",
    emoji: "★★",
    xp: 150,
    check: () => {
      try {
        return Object.keys(JSON.parse(localStorage.getItem("btcmentor-curriculum-read") ?? "{}")).length >= 5;
      } catch { return false; }
    },
  },
  {
    key: "streak_7",
    labelNL: "7-daagse streak",
    labelEN: "7-day streak",
    emoji: "★★★",
    xp: 200,
    check: () => {
      try {
        return (JSON.parse(localStorage.getItem("btcmentor-quiz-history") ?? "{}").streak ?? 0) >= 7;
      } catch { return false; }
    },
  },
];

type Milestone = typeof MILESTONES[0];

export default function BadgeUnlock() {
  const { data: session } = useSession();
  const [unlocked, setUnlocked] = useState<Milestone | null>(null);
  const [lang, setLang] = useState("nl");

  function checkBadges() {
    if (!session) return;
    try {
      const seen = JSON.parse(localStorage.getItem("btcmentor-seen-badges") ?? "[]") as string[];
      for (const m of MILESTONES) {
        if (!seen.includes(m.key) && m.check()) {
          seen.push(m.key);
          localStorage.setItem("btcmentor-seen-badges", JSON.stringify(seen));
          setUnlocked(m);
          setTimeout(() => setUnlocked(null), 4000);
          break; // toon badges één voor één — volgende check bij volgende storage event
        }
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    try {
      setLang(localStorage.getItem("btcmentor-lang") ?? "nl");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    checkBadges();
    // Hercheck bij elke localStorage-update (quiz afgerond, les gelezen, etc.)
    const onStorage = () => checkBadges();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (!unlocked) return null;

  const label = lang === "en" ? unlocked.labelEN : unlocked.labelNL;

  return (
    <div className="badge-unlock-toast" role="status" aria-live="polite">
      <span className="badge-unlock-emoji">{unlocked.emoji}</span>
      <span className="badge-unlock-text">
        {lang === "en" ? "New badge: " : "Nieuw badge: "}
        <strong>{label}</strong>
      </span>
      <span className="badge-unlock-xp">+{unlocked.xp} XP</span>
    </div>
  );
}
