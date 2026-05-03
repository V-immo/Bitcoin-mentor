import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { awardSats, REWARD_AMOUNTS } from "@/lib/rewards";
import type { Session } from "next-auth";

function getUserId(session: Session | null): number | null {
  const id = (session?.user as { id?: string })?.id;
  return id ? parseInt(id) : null;
}

type QuizHistory = {
  level: number;
  xp: number;
  streak: number;
  lastQuizDate: string;
  weakTopics: string[];
  history: { date: string; score: number; total: number; topics: string[] }[];
};

function getOrCreate(userId: number): QuizHistory {
  const db = getDb();
  let row = db
    .prepare("SELECT * FROM quiz_progress WHERE user_id = ?")
    .get(userId) as Record<string, unknown> | undefined;

  if (!row) {
    db.prepare(`
      INSERT INTO quiz_progress (user_id) VALUES (?)
    `).run(userId);
    row = db
      .prepare("SELECT * FROM quiz_progress WHERE user_id = ?")
      .get(userId) as Record<string, unknown>;
  }

  return {
    level: (row.level as number) ?? 1,
    xp: (row.xp as number) ?? 0,
    streak: (row.streak as number) ?? 0,
    lastQuizDate: (row.last_quiz_date as string) ?? "",
    weakTopics: JSON.parse((row.weak_topics as string) ?? "[]"),
    history: JSON.parse((row.history as string) ?? "[]"),
  };
}

export async function GET() {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  return Response.json(getOrCreate(userId));
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const body: Partial<QuizHistory> = await request.json().catch(() => ({}));
  const db = getDb();

  const oldData = getOrCreate(userId); // zorg dat rij bestaat

  // ── Learn-to-Earn: detecteer nieuwe quiz sessie ──────────────────────────
  let rewardSats = 0;
  const newSessions = body.history ?? [];
  const oldSessions = oldData.history;
  const isNewSession =
    newSessions.length > 0 &&
    (oldSessions.length === 0 || newSessions[0].date !== oldSessions[0]?.date);

  if (isNewSession) {
    const latest = newSessions[0];
    const pct = latest.total > 0 ? (latest.score / latest.total) * 100 : 0;
    if (pct === 100) {
      awardSats(userId, REWARD_AMOUNTS.QUIZ_PERFECT, "quiz_perfect", { score: latest.score, total: latest.total });
      rewardSats += REWARD_AMOUNTS.QUIZ_PERFECT;
    } else if (pct >= 70) {
      awardSats(userId, REWARD_AMOUNTS.QUIZ_PASSED, "quiz_passed", { score: latest.score, total: latest.total, pct: Math.round(pct) });
      rewardSats += REWARD_AMOUNTS.QUIZ_PASSED;
    }
  }
  // Level-up bonus
  const newLevel = body.level ?? 1;
  if (newLevel > oldData.level) {
    awardSats(userId, REWARD_AMOUNTS.QUIZ_LEVEL_UP, "quiz_level_up", { oldLevel: oldData.level, newLevel });
    rewardSats += REWARD_AMOUNTS.QUIZ_LEVEL_UP;
  }

  db.prepare(`
    UPDATE quiz_progress SET
      level = ?,
      xp = ?,
      streak = ?,
      last_quiz_date = ?,
      weak_topics = ?,
      history = ?,
      updated_at = datetime('now')
    WHERE user_id = ?
  `).run(
    body.level ?? 1,
    body.xp ?? 0,
    body.streak ?? 0,
    body.lastQuizDate ?? "",
    JSON.stringify(body.weakTopics ?? []),
    JSON.stringify((body.history ?? []).slice(0, 30)), // max 30 items
    userId
  );

  return Response.json({ ok: true, rewardSats });
}
