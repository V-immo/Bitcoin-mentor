import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "invalid body" }, { status: 400 });

  const { asset, side, amount, price, dailyTrades } = body as {
    asset: string; side: "buy" | "sell"; amount: number;
    price: number; dailyTrades?: number;
  };

  const db = getDb();
  const plan = db.prepare("SELECT * FROM trading_plan WHERE user_id = ?").get(userId) as {
    rules?: string; risk_per_trade?: number; max_daily_loss?: number;
    max_trades_per_day?: number; preferred_assets?: string;
    entry_rules?: string; exit_rules?: string;
  } | undefined;

  if (!plan) {
    return Response.json({
      ok: false,
      verdict: "neutral",
      message: "Geen handelsplan gevonden. Stel eerst een plan in via je profiel.",
    });
  }

  const planText = [
    plan.rules ? `Regels: ${plan.rules}` : "",
    plan.entry_rules ? `Instapregels: ${plan.entry_rules}` : "",
    plan.exit_rules ? `Uitstapregels: ${plan.exit_rules}` : "",
    plan.preferred_assets ? `Voorkeur assets: ${plan.preferred_assets}` : "",
    plan.risk_per_trade ? `Max risico per trade: ${plan.risk_per_trade}%` : "",
    plan.max_daily_loss ? `Max dagelijks verlies: ${plan.max_daily_loss}%` : "",
    plan.max_trades_per_day ? `Max trades per dag: ${plan.max_trades_per_day}` : "",
  ].filter(Boolean).join("\n");

  const tradeInfo = `Trade: ${side === "buy" ? "KOPEN" : "VERKOPEN"} ${asset} voor €${amount} @ ${price}. Trades vandaag: ${dailyTrades ?? 0}.`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      messages: [{
        role: "user",
        content: `Je bent Marcus, een trading mentor. Beoordeel in 1-2 zinnen of deze trade het handelsplan volgt. Geef een POSITIEF, WAARSCHUWING of NEGATIEF verdict. Begin je antwoord met "✅", "⚠️" of "❌".

Handelsplan:
${planText}

${tradeInfo}`,
      }],
    });

    const text = ((msg.content[0] as { text: string }).text ?? "").trim();
    const verdict = text.startsWith("✅") ? "ok" : text.startsWith("❌") ? "bad" : "warn";

    return Response.json({ ok: true, verdict, message: text });
  } catch {
    return Response.json({ ok: false, verdict: "neutral", message: null });
  }
}
