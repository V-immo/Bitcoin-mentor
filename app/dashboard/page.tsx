import OnboardingModal from "@/components/OnboardingModal";
import MarcusNudge from "@/components/MarcusNudge";
import DashboardBriefing from "@/components/DashboardBriefing";
import MarketOverview from "@/components/MarketOverview";

export default function DashboardPage() {
  return (
    <>
      <OnboardingModal />
      <div className="dash-layout">
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 20px 32px" }}>
          <MarcusNudge />
          <DashboardBriefing />
          <MarketOverview />
        </div>
      </div>
    </>
  );
}
