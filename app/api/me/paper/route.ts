import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { awardSats, getTodayTradeRewardCount, REWARD_AMOUNTS } from "@/lib/rewards";
import type { Session } from "next-auth";

function getUserId(session: Session | null): number | null {
  const id = (session?.user as { id?: string })?.id;
  return id ? parseInt(id) : null;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const asset = request.nextUrl.searchParams.get("asset") ?? "BTCUSDT";
  const db = getDb();

  // Haal startkapitaal op uit users tabel
  const user = db
    .prepare("SELECT start_capital FROM users WHERE id = ?")
    .get(userId) as { start_capital: number } | undefined;
  const startCapital = user?.start_capital ?? 10000;

  let row = db
    .prepare("SELECT * FROM paper_trading WHERE user_id = ? AND asset = ?")
    .get(userId, asset) as Record<string, unknown> | undefined;

  if (!row) {
    // Maak nieuw paper account aan met admin-ingesteld startkapitaal
    db.prepare(`
      INSERT INTO paper_trading (user_id, asset, cash, position, history, starting_balance)
      VALUES (?, ?, ?, NULL, '[]', ?)
    `).run(userId, asset, startCapital, startCapital);
    row = db
      .prepare("SELECT * FROM paper_trading WHERE user_id = ? AND asset = ?")
      .get(userId, asset) as Record<string, unknown>;
  }

  return Response.json({
    startingBalance: row.starting_balance as number,
    cash: row.cash as number,
    position: row.position ? JSON.parse(row.position as string) : null,
    history: JSON.parse((row.history as string) ?? "[]"),
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const asset = request.nextUrl.searchParams.get("asset") ?? "BTCUSDT";
  const body = await request.json().catch(() => ({}));
  const db = getDb();

  // Zorg dat rij bestaat
  const existing = db
    .prepare("SELECT id, history FROM paper_trading WHERE user_id = ? AND asset = ?")
    .get(userId, asset) as { id: number; history: string } | undefined;

  if (!existing) {
    const user = db
      .prepare("SELECT start_capital FROM users WHERE id = ?")
      .get(userId) as { start_capital: number } | undefined;
    const startCapital = user?.start_capital ?? 10000;
    db.prepare(`
      INSERT INTO paper_trading (user_id, asset, cash, position, history, starting_balance)
      VALUES (?, ?, ?, NULL, '[]', ?)
    `).run(userId, asset, startCapital, startCapital);
  }

  // ── Learn-to-Earn: detecteer nieuwe winstgevende sell ───────────────────
  let rewardSats = 0;
  type TradeEntry = { side?: string; pnl?: number; timestamp?: number; entryPrice?: number };
  const oldHistory: TradeEntry[] = existing ? JSON.parse(existing.history || "[]") : [];
  const newHistory: TradeEntry[] = body.history ?? [];
  const oldSells = oldHistory.filter(t => (t.side === "sell" || t.side === "SELL") && typeof t.pnl === "number");
  const newSells = newHistory.filter(t => (t.side === "sell" || t.side === "SELL") && typeof t.pnl === "number");

  if (newSells.length > oldSells.length) {
    // Nieuwe sell-trades ontdekken
    const addedCount = newSells.length - oldSells.length;
    const latestSells = newSells.slice(0, addedCount);
    const todayCount = getTodayTradeRewardCount(userId);
    let todaySoFar = todayCount;

    for (const trade of latestSells) {
      if (todaySoFar >= 3) break; // max 3 trade-rewards/dag
      if ((trade.pnl ?? 0) > 0) {
        // Bereken P&L percentage (ruw: pnl / entry * qty — vereenvoudigd: kijk naar pnl abs)
        const isExcellent = (trade.pnl ?? 0) >= 200; // ≥$200 winst op $10k kapitaal ≈ 2%
        if (isExcellent && todaySoFar === 0) {
          awardSats(userId, REWARD_AMOUNTS.TRADE_EXCELLENT, "trade_excellent", { pnl: trade.pnl, asset });
          rewardSats += REWARD_AMOUNTS.TRADE_EXCELLENT;
        } else {
          awardSats(userId, REWARD_AMOUNTS.TRADE_PROFIT, "trade_profit", { pnl: trade.pnl, asset });
          rewardSats += REWARD_AMOUNTS.TRADE_PROFIT;
        }
        todaySoFar++;
      }
    }
  }

  db.prepare(`
    UPDATE paper_trading SET
      cash = ?,
      position = ?,
      history = ?,
      starting_balance = ?,
      updated_at = datetime('now')
    WHERE user_id = ? AND asset = ?
  `).run(
    body.cash ?? 0,
    body.position ? JSON.stringify(body.position) : null,
    JSON.stringify(newHistory),
    body.startingBalance ?? 10000,
    userId,
    asset
  );

  return Response.json({ ok: true, rewardSats });
}
