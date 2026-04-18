import { auth } from "@/auth";
import { getDb } from "@/db/db";

type FriendRow = { id: number; username: string; login_streak: number; last_streak_date: string | null };

function normPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const rows = db.prepare(`
    SELECT u.id, u.username, u.login_streak, u.last_streak_date
    FROM friendships f
    JOIN users u ON (
      CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END = u.id
    )
    WHERE f.user_a = ? OR f.user_b = ?
    ORDER BY u.login_streak DESC
  `).all(userId, userId, userId) as FriendRow[];

  // Eigen streak meesturen voor vergelijking
  const me = db.prepare("SELECT login_streak, username FROM users WHERE id = ?")
    .get(userId) as { login_streak: number; username: string } | undefined;
  const myStreak = me?.login_streak ?? 0;
  const myUsername = me?.username ?? "Jij";

  // Welke vrienden liggen voor (hogere streak dan jij)?
  const friendsAhead = rows.filter(r => (r.login_streak ?? 0) > myStreak);

  return Response.json({
    myStreak,
    myUsername,
    friendsAhead: friendsAhead.length,
    friends: rows.map(r => ({
      id: r.id,
      username: r.username,
      streak: r.login_streak ?? 0,
      activeToday: r.last_streak_date === today,
      isAhead: (r.login_streak ?? 0) > myStreak,
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const body = await request.json().catch(() => ({})) as { token?: string };

  if (!body.token) return Response.json({ error: "Token vereist" }, { status: 400 });

  let targetId: number;
  try {
    targetId = parseInt(Buffer.from(body.token, "base64url").toString("utf8"));
    if (isNaN(targetId) || targetId <= 0) throw new Error("Invalid");
  } catch {
    return Response.json({ error: "Ongeldig token" }, { status: 400 });
  }

  if (targetId === userId) return Response.json({ error: "Je kunt jezelf niet toevoegen" }, { status: 400 });

  const db = getDb();

  const target = db.prepare("SELECT id, username FROM users WHERE id = ?").get(targetId) as { id: number; username: string } | undefined;
  if (!target) return Response.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  const [a, b] = normPair(userId, targetId);

  const existing = db.prepare("SELECT id FROM friendships WHERE user_a = ? AND user_b = ?").get(a, b);
  if (existing) return Response.json({ ok: true, alreadyFriends: true, username: target.username });

  db.prepare("INSERT INTO friendships (user_a, user_b) VALUES (?, ?)").run(a, b);
  return Response.json({ ok: true, username: target.username });
}
