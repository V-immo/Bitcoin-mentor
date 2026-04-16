import { auth } from "@/auth";
import { getDb } from "@/db/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const db = getDb();

  const row = db.prepare(
    "SELECT streak_freeze, login_streak FROM users WHERE id = ?"
  ).get(userId) as { streak_freeze: number; login_streak: number } | undefined;

  return Response.json({
    freeze: row?.streak_freeze ?? 0,
    streakDays: row?.login_streak ?? 0,
  });
}
