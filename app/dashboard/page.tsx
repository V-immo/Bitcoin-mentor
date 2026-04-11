import OnboardingModal from "@/components/OnboardingModal";
import MarcusNudge from "@/components/MarcusNudge";
import DashboardBriefing from "@/components/DashboardBriefing";
import DashboardStats from "@/components/DashboardStats";
import MarketOverview from "@/components/MarketOverview";

export default function DashboardPage() {
  return (
    <>
      <OnboardingModal />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 20px 48px" }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Marcus berichten */}
        <MarcusNudge />

        {/* Stats kaarten */}
        <DashboardStats />

        {/* Twee kolommen: briefing + markt */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          <DashboardBriefing />
          <MarketOverview compact />
        </div>
      </div>
    </>
  );
}
