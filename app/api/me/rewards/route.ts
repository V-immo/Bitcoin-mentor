import { auth } from "@/auth";
import { getRewardsBalance } from "@/lib/rewards";
import type { Session } from "next-auth";

function getUserId(session: Session | null): number | null {
  const id = (session?.user as { id?: string })?.id;
  return id ? parseInt(id) : null;
}

export async function GET() {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const data = getRewardsBalance(userId);
  return Response.json(data);
}
