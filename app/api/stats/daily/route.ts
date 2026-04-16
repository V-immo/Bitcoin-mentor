import { getDb } from "@/db/db";
import { NextResponse } from "next/server";

// Cache 5 minuten — voorkomt hammering op drukke momenten
let cache: { data: { active: number; quizzes: number }; ts: number } | null = null;
const CACHE_TTL = 5 * 60_000;

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    const activeRow = db.prepare(
      "SELECT COUNT(*) as cnt FROM users WHERE last_streak_date = ?"
    ).get(today) as { cnt: number };

    const quizRow = db.prepare(
      "SELECT COUNT(*) as cnt FROM quiz_progress WHERE last_quiz_date = ?"
    ).get(today) as { cnt: number };

    const data = {
      active: activeRow?.cnt ?? 0,
      quizzes: quizRow?.cnt ?? 0,
    };
    cache = { data, ts: Date.now() };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ active: 0, quizzes: 0 });
  }
}
