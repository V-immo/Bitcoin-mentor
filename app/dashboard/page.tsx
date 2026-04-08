import AssetScanner from "@/components/AssetScanner";
import OnboardingModal from "@/components/OnboardingModal";
import MarcusNudge from "@/components/MarcusNudge";
import DashboardBriefing from "@/components/DashboardBriefing";

export default function DashboardPage() {
  return (
    <>
      <OnboardingModal />
      <div className="dash-layout">
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "12px 20px 0" }}>
          <MarcusNudge />
          <DashboardBriefing />
        </div>
        <AssetScanner />
      </div>
    </>
  );
}
