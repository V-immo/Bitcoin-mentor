import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const db = getDb();
  const users = db.prepare(`
    SELECT
      u.id, u.username, u.email, u.role, u.start_capital,
      u.created_at, u.last_login_at,
      qp.level, qp.xp, qp.streak,
      (SELECT COUNT(*) FROM paper_trading pt WHERE pt.user_id = u.id) as paper_assets
    FROM users u
    LEFT JOIN quiz_progress qp ON qp.user_id = u.id
    ORDER BY u.created_at DESC
  `).all() as Record<string, unknown>[];

  // Voeg P&L toe per user
  const result = users.map((u) => {
    const paperRows = db
      .prepare("SELECT history FROM paper_trading WHERE user_id = ?")
      .all(u.id) as { history: string }[];
    let totalPnl = 0;
    let totalTrades = 0;
    for (const row of paperRows) {
      try {
        const h = JSON.parse(row.history) as { pnl?: number }[];
        totalTrades += h.length;
        totalPnl += h.reduce((s, t) => s + (t.pnl ?? 0), 0);
      } catch { /* skip */ }
    }
    return {
      ...u,
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalTrades,
    };
  });

  return Response.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { username, password, role = "user", startCapital = 10000 } = body;
  const email = body.email || `${username}@btcmentor.local`;

  if (!username || !password) {
    return Response.json({ error: "username en password zijn verplicht" }, { status: 400 });
  }

  const db = getDb();
  const hash = bcrypt.hashSync(password, 12);

  try {
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, start_capital)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, email, hash, role, startCapital);
    return Response.json({ ok: true, id: result.lastInsertRowid });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Onbekende fout";
    return Response.json({ error: msg }, { status: 400 });
  }
}
