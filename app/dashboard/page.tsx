"use client";

import OnboardingModal from "@/components/OnboardingModal";
import MarcusNudge from "@/components/MarcusNudge";
import DashboardBriefing from "@/components/DashboardBriefing";
import DashboardStats from "@/components/DashboardStats";
import MarketOverview from "@/components/MarketOverview";
import CommunitySentiment from "@/components/CommunitySentiment";
import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }));
  }, []);

  return (
    <>
      <OnboardingModal />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 20px 48px" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>Dashboard</h1>
          {dateStr && <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{dateStr}</p>}
        </div>

        <MarcusNudge />
        <DashboardStats />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          <DashboardBriefing />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <CommunitySentiment />
            <MarketOverview compact />
          </div>
        </div>
      </div>
    </>
  );
}
