"use client";

import Leaderboard from "@/components/Leaderboard";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LeaderboardPage() {
  const { t } = useLanguage();
  return (
    <div className="page-container page-narrow">
      <div className="page-hero">
        <h1 className="page-title">★ {t("leaderboard_page_title")}</h1>
      </div>
      <Leaderboard />
    </div>
  );
}
