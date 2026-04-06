"use client";

"use client";

import Link from "next/link";
import Leaderboard from "@/components/Leaderboard";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LeaderboardPage() {
  const { t } = useLanguage();
  return (
    <main className="container-page clean-page">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Link href="/trade" className="page-back-btn">{t("page_back")}</Link>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🏆 {t("leaderboard_page_title")}</h1>
      </div>
      <Leaderboard />
    </main>
  );
}
