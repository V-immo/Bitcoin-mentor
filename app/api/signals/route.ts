import { getDb } from "@/db/db";
import { sharedScanCache } from "@/lib/scan-cache";

export async function GET() {
  try {
    const db = getDb();

    // Laatste 20 signals (open eerst, dan recent gesloten)
    const signals = db.prepare(`
      SELECT id, asset, symbol, direction, entry_price, stop_loss, target,
             rsi, score, trend, status, close_price, created_at, closed_at
      FROM marcus_signals
      ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 20
    `).all() as {
      id: number; asset: string; symbol: string; direction: string;
      entry_price: number; stop_loss: number; target: number;
      rsi: number; score: number; trend: string; status: string;
      close_price: number | null; created_at: string; closed_at: string | null;
    }[];

    // Voeg live prijs toe aan open signals
    const enriched = signals.map(s => {
      const cached = sharedScanCache.data?.find(c => c.symbol === s.symbol);
      const currentPrice = cached?.price ?? null;
      const pnlPct = currentPrice && s.status === "open"
        ? parseFloat((((currentPrice - s.entry_price) / s.entry_price) * 100).toFixed(2))
        : null;
      return { ...s, currentPrice, pnlPct };
    });

    return Response.json({ signals: enriched });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
