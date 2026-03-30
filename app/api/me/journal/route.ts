import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";

// GET — haal journal entries op (optioneel: ?month=2025-03)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const month = request.nextUrl.searchParams.get("month"); // bv. "2025-03"
  const db = getDb();

  // Journal entries
  const entries = db.prepare(
    month
      ? "SELECT date, note, emotion FROM trade_journal WHERE user_id = ? AND date LIKE ? ORDER BY date DESC"
      : "SELECT date, note, emotion FROM trade_journal WHERE user_id = ? ORDER BY date DESC LIMIT 90"
  ).all(userId, ...(month ? [`${month}%`] : [])) as { date: string; note: string | null; emotion: number }[];

  // Trades per dag uit paper_trading history
  const papers = db.prepare(
    "SELECT asset, history FROM paper_trading WHERE user_id = ?"
  ).all(userId) as { asset: string; history: string }[];

  const tradesByDate: Record<string, { pnl: number; count: number; assets: string[] }> = {};

  for (const paper of papers) {
    try {
      const history = JSON.parse(paper.history ?? "[]") as { createdAt: string; pnl?: number; side: string }[];
      for (const trade of history) {
        if (!trade.createdAt) continue;
        const date = trade.createdAt.slice(0, 10);
        if (month && !date.startsWith(month)) continue;
        if (!tradesByDate[date]) tradesByDate[date] = { pnl: 0, count: 0, assets: [] };
        tradesByDate[date].count++;
        tradesByDate[date].pnl += trade.pnl ?? 0;
        if (!tradesByDate[date].assets.includes(paper.asset)) {
          tradesByDate[date].assets.push(paper.asset);
        }
      }
    } catch { /* ignore */ }
  }

  return Response.json({ entries, tradesByDate });
}

// PUT — opslaan of updaten van een dagnotitie
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const body = await request.json().catch(() => null);
  if (!body?.date) return Response.json({ error: "date verplicht" }, { status: 400 });

  const db = getDb();
  db.prepare(`
    INSERT INTO trade_journal (user_id, date, note, emotion, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, date) DO UPDATE SET
      note = excluded.note,
      emotion = excluded.emotion,
      updated_at = CURRENT_TIMESTAMP
  `).run(userId, body.date, body.note ?? null, body.emotion ?? 3);

  return Response.json({ ok: true });
}
