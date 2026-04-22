"use client";

"use client";

import Link from "next/link";
import Leaderboard from "@/components/Leaderboard";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LeaderboardPage() {
  const { t } = useLanguage();
  return (
    <main className="page-container page-narrow">
      <div className="page-back-row">
        <Link href="/trade" className="page-back-btn">{t("page_back")}</Link>
        <h1 className="page-title">★ {t("leaderboard_page_title")}</h1>
      </div>
      <Leaderboard />
    </main>
  );
}
