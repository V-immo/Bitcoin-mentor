import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import type { Session } from "next-auth";

function getUserId(session: Session | null): number | null {
  const id = (session?.user as { id?: string })?.id;
  return id ? parseInt(id) : null;
}

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const {
    asset = "BTCUSDT",
    side = "long",
    entryPrice,
    stopLoss,
    target,
    reason = "",
    currentPrice = 0,
  } = body as {
    asset?: string;
    side?: string;
    entryPrice?: number;
    stopLoss?: number;
    target?: number;
    reason?: string;
    currentPrice?: number;
  };

  if (!entryPrice || !stopLoss || !target) {
    return Response.json({ error: "Instap, stop-loss en target zijn verplicht" }, { status: 400 });
  }

  // Bereken R/R en percentages
  const isLong = side === "long" || side === "buy";
  const slPct  = Math.abs(((stopLoss - entryPrice) / entryPrice) * 100).toFixed(2);
  const tpPct  = Math.abs(((target - entryPrice) / entryPrice) * 100).toFixed(2);
  const risk   = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(target - entryPrice);
  const rr     = risk > 0 ? (reward / risk).toFixed(2) : "0";

  // Haal trading mode en marcus_notes op
  let tradingMode = "swing";
  let marcusNotes = "";
  try {
    const db = getDb();
    const settings = db
      .prepare("SELECT trading_mode, marcus_notes FROM settings WHERE user_id = ?")
      .get(userId) as { trading_mode?: string; marcus_notes?: string } | undefined;
    tradingMode = settings?.trading_mode ?? "swing";
    marcusNotes = settings?.marcus_notes ?? "";
  } catch { /* gebruik defaults */ }

  const ticker = asset.replace("USDT", "").replace("EUR", "");

  const prompt = `Je bent Marcus, een directe en eerlijke trading coach. Beoordeel dit trade plan snel en concreet.

TRADE PLAN:
- Asset: ${ticker} (${asset}) | Huidig: $${currentPrice > 0 ? currentPrice.toFixed(2) : "onbekend"}
- Richting: ${isLong ? "LONG (kopen)" : "SHORT (verkopen)"}
- Instapprijs: $${entryPrice}
- Stop-Loss: $${stopLoss} (${isLong ? "-" : "+"}${slPct}%)
- Target: $${target} (${isLong ? "+" : "-"}${tpPct}%)
- Risk/Reward: 1:${rr}
- Reden/Setup: ${reason || "(geen reden opgegeven)"}
- Trading mode: ${tradingMode}
${marcusNotes ? `\nWat ik weet over deze trader:\n${marcusNotes.split("\n").slice(-5).join("\n")}` : ""}

Geef een beoordeling in dit EXACTE formaat (geen inleiding, geen afsluiting):
VERDICT: [GOED / AANPASSEN / NIET_DOEN]
SCORE: [1-10]
STERK: [wat klopt aan dit plan, max 1 zin]
ZWAK: [wat ontbreekt of klopt niet, max 1 zin]
TIP: [één concrete verbetering, max 1 zin]`;

  try {
    const response = await getClient().messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text : "";

    // Parseer gestructureerde output
    const get = (key: string) =>
      raw.match(new RegExp(`${key}:\\s*(.+)`))?.[1]?.trim() ?? "";

    const verdictRaw = get("VERDICT").toUpperCase();
    const verdict =
      verdictRaw.includes("GOED") ? "GOED" :
      verdictRaw.includes("AANPASSEN") ? "AANPASSEN" :
      verdictRaw.includes("NIET") ? "NIET_DOEN" : "AANPASSEN";

    const scoreRaw = parseInt(get("SCORE")) || 5;
    const score = Math.min(10, Math.max(1, scoreRaw));

    return Response.json({
      verdict,
      score,
      rr,
      slPct,
      tpPct,
      sterk:  get("STERK")  || "—",
      zwak:   get("ZWAK")   || "—",
      tip:    get("TIP")    || "—",
      raw,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return Response.json({ error: `Marcus kon het plan niet beoordelen: ${msg}` }, { status: 500 });
  }
}
