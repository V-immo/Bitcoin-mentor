import { auth } from "@/auth";
import AssetScanner from "@/components/AssetScanner";
import OnboardingModal from "@/components/OnboardingModal";
import LandingPage from "@/components/LandingPage";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    return (
      <>
        <OnboardingModal />
        <AssetScanner />
      </>
    );
  }

  return <LandingPage />;
}
