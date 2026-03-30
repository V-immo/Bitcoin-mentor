import AssetScanner from "@/components/AssetScanner";
import OnboardingModal from "@/components/OnboardingModal";

export default function DashboardPage() {
  return (
    <>
      <OnboardingModal />
      <AssetScanner />
    </>
  );
}
