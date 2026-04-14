import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import Anthropic from "@anthropic-ai/sdk";

// Rate limit voor Marcus reflectievraag
const reflectionRateMap = new Map<string, { count: number; resetAt: number }>();
function checkReflectionRate(key: string): boolean {
  const now = Date.now();
  const e = reflectionRateMap.get(key);
  if (!e || now > e.resetAt) { reflectionRateMap.set(key, { count: 1, resetAt: now + 3_600_000 }); return true; }
  if (e.count >= 20) return false;
  e.count++;
  return true;
}

// GET — haal journal entries op (optioneel: ?month=2025-03)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const month = request.nextUrl.searchParams.get("month"); // bv. "2025-03"
  const db = getDb();

  // Journal entries — nu met nieuwe velden
  const entries = db.prepare(
    month
      ? `SELECT date, note, emotion, what_went_well, what_went_wrong, lessons, tags, marcus_reflection
         FROM trade_journal WHERE user_id = ? AND date LIKE ? ORDER BY date DESC`
      : `SELECT date, note, emotion, what_went_well, what_went_wrong, lessons, tags, marcus_reflection
         FROM trade_journal WHERE user_id = ? ORDER BY date DESC LIMIT 90`
  ).all(userId, ...(month ? [`${month}%`] : [])) as {
    date: string; note: string | null; emotion: number;
    what_went_well: string | null; what_went_wrong: string | null;
    lessons: string | null; tags: string | null;
    marcus_reflection: string | null;
  }[];

  // Trades per dag uit paper_trading history
  const papers = db.prepare(
    "SELECT asset, history FROM paper_trading WHERE user_id = ?"
  ).all(userId) as { asset: string; history: string }[];

  const tradesByDate: Record<string, { pnl: number; count: number; assets: string[] }> = {};

  for (const paper of papers) {
    try {
      const history = JSON.parse(paper.history ?? "[]") as {
        timestamp?: number; pnl?: number; side: string; asset?: string;
      }[];
      for (const trade of history) {
        if (!trade.timestamp) continue;
        const date = new Date(trade.timestamp).toISOString().slice(0, 10);
        if (month && !date.startsWith(month)) continue;
        if (!tradesByDate[date]) tradesByDate[date] = { pnl: 0, count: 0, assets: [] };
        tradesByDate[date].count++;
        if (trade.side === "sell" && typeof trade.pnl === "number") {
          tradesByDate[date].pnl += trade.pnl;
        }
        const asset = trade.asset ?? paper.asset;
        if (!tradesByDate[date].assets.includes(asset)) {
          tradesByDate[date].assets.push(asset);
        }
      }
    } catch { /* ignore */ }
  }

  return Response.json({
    entries: entries.map(e => ({
      ...e,
      tags: (() => { try { return JSON.parse(e.tags ?? "[]"); } catch { return []; } })(),
    })),
    tradesByDate,
  });
}

// PUT — opslaan of updaten van een dagnotitie
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const body = await request.json().catch(() => null);
  if (!body?.date) return Response.json({ error: "date verplicht" }, { status: 400 });

  const db = getDb();

  // Sla op — support voor zowel oude als nieuwe velden
  db.prepare(`
    INSERT INTO trade_journal (user_id, date, note, emotion, what_went_well, what_went_wrong, lessons, tags, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, date) DO UPDATE SET
      note = excluded.note,
      emotion = excluded.emotion,
      what_went_well = excluded.what_went_well,
      what_went_wrong = excluded.what_went_wrong,
      lessons = excluded.lessons,
      tags = excluded.tags,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    userId, body.date,
    body.note ?? null,
    body.emotion ?? 3,
    body.what_went_well ?? null,
    body.what_went_wrong ?? null,
    body.lessons ?? null,
    JSON.stringify(body.tags ?? []),
  );

  // Genereer Marcus reflectievraag als er genoeg inhoud is + nog geen reflectie vandaag
  let marcus_reflection: string | null = null;
  const hasContent = [body.note, body.what_went_well, body.what_went_wrong, body.lessons]
    .some(v => v && String(v).trim().length > 10);

  if (hasContent && process.env.ANTHROPIC_API_KEY && checkReflectionRate(`reflection-${userId}`)) {
    const existing = db.prepare(
      "SELECT marcus_reflection FROM trade_journal WHERE user_id = ? AND date = ?"
    ).get(userId, body.date) as { marcus_reflection: string | null } | undefined;

    if (!existing?.marcus_reflection) {
      try {
        const tradeData = body.tradeSummary ?? "";
        const emotionName = ["", "Angstig", "Onzeker", "Neutraal", "Goed", "Top"][body.emotion ?? 3] ?? "Neutraal";
        const context = [
          body.what_went_well ? `Goed: ${body.what_went_well}` : "",
          body.what_went_wrong ? `Slecht: ${body.what_went_wrong}` : "",
          body.lessons ? `Leerpunten: ${body.lessons}` : "",
          body.note ? `Notitie: ${body.note}` : "",
          body.tags?.length ? `Tags: ${body.tags.join(", ")}` : "",
          tradeData,
          `Emotie: ${emotionName}`,
        ].filter(Boolean).join("\n");

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const msg = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 80,
          system: `Je bent Marcus. Stel ÉÉN scherpe reflectievraag op basis van de journalentry van de trader.
Korte zin. Geen aanhef. Begin direct met de vraag. Doe alsof je de trader kent.
Voorbeelden: "Waarom heb je gewacht tot na het verlies voor deze inzichten?" / "Had je SL eerder kunnen zetten — wat hield je tegen?"`,
          messages: [{ role: "user", content: context }],
        });
        marcus_reflection = (msg.content[0] as { text: string }).text.trim();

        db.prepare(
          "UPDATE trade_journal SET marcus_reflection = ? WHERE user_id = ? AND date = ?"
        ).run(marcus_reflection, userId, body.date);
      } catch { /* geen reflectie als API faalt */ }
    } else {
      marcus_reflection = existing.marcus_reflection;
    }
  }

  return Response.json({ ok: true, marcus_reflection });
}
