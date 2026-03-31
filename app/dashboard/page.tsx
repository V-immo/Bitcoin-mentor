import AssetScanner from "@/components/AssetScanner";
import OnboardingModal from "@/components/OnboardingModal";
import MarcusNudge from "@/components/MarcusNudge";

export default function DashboardPage() {
  return (
    <>
      <OnboardingModal />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 16px 0" }}>
        <MarcusNudge />
      </div>
      <AssetScanner />
    </>
  );
}
