import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
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
    .prepare("SELECT id FROM paper_trading WHERE user_id = ? AND asset = ?")
    .get(userId, asset);

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
    JSON.stringify(body.history ?? []),
    body.startingBalance ?? 10000,
    userId,
    asset
  );

  return Response.json({ ok: true });
}
