/**
 * /api/sentiment — Bitcoin Mentor Community Sentiment Index
 * Eigen Fear & Greed gebaseerd op gebruikersgedrag (niet externe data).
 * Gecached 30 min, berekend op basis van echte activiteit in de DB.
 */
import { getDb } from "@/db/db";

let cache: { value: number; label: string; ts: number; breakdown: Record<string, number> } | null = null;
const TTL = 30 * 60 * 1000;

function calcSentiment(): { value: number; label: string; breakdown: Record<string, number> } {
  const db = getDb();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // 1. Long/Short ratio in paper trades (laatste 24u)
  type PaperRow = { history: string };
  const papers = db.prepare(
    "SELECT history FROM paper_trading WHERE updated_at >= ?",
  ).all(yesterday) as PaperRow[];

  let longs = 0, shorts = 0;
  for (const row of papers) {
    try {
      const hist = JSON.parse(row.history ?? "[]") as { side?: string; timestamp?: number }[];
      const recent = hist.filter(t => t.timestamp && t.timestamp > Date.now() - 86400000);
      for (const t of recent) {
        if (t.side === "buy") longs++;
        else if (t.side === "sell") shorts++;
      }
    } catch { /* ignore */ }
  }
  const totalTrades = longs + shorts;
  const longRatio = totalTrades > 0 ? longs / totalTrades : 0.5;
  // longRatio 0.7 = greed (70% longs), 0.3 = fear (70% shorts)
  const tradeScore = Math.round(longRatio * 100); // 0–100

  // 2. Gemiddelde emotie vandaag uit trade journal
  type EmoRow = { emotion: number };
  const emoRows = db.prepare(
    "SELECT emotion FROM trade_journal WHERE date >= ?",
  ).all(yesterday) as EmoRow[];
  const avgEmo = emoRows.length > 0
    ? emoRows.reduce((s, r) => s + (r.emotion ?? 3), 0) / emoRows.length
    : 3; // 1–5 schaal, 3 = neutraal
  const emoScore = Math.round(((avgEmo - 1) / 4) * 100); // 0–100

  // 3. Nieuwe vs gesloten posities vandaag (marktactiviteit)
  type PaperCountRow = { count: number };
  const newPositions = (db.prepare(
    "SELECT COUNT(*) as count FROM paper_trading WHERE updated_at >= ? AND position IS NOT NULL",
  ).get(today) as PaperCountRow)?.count ?? 0;
  const closedPositions = (db.prepare(
    "SELECT COUNT(*) as count FROM paper_trading WHERE updated_at >= ? AND position IS NULL",
  ).get(today) as PaperCountRow)?.count ?? 0;
  const activityRatio = (newPositions + closedPositions) > 0
    ? newPositions / (newPositions + closedPositions)
    : 0.5;
  const activityScore = Math.round(activityRatio * 100);

  // 4. Actieve gebruikers vandaag vs gisteren
  type ActiveRow = { count: number };
  const activeToday = (db.prepare(
    "SELECT COUNT(*) as count FROM users WHERE last_streak_date = ?",
  ).get(today) as ActiveRow)?.count ?? 0;
  const activeYesterday = (db.prepare(
    "SELECT COUNT(*) as count FROM users WHERE last_streak_date = ?",
  ).get(yesterday) as ActiveRow)?.count ?? 1;
  const activityTrend = Math.min(100, Math.round((activeToday / Math.max(1, activeYesterday)) * 50));

  // Gewogen gemiddelde
  const value = Math.round(
    tradeScore * 0.40 +
    emoScore   * 0.25 +
    activityScore * 0.20 +
    activityTrend * 0.15,
  );

  const label =
    value >= 80 ? "Extreme Greed" :
    value >= 60 ? "Greed" :
    value >= 40 ? "Neutraal" :
    value >= 20 ? "Fear" :
    "Extreme Fear";

  return {
    value,
    label,
    breakdown: { tradeScore, emoScore, activityScore, activityTrend },
  };
}

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) {
    return Response.json(cache);
  }
  try {
    const result = calcSentiment();
    cache = { ...result, ts: Date.now() };
    return Response.json(cache);
  } catch {
    return Response.json({ value: 50, label: "Neutraal", breakdown: {} });
  }
}
