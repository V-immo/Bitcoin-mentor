import { auth } from "@/auth";
import { getDb } from "@/db/db";

// Level → groep mapping: 1-2 = groep 1, 3-4 = groep 2, 5-6 = groep 3
function levelToGroup(level: number): number {
  if (level <= 2) return 1;
  if (level <= 4) return 2;
  return 3;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  // Haal user level op
  const quizRow = db.prepare("SELECT level FROM quiz_progress WHERE user_id = ?").get(userId) as
    { level: number } | undefined;
  const level = quizRow?.level ?? 1;
  const group = levelToGroup(level);

  // Zoek brief voor vandaag op het juiste niveau
  const brief = db.prepare(
    "SELECT content, created_at FROM market_briefs WHERE date = ? AND level_group = ?"
  ).get(today, group) as { content: string; created_at: string } | undefined;

  if (!brief) {
    return Response.json({
      available: false,
      date: today,
      level,
      group,
      content: null,
    });
  }

  return Response.json({
    available: true,
    date: today,
    level,
    group,
    content: brief.content,
    createdAt: brief.created_at,
  });
}
