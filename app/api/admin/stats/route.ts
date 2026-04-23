import { auth } from "@/auth";
import { getDb } from "@/db/db";

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  const n = (sql: string, ...params: unknown[]) =>
    ((db.prepare(sql).get(...params) as { c: number } | undefined)?.c ?? 0);

  const totalUsers  = n("SELECT COUNT(*) as c FROM users WHERE role = 'user'");
  const totalAdmins = n("SELECT COUNT(*) as c FROM users WHERE role = 'admin'");
  const activeToday = n("SELECT COUNT(*) as c FROM users WHERE last_login_at >= ?", today);
  const newThisWeek = n("SELECT COUNT(*) as c FROM users WHERE role = 'user' AND created_at >= ?", weekAgo);
  const inactive7d  = n("SELECT COUNT(*) as c FROM users WHERE role = 'user' AND (last_login_at IS NULL OR last_login_at < ?)", weekAgo);

  // Totaal aantal paper trades (history items across all users)
  const paperRows = db.prepare("SELECT history FROM paper_trading").all() as { history: string }[];
  let totalTrades = 0;
  let totalPnl = 0;
  for (const row of paperRows) {
    try {
      const h = JSON.parse(row.history) as { pnl?: number }[];
      totalTrades += h.length;
      totalPnl += h.reduce((s, t) => s + (t.pnl ?? 0), 0);
    } catch { /* skip */ }
  }

  // Quiz completies vandaag
  const quizToday = (db
    .prepare("SELECT COUNT(*) as c FROM quiz_progress WHERE last_quiz_date = ?")
    .get(today) as { c: number }).c;

  // Gemiddeld quiz level
  const avgLevel = (db
    .prepare("SELECT AVG(level) as avg FROM quiz_progress")
    .get() as { avg: number | null }).avg ?? 0;

  const proUsers = n("SELECT COUNT(*) as c FROM users WHERE is_pro = 1");
  const proActive = n(
    "SELECT COUNT(*) as c FROM users WHERE is_pro = 1 AND (pro_until IS NULL OR pro_until = '' OR pro_until >= ?)",
    today
  );

  return Response.json({
    totalUsers,
    totalAdmins,
    activeToday,
    newThisWeek,
    inactive7d,
    totalTrades,
    totalPnl: Math.round(totalPnl * 100) / 100,
    quizToday,
    avgLevel: Math.round(avgLevel * 10) / 10,
    proUsers,
    proActive,
  });
}
