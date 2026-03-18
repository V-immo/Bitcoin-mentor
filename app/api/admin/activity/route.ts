import { auth } from "@/auth";
import { getDb } from "@/db/db";

type ActivityEvent = {
  type: "login" | "quiz" | "trade";
  username: string;
  timestamp: string;
  detail: string;
};

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const db = getDb();
  const events: ActivityEvent[] = [];

  // Laatste logins
  try {
    const logins = db
      .prepare(
        `SELECT username, last_login_at
         FROM users
         WHERE last_login_at IS NOT NULL
         ORDER BY last_login_at DESC
         LIMIT 20`
      )
      .all() as { username: string; last_login_at: string }[];

    for (const row of logins) {
      events.push({
        type: "login",
        username: row.username,
        timestamp: row.last_login_at,
        detail: "Ingelogd",
      });
    }
  } catch { /* tabel of kolom bestaat nog niet */ }

  // Quiz completies (uit quiz_progress tabel)
  try {
    const quizRows = db
      .prepare(
        `SELECT u.username, qp.updated_at, qp.level, qp.xp
         FROM quiz_progress qp
         JOIN users u ON u.id = qp.user_id
         ORDER BY qp.updated_at DESC
         LIMIT 20`
      )
      .all() as { username: string; updated_at: string; level: number; xp: number }[];

    for (const row of quizRows) {
      events.push({
        type: "quiz",
        username: row.username,
        timestamp: row.updated_at,
        detail: `Level ${row.level} — ${row.xp} XP`,
      });
    }
  } catch { /* tabel bestaat nog niet */ }

  // Paper trades (recentste per gebruiker via paper_trading.updated_at)
  try {
    const tradeRows = db
      .prepare(
        `SELECT u.username, pt.asset, pt.updated_at, pt.history
         FROM paper_trading pt
         JOIN users u ON u.id = pt.user_id
         ORDER BY pt.updated_at DESC
         LIMIT 20`
      )
      .all() as { username: string; asset: string; updated_at: string; history: string }[];

    for (const row of tradeRows) {
      let tradeCount = 0;
      let lastPnl: number | null = null;
      try {
        const h = JSON.parse(row.history) as { pnl?: number }[];
        tradeCount = h.length;
        if (h.length > 0) lastPnl = h[h.length - 1].pnl ?? null;
      } catch { /* skip */ }

      events.push({
        type: "trade",
        username: row.username,
        timestamp: row.updated_at,
        detail: `${row.asset} — ${tradeCount} trade${tradeCount !== 1 ? "s" : ""}${lastPnl != null ? ` | Laatste P&L: € ${lastPnl.toFixed(2)}` : ""}`,
      });
    }
  } catch { /* tabel bestaat nog niet */ }

  // Sorteer op timestamp desc, neem top 20
  events.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));

  return Response.json(events.slice(0, 20));
}
