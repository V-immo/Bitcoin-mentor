"use client";

import StatsPanel from "@/components/StatsPanel";
import GoalTracker from "@/components/GoalTracker";
import PatternPanel from "@/components/PatternPanel";
import MarcusSignals from "@/components/MarcusSignals";
import AccountabilityPartner from "@/components/AccountabilityPartner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function StatsPage() {
  const { t } = useLanguage();

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1 className="stats-title">{t("stats_title")}</h1>
        <p className="stats-subtitle">{t("stats_subtitle")}</p>
      </div>

      {/* Doelen + persoonlijke stats naast elkaar */}
      <div className="stats-grid">
        <GoalTracker />
        <StatsPanel />
      </div>

      {/* Gedragspatronen */}
      <div style={{ marginTop: 24 }}>
        <PatternPanel />
      </div>

      {/* Marcus inzichten + accountability */}
      <div className="stats-bottom-row">
        <MarcusSignals />
        <AccountabilityPartner />
      </div>
    </div>
  );
}
