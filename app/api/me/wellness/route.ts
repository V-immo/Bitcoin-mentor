import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { getRecentWellness } from "@/lib/wellness";
import type { Session } from "next-auth";

function getUserId(session: Session | null): number | null {
  const id = (session?.user as { id?: string })?.id;
  return id ? parseInt(id) : null;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const days = parseInt(request.nextUrl.searchParams.get("days") ?? "7");
  const today = new Date().toISOString().slice(0, 10);
  const db = getDb();

  const todayEntry = db.prepare(
    "SELECT * FROM daily_wellness WHERE user_id = ? AND date = ?"
  ).get(userId, today);

  const history = getRecentWellness(userId, Math.min(days, 30));

  return Response.json({ today: todayEntry ?? null, history });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const today = new Date().toISOString().slice(0, 10);
  const db = getDb();

  const sleepHours  = body.sleepHours  != null ? Math.max(0, Math.min(12, Number(body.sleepHours)))  : null;
  const stressLevel = body.stressLevel != null ? Math.max(1, Math.min(5, Number(body.stressLevel)))  : null;
  const energyLevel = body.energyLevel != null ? Math.max(1, Math.min(5, Number(body.energyLevel)))  : null;
  const mood        = typeof body.mood === "string"  ? body.mood.slice(0, 20)   : null;
  const notes       = typeof body.notes === "string" ? body.notes.slice(0, 300) : null;

  db.prepare(`
    INSERT INTO daily_wellness (user_id, date, sleep_hours, stress_level, energy_level, mood, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      sleep_hours  = excluded.sleep_hours,
      stress_level = excluded.stress_level,
      energy_level = excluded.energy_level,
      mood         = excluded.mood,
      notes        = excluded.notes
  `).run(userId, today, sleepHours, stressLevel, energyLevel, mood, notes);

  return Response.json({ ok: true });
}
