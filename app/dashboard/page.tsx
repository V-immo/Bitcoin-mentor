"use client";

import OnboardingModal from "@/components/OnboardingModal";
import MarcusNudge from "@/components/MarcusNudge";
import DashboardBriefing from "@/components/DashboardBriefing";
import DashboardStats from "@/components/DashboardStats";
import MarketOverview from "@/components/MarketOverview";
import CommunitySentiment from "@/components/CommunitySentiment";
import CommunityScoreboard from "@/components/CommunityScoreboard";
import FirstSteps from "@/components/FirstSteps";
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
        <MarcusNudge />
        <DashboardStats />

        <div className="dashboard-grid">
          <DashboardBriefing />
          <div className="flex-col gap-md">
            <CommunitySentiment />
            <CommunityScoreboard />
            <MarketOverview compact />
          </div>
        </div>
      </div>
    </>
  );
}
