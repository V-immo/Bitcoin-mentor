"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type LuckyEvent = { multiplier: number; xp: number };

export default function LuckyXPToast() {
  const { lang } = useLanguage();
  const [event, setEvent] = useState<LuckyEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<LuckyEvent>).detail;
      setEvent(detail);
      setVisible(true);
      setTimeout(() => setVisible(false), 3500);
    }
    window.addEventListener("lucky-xp", handler);
    return () => window.removeEventListener("lucky-xp", handler);
  }, []);

  if (!visible || !event) return null;

  return (
    <div className="lucky-xp-overlay" aria-live="polite">
      <div className="lucky-xp-card">
        <div className="lucky-xp-emoji">⚡</div>
        <div className="lucky-xp-title">
          {lang === "nl" ? "Lucky Bonus!" : "Lucky Bonus!"}
        </div>
        <div className="lucky-xp-multiplier">{event.multiplier}× XP</div>
        <div className="lucky-xp-amount">+{event.xp} XP</div>
        <div className="lucky-xp-sub">
          {lang === "nl"
            ? "De markt beloont consistentie."
            : "The market rewards consistency."}
        </div>
      </div>
    </div>
  );
}
