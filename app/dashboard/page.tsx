import AssetScanner from "@/components/AssetScanner";
import OnboardingModal from "@/components/OnboardingModal";
import MarcusNudge from "@/components/MarcusNudge";
import DashboardBriefing from "@/components/DashboardBriefing";

export default function DashboardPage() {
  return (
    <>
      <OnboardingModal />
      <div className="dash-layout">
        <MarcusNudge />
        <DashboardBriefing />
        <AssetScanner />
      </div>
    </>
  );
}
