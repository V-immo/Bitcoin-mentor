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
import FirstSteps from "@/components/FirstSteps";
import SocialProof from "@/components/SocialProof";
import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }));
  }, []);

  return (
    <>
      <OnboardingModal />
      <div className="dashboard-page">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Dashboard</h1>
          {dateStr && <p className="dashboard-date">{dateStr}</p>}
        </div>

        <FirstSteps />
        <SocialProof />
        <DailyMissions />
        <DashboardStats />

        <div className="dashboard-grid">
          <DashboardBriefing />
          <div className="dashboard-sidebar">
            <FriendsStreaks />
            <AccountabilityPartner />
            <CommunitySentiment />
            <CommunityScoreboard />
            <MarketOverview compact />
          </div>
        </div>
      </div>
    </>
  );
}
