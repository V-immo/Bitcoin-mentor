import { auth } from "@/auth";
import { getDb } from "@/db/db";

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const totalUsers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'user'").get() as { c: number }).c;
  const totalAdmins = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number }).c;
  const activeToday = (db
    .prepare("SELECT COUNT(*) as c FROM users WHERE last_login_at >= ?")
    .get(today) as { c: number }).c;

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

  return Response.json({
    totalUsers,
    totalAdmins,
    activeToday,
    totalTrades,
    totalPnl: Math.round(totalPnl * 100) / 100,
    quizToday,
    avgLevel: Math.round(avgLevel * 10) / 10,
  });
}
