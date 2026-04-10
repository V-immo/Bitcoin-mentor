import { auth } from "@/auth";
import { getDb } from "@/db/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const db = getDb();
  const plan = db.prepare("SELECT * FROM trading_plan WHERE user_id = ?").get(userId) as {
    rules: string; risk_per_trade: number; max_daily_loss: number;
    max_trades_per_day: number; preferred_assets: string;
    entry_rules: string; exit_rules: string; commitments: string;
    created_at: string; updated_at: string;
  } | undefined;

  return Response.json(plan ?? null);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const body = await request.json().catch(() => ({}));
  const {
    rules = "", risk_per_trade = 1, max_daily_loss = 3,
    max_trades_per_day = 3, preferred_assets = "",
    entry_rules = "", exit_rules = "", commitments = "",
  } = body;

  const db = getDb();
  const existing = db.prepare("SELECT id FROM trading_plan WHERE user_id = ?").get(userId);

  if (existing) {
    db.prepare(`
      UPDATE trading_plan SET
        rules = ?, risk_per_trade = ?, max_daily_loss = ?,
        max_trades_per_day = ?, preferred_assets = ?,
        entry_rules = ?, exit_rules = ?, commitments = ?,
        updated_at = datetime('now')
      WHERE user_id = ?
    `).run(rules, risk_per_trade, max_daily_loss, max_trades_per_day,
           preferred_assets, entry_rules, exit_rules, commitments, userId);
  } else {
    db.prepare(`
      INSERT INTO trading_plan
        (user_id, rules, risk_per_trade, max_daily_loss, max_trades_per_day,
         preferred_assets, entry_rules, exit_rules, commitments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, rules, risk_per_trade, max_daily_loss, max_trades_per_day,
           preferred_assets, entry_rules, exit_rules, commitments);
  }

  return Response.json({ ok: true });
}
