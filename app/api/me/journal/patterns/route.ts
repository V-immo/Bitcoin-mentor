import { auth } from "@/auth";
import { getDb } from "@/db/db";
import Anthropic from "@anthropic-ai/sdk";

const EMOTIONS: Record<number, string> = { 1: "😨 Angstig", 2: "😟 Onzeker", 3: "😐 Neutraal", 4: "😊 Goed", 5: "🔥 Top" };

// Rate limit: max 5x per uur per user
const rateMap = new Map<string, { count: number; resetAt: number }>();
function checkRate(key: string): boolean {
  const now = Date.now();
  const e = rateMap.get(key);
  if (!e || now > e.resetAt) { rateMap.set(key, { count: 1, resetAt: now + 3_600_000 }); return true; }
  if (e.count >= 5) return false;
  e.count++;
  return true;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  if (!checkRate(String(userId))) {
    return Response.json({ error: "Te veel verzoeken, wacht even." }, { status: 429 });
  }

  const db = getDb();

  // Laatste 60 dagen journal
  const entries = db.prepare(`
    SELECT date, note, emotion FROM trade_journal
    WHERE user_id = ? AND date >= date('now', '-60 days')
    ORDER BY date DESC
  `).all(userId) as { date: string; note: string | null; emotion: number }[];

  // Trades uit paper_trading (met emotie in history)
  const papers = db.prepare(
    "SELECT asset, history FROM paper_trading WHERE user_id = ?"
  ).all(userId) as { asset: string; history: string }[];

  // Bouw per-dag stats
  type DayStats = {
    pnl: number; count: number; assets: string[];
    emotions: number[]; wins: number; losses: number;
  };
  const byDate: Record<string, DayStats> = {};
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60);

  for (const paper of papers) {
    try {
      const history = JSON.parse(paper.history ?? "[]") as {
        timestamp?: number; time?: string; side: string;
        pnl?: number; emotion?: number; asset?: string;
      }[];
      for (const t of history) {
        const ts = t.timestamp ? new Date(t.timestamp) : null;
        if (!ts || ts < cutoff) continue;
        const date = ts.toISOString().slice(0, 10);
        if (!byDate[date]) byDate[date] = { pnl: 0, count: 0, assets: [], emotions: [], wins: 0, losses: 0 };
        byDate[date].count++;
        if (t.side === "sell" && typeof t.pnl === "number") {
          byDate[date].pnl += t.pnl;
          if (t.pnl > 0) byDate[date].wins++;
          else byDate[date].losses++;
        }
        if (t.emotion) byDate[date].emotions.push(t.emotion);
        const asset = t.asset ?? paper.asset;
        if (!byDate[date].assets.includes(asset)) byDate[date].assets.push(asset);
      }
    } catch { /* ignore */ }
  }

  // Heb ik genoeg data?
  const tradeDays = Object.keys(byDate).length;
  const journalDays = entries.length;

  if (tradeDays < 3 && journalDays < 3) {
    return Response.json({
      analysis: "Ik heb nog niet genoeg data om patronen te herkennen. Trade minimaal 3 dagen en vul je agenda in — dan kan ik je echt helpen.",
      dataPoints: 0,
    });
  }

  // Bouw samenvatting voor Marcus
  const lines: string[] = [];
  lines.push(`TRADING DATA LAATSTE 60 DAGEN (${tradeDays} handelsdagen, ${journalDays} journal entries)\n`);

  // Emotie-correlatie
  const emotionStats: Record<number, { wins: number; losses: number; pnl: number }> = {};
  for (const [date, day] of Object.entries(byDate)) {
    const journalEmotion = entries.find(e => e.date === date)?.emotion;
    const avgTradeEmotion = day.emotions.length > 0
      ? Math.round(day.emotions.reduce((a, b) => a + b, 0) / day.emotions.length)
      : journalEmotion;
    if (!avgTradeEmotion) continue;
    if (!emotionStats[avgTradeEmotion]) emotionStats[avgTradeEmotion] = { wins: 0, losses: 0, pnl: 0 };
    emotionStats[avgTradeEmotion].wins += day.wins;
    emotionStats[avgTradeEmotion].losses += day.losses;
    emotionStats[avgTradeEmotion].pnl += day.pnl;
  }

  if (Object.keys(emotionStats).length > 0) {
    lines.push("EMOTIE vs RESULTAAT:");
    for (const [emo, stats] of Object.entries(emotionStats)) {
      const total = stats.wins + stats.losses;
      const wr = total > 0 ? Math.round((stats.wins / total) * 100) : "?";
      lines.push(`  ${EMOTIONS[Number(emo)] ?? emo}: ${total} trades, ${wr}% win, P&L €${stats.pnl.toFixed(0)}`);
    }
    lines.push("");
  }

  // Dag-van-de-week analyse
  const dowStats: Record<string, { wins: number; losses: number; pnl: number }> = {};
  const dowNames = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
  for (const [date, day] of Object.entries(byDate)) {
    const dow = dowNames[new Date(date + "T12:00:00").getDay()];
    if (!dowStats[dow]) dowStats[dow] = { wins: 0, losses: 0, pnl: 0 };
    dowStats[dow].wins += day.wins;
    dowStats[dow].losses += day.losses;
    dowStats[dow].pnl += day.pnl;
  }
  if (Object.keys(dowStats).length > 1) {
    lines.push("DAG VAN DE WEEK:");
    for (const [dow, s] of Object.entries(dowStats)) {
      lines.push(`  ${dow}: P&L €${s.pnl.toFixed(0)}, ${s.wins}W/${s.losses}L`);
    }
    lines.push("");
  }

  // Recente journal notities
  const withNotes = entries.filter(e => e.note?.trim());
  if (withNotes.length > 0) {
    lines.push("RECENTE NOTITIES:");
    withNotes.slice(0, 8).forEach(e => {
      const emo = EMOTIONS[e.emotion] ?? "";
      lines.push(`  ${e.date} ${emo}: "${e.note}"`);
    });
    lines.push("");
  }

  // Totale performance
  const totalPnl = Object.values(byDate).reduce((s, d) => s + d.pnl, 0);
  const totalWins = Object.values(byDate).reduce((s, d) => s + d.wins, 0);
  const totalLosses = Object.values(byDate).reduce((s, d) => s + d.losses, 0);
  const totalTrades = totalWins + totalLosses;
  lines.push(`TOTAAL: ${totalTrades} gesloten trades, ${totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : "?"}% winrate, P&L €${totalPnl.toFixed(0)}`);

  const dataStr = lines.join("\n");

  // Vraag Marcus om analyse
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const msg = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 600,
    system: `Je bent Marcus, een directe tradingcoach met 15 jaar ervaring.
Analyseer de trading data en geef CONCREET en PERSOONLIJK feedback.
Spreek de trader direct aan met "jij/je". Wees eerlijk, ook als het niet goed gaat.
Gebruik korte paragrafen. Max 4 punten. Geen bullet hell — schrijf als een mens.
Eindig met ÉÉN concrete actie die ze morgen kunnen doen.`,
    messages: [{
      role: "user",
      content: `Analyseer mijn trading data en spot patronen:\n\n${dataStr}\n\nWat zie je? Wat moet ik verbeteren?`,
    }],
  });

  const analysis = (msg.content[0] as { text: string }).text;

  return Response.json({
    analysis,
    dataPoints: tradeDays + journalDays,
    stats: { totalTrades, totalWins, totalLosses, totalPnl, tradeDays },
  });
}
