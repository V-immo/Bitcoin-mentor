import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import type { Session } from "next-auth";

function getUserId(session: Session | null): number | null {
  const id = (session?.user as { id?: string })?.id;
  return id ? parseInt(id) : null;
}

function getOrCreateSettings(userId: number) {
  const db = getDb();
  // Haal startkapitaal op uit users tabel (door admin ingesteld)
  const user = db.prepare("SELECT start_capital FROM users WHERE id = ?").get(userId) as
    | { start_capital: number }
    | undefined;
  const startCapital = user?.start_capital ?? 10000;

  let row = db
    .prepare("SELECT * FROM settings WHERE user_id = ?")
    .get(userId) as Record<string, unknown> | undefined;

  if (!row) {
    db.prepare(`
      INSERT INTO settings (user_id, trading_mode, risk_level, start_capital, preferred_assets, ai_language)
      VALUES (?, 'swing', 'medium', ?, '["BTCUSDT","ETHUSDT"]', 'nl')
    `).run(userId, startCapital);
    row = db.prepare("SELECT * FROM settings WHERE user_id = ?").get(userId) as Record<string, unknown>;
  }

  const hasBitvavo = !!(row.bitvavo_api_key as string | undefined);
  const hasBybit   = !!(row.bybit_api_key as string | undefined);

  return {
    tradingMode: row.trading_mode as string,
    riskLevel: row.risk_level as string,
    startCapital: startCapital, // altijd uit users tabel
    preferredAssets: JSON.parse(row.preferred_assets as string) as string[],
    aiLanguage: row.ai_language as string,
    bitvavoConnected: hasBitvavo,
    bybitConnected: hasBybit,
    goal: (row.goal as number | undefined) ?? 0,
    preferredCurrency: (row.preferred_currency as string | undefined) ?? "EUR",
  };
}

export async function GET() {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const settings = getOrCreateSettings(userId);
  return Response.json(settings);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const db = getDb();

  // Zorg dat rij bestaat
  getOrCreateSettings(userId);

  // Bybit sleutels opslaan indien meegestuurd
  if (body.bybitApiKey !== undefined && body.bybitApiSecret !== undefined) {
    db.prepare(`
      UPDATE settings SET
        bybit_api_key = ?,
        bybit_api_secret = ?,
        updated_at = datetime('now')
      WHERE user_id = ?
    `).run(
      body.bybitApiKey ?? "",
      body.bybitApiSecret ?? "",
      userId
    );
    return Response.json({ ok: true });
  }

  // Bitvavo sleutels opslaan indien meegestuurd (vóór goal check — goal zit altijd in settings spread)
  if (body.bitvavoApiKey !== undefined && body.bitvavoApiSecret !== undefined) {
    try {
      db.prepare(`
        UPDATE settings SET
          bitvavo_api_key = ?,
          bitvavo_api_secret = ?,
          updated_at = datetime('now')
        WHERE user_id = ?
      `).run(
        body.bitvavoApiKey ?? "",
        body.bitvavoApiSecret ?? "",
        userId
      );
      return Response.json({ ok: true });
    } catch {
      return Response.json({ error: "Bitvavo kolommen ontbreken, voer db/migrate-bitvavo.js uit" }, { status: 500 });
    }
  }

  // Doel opslaan indien expliciet meegestuurd (alleen als er geen tradingMode of andere settings bij zitten)
  if (typeof body.goal === "number" && body.tradingMode === undefined && body.bitvavoApiKey === undefined && body.testnetKey === undefined) {
    try {
      db.prepare("UPDATE settings SET goal = ?, updated_at = datetime('now') WHERE user_id = ?").run(body.goal, userId);
      return Response.json({ ok: true });
    } catch {
      return Response.json({ error: "Goal kolom ontbreekt, voer db/migrate-goal.js uit" }, { status: 500 });
    }
  }

  // Binance Testnet sleutels opslaan indien meegestuurd
  if (body.testnetKey !== undefined && body.testnetSecret !== undefined) {
    try {
      db.prepare(`
        UPDATE settings SET
          binance_testnet_key = ?,
          binance_testnet_secret = ?,
          updated_at = datetime('now')
        WHERE user_id = ?
      `).run(body.testnetKey ?? "", body.testnetSecret ?? "", userId);
      return Response.json({ ok: true });
    } catch {
      return Response.json({ error: "Testnet kolommen ontbreken, voer db/migrate-testnet.js uit" }, { status: 500 });
    }
  }

  // Valuta voorkeur opslaan (apart endpoint, om conflicts te vermijden)
  if (body.preferredCurrency !== undefined && Object.keys(body).length === 1) {
    try {
      db.prepare("UPDATE settings SET preferred_currency = ?, updated_at = datetime('now') WHERE user_id = ?")
        .run(body.preferredCurrency === "USD" ? "USD" : "EUR", userId);
      return Response.json({ ok: true });
    } catch {
      return Response.json({ error: "preferred_currency kolom ontbreekt, voer db/migrate-currency.js uit" }, { status: 500 });
    }
  }

  // Haal huidige waarden op zodat we alleen meegestuurde velden overschrijven
  const current = db.prepare("SELECT * FROM settings WHERE user_id = ?").get(userId) as Record<string, unknown> | undefined;

  db.prepare(`
    UPDATE settings SET
      trading_mode = ?,
      risk_level = ?,
      preferred_assets = ?,
      ai_language = ?,
      preferred_currency = ?,
      updated_at = datetime('now')
    WHERE user_id = ?
  `).run(
    body.tradingMode ?? current?.trading_mode ?? "swing",
    body.riskLevel ?? current?.risk_level ?? "medium",
    JSON.stringify(body.preferredAssets ?? JSON.parse((current?.preferred_assets as string | undefined) ?? '["BTCUSDT","ETHUSDT"]')),
    body.aiLanguage ?? current?.ai_language ?? "nl",
    body.preferredCurrency ?? current?.preferred_currency ?? "EUR",
    userId
  );

  return Response.json({ ok: true });
}
