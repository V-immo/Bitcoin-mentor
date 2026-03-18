import AssetScanner from "@/components/AssetScanner";
import OnboardingModal from "@/components/OnboardingModal";

export default function HomePage() {
  return (
    <>
      <OnboardingModal />
      <AssetScanner />
    </>
  );
}
