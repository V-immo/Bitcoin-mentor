import OnboardingModal from "@/components/OnboardingModal";
import MarcusNudge from "@/components/MarcusNudge";
import DashboardBriefing from "@/components/DashboardBriefing";
import DashboardTopPicks from "@/components/DashboardTopPicks";

export default function DashboardPage() {
  return (
    <>
      <OnboardingModal />
      <div className="dash-layout">
        <MarcusNudge />
        <DashboardBriefing />
        <DashboardTopPicks />
      </div>
    </>
  );
}
