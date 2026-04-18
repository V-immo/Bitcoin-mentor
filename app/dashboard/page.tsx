"use client";

import OnboardingModal from "@/components/OnboardingModal";
import DailyMissions from "@/components/DailyMissions";
import DashboardBriefing from "@/components/DashboardBriefing";
import DashboardStats from "@/components/DashboardStats";
import MarketOverview from "@/components/MarketOverview";
import CommunitySentiment from "@/components/CommunitySentiment";
import CommunityScoreboard from "@/components/CommunityScoreboard";
import FriendsStreaks from "@/components/FriendsStreaks";
import AccountabilityPartner from "@/components/AccountabilityPartner";
import LeagueWidget from "@/components/LeagueWidget";
import FirstSteps from "@/components/FirstSteps";
import SocialProof from "@/components/SocialProof";
import MorningBrief from "@/components/MorningBrief";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DashboardPage() {
  const { lang } = useLanguage();
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const locale = lang === "nl" ? "nl-NL" : "en-GB";
    setDateStr(new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" }));
  }, [lang]);

  return (
    <>
      <OnboardingModal />
      <div className="dashboard-page">

        {/* ── Header ── */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            {dateStr && <p className="dashboard-date">{dateStr}</p>}
          </div>
        </div>

        {/* ── Morning Brief — full width, featured ── */}
        <MorningBrief />

        {/* ── Hoofdlayout: main + sidebar naast elkaar ── */}
        <div className="dashboard-layout">

          {/* ── Linker kolom: hoofd content ── */}
          <div className="dashboard-main">
            <FirstSteps />
            <SocialProof />
            <DailyMissions />
            <DashboardStats />
            <DashboardBriefing />
          </div>

          {/* ── Rechter kolom: sticky sidebar ── */}
          <aside className="dashboard-sidebar">
            <LeagueWidget />
            <FriendsStreaks />
            <MarketOverview compact />
            <AccountabilityPartner />
            <CommunitySentiment />
            <CommunityScoreboard />
          </aside>

        </div>
      </div>
    </>
  );
}
