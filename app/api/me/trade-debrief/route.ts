import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import Anthropic from "@anthropic-ai/sdk";
import { sharedScanCache } from "@/lib/scan-cache";

// Rate limit: max 20 debriefs per uur (voorkomt misbruik)
const rateMap = new Map<string, { count: number; resetAt: number }>();
function checkRate(key: string): boolean {
  const now = Date.now();
  const e = rateMap.get(key);
  if (!e || now > e.resetAt) { rateMap.set(key, { count: 1, resetAt: now + 3_600_000 }); return true; }
  if (e.count >= 20) return false;
  e.count++;
  return true;
}

function getBtcContext(): string {
  const { data } = sharedScanCache;
  if (!data || data.length === 0) return "";
  const btc = data.find(a => a.ticker === "BTC" || a.symbol === "BTCUSDT");
  if (!btc) return "";
  return `BTC staat op €${btc.price.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}, trend: ${btc.trend}, RSI: ${btc.rsi?.toFixed(0) ?? "?"}.`;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  if (!checkRate(String(userId))) {
    return Response.json({ error: "Rate limit bereikt" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({})) as {
    entry?: number;
    exit?: number;
    side?: "long" | "short";
    pnl?: number;
    asset?: string;
    stopLoss?: number;
    takeProfit?: number;
    reason?: "manual" | "sl" | "tp";
    btcAmount?: number;
  };

  const { entry, exit, side = "long", pnl = 0, asset = "BTC", stopLoss, takeProfit, reason = "manual" } = body;

  if (!entry || !exit) {
    return Response.json({ error: "entry en exit zijn verplicht" }, { status: 400 });
  }

  const client = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

  if (!client) {
    return Response.json({ debrief: "Marcus is momenteel niet beschikbaar. Analyseer zelf: was je stop-loss correct geplaatst?" });
  }

  // Liga-score bijwerken op basis van trade kwaliteit
  try {
    const rrForScore = stopLoss && takeProfit && entry
      ? Math.abs(takeProfit - entry) / Math.abs(entry - stopLoss)
      : null;
    const today = new Date().toISOString().slice(0, 10);
    const weekNum = String(Math.floor(Date.now() / (7 * 86_400_000)));
    let tradeScore = 0;
    if (pnl > 0 && rrForScore !== null && rrForScore >= 2) tradeScore = 30;      // winst + goed R/R
    else if (pnl > 0 && rrForScore !== null && rrForScore >= 1) tradeScore = 15; // winst + ok R/R
    else if (pnl > 0) tradeScore = 8;                                             // winst, geen R/R data
    else if (stopLoss) tradeScore = 5;                                            // verlies maar stop-loss had
    if (tradeScore > 0) {
      const db = getDb();
      const wk = db.prepare("SELECT week_key FROM users WHERE id = ?").get(userId) as { week_key: string } | undefined;
      if (wk?.week_key !== weekNum) {
        db.prepare("UPDATE users SET week_score = 0, week_key = ? WHERE id = ?").run(weekNum, userId);
      }
      db.prepare("UPDATE users SET week_score = week_score + ?, last_streak_date = ? WHERE id = ?").run(tradeScore, today, userId);
    }
  } catch { /* score update niet kritiek */ }

  const pnlStr = pnl >= 0 ? `winst van €${Math.abs(pnl).toFixed(2)}` : `verlies van €${Math.abs(pnl).toFixed(2)}`;
  const slStr = stopLoss ? `Stop-loss: €${stopLoss.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}` : "Geen stop-loss ingesteld";
  const tpStr = takeProfit ? `Take-profit: €${takeProfit.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}` : "Geen take-profit ingesteld";
  const rrRatio = stopLoss && takeProfit && entry
    ? Math.abs(takeProfit - entry) / Math.abs(entry - stopLoss)
    : null;
  const rrStr = rrRatio !== null ? `R/R verhouding: 1:${rrRatio.toFixed(2)}` : "";
  const closedBy = reason === "sl" ? "Stop-loss geraakt." : reason === "tp" ? "Take-profit geraakt." : "Manueel gesloten.";
  const btcCtx = getBtcContext();

  const systemPrompt = `Je bent Marcus, een directe en eerlijke trading coach. Je geeft een korte trade debrief na een paper trade.

Regels:
- Max 4 zinnen. Geen opsomming — vloeiende tekst.
- Spreek de trader direct aan met "je/jij".
- Geen valse bemoediging als de trade slecht was. Eerlijk maar constructief.
- Focus op: (1) was de entry logisch, (2) was de stop-loss correct, (3) één concreet verbeterpunt.
- Als het R/R ratio onder 1:1.5 ligt, benoem dat altijd.
- Als er geen stop-loss was ingesteld, zeg dat dat onaanvaardbaar is.
- Huidige markt: ${btcCtx}`;

  const userMessage = `Trade samenvatting:
- ${side === "long" ? "Long (gekocht)" : "Short (verkocht)"} ${asset} op €${entry.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
- Gesloten op €${exit.toLocaleString("nl-NL", { maximumFractionDigits: 0 })} — ${pnlStr}
- ${closedBy}
- ${slStr}
- ${tpStr}
${rrStr ? `- ${rrStr}` : ""}

Geef mijn debrief.`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    const debrief = (msg.content[0] as { text: string }).text.trim();
    return Response.json({ debrief });
  } catch {
    const fallback = pnl < 0
      ? `Je verloor op deze trade. ${!stopLoss ? "Je had geen stop-loss ingesteld — dat is het eerste wat je moet fixen." : "Analyseer of je entry op het juiste moment was."}`
      : `Winst op deze trade. Maar winst zegt niet alles — controleer of je R/R verhouding klopte voor je inging.`;
    return Response.json({ debrief: fallback });
  }
}
