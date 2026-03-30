import { auth } from "@/auth";
import LandingPage from "@/components/LandingPage";

export default async function HomePage() {
  const session = await auth();
  return <LandingPage loggedIn={!!session?.user} />;
}
