import { auth } from "@/auth";
import { getDb } from "@/db/db";

type UserProfile = {
  trading_style: string;
  risk_profile: string;
  goals: string;
  fears: string;
  strengths: string;
  weaknesses: string;
  best_time_of_day: string;
  worst_emotions: string;
  best_emotions: string;
  impulse_patterns: string;
  notes: string;
  updated_at: string;
};

export async function GET() {
  const session = await auth();
  const userId = parseInt((session?.user as { id?: string })?.id ?? "0");
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const db = getDb();
  const row = db
    .prepare("SELECT * FROM user_profile WHERE user_id = ?")
    .get(userId) as UserProfile | undefined;

  return Response.json(row ?? null);
}

export async function PUT(req: Request) {
  const session = await auth();
  const userId = parseInt((session?.user as { id?: string })?.id ?? "0");
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = await req.json() as Partial<UserProfile>;
  const allowed = [
    "trading_style", "risk_profile", "goals", "fears", "strengths",
    "weaknesses", "best_time_of_day", "worst_emotions", "best_emotions",
    "impulse_patterns", "notes",
  ] as const;

  const db = getDb();
  const existing = db
    .prepare("SELECT user_id FROM user_profile WHERE user_id = ?")
    .get(userId);

  if (!existing) {
    // INSERT
    const cols = allowed.filter(k => body[k] !== undefined);
    if (cols.length === 0) {
      db.prepare("INSERT INTO user_profile (user_id, updated_at) VALUES (?, datetime('now'))").run(userId);
    } else {
      const placeholders = cols.map(() => "?").join(", ");
      const values = cols.map(k => body[k] ?? "");
      db.prepare(
        `INSERT INTO user_profile (user_id, ${cols.join(", ")}, updated_at) VALUES (?, ${placeholders}, datetime('now'))`
      ).run(userId, ...values);
    }
  } else {
    // UPDATE
    const cols = allowed.filter(k => body[k] !== undefined);
    if (cols.length > 0) {
      const sets = cols.map(k => `${k} = ?`).join(", ");
      const values = cols.map(k => body[k] ?? "");
      db.prepare(
        `UPDATE user_profile SET ${sets}, updated_at = datetime('now') WHERE user_id = ?`
      ).run(...values, userId);
    }
  }

  const updated = db
    .prepare("SELECT * FROM user_profile WHERE user_id = ?")
    .get(userId) as UserProfile;

  return Response.json(updated);
}
