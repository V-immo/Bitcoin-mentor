"use client";

import StatsPanel from "@/components/StatsPanel";
import GoalTracker from "@/components/GoalTracker";
import Leaderboard from "@/components/Leaderboard";
import PatternPanel from "@/components/PatternPanel";
import MarcusSignals from "@/components/MarcusSignals";
import { useLanguage } from "@/contexts/LanguageContext";

export default function StatsPage() {
  const { t } = useLanguage();

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1 className="stats-title">{t("stats_title")}</h1>
        <p className="stats-subtitle">{t("stats_subtitle")}</p>
      </div>

      <div className="stats-grid">
        <GoalTracker />
        <StatsPanel />
      </div>

      <div style={{ marginTop: 24 }}>
        <PatternPanel />
      </div>

      <MarcusSignals />

      <div style={{ marginTop: 24 }}>
        <Leaderboard />
      </div>
    </div>
  );
}
