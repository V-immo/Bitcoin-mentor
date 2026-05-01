import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import { sharedScanCache } from "@/lib/scan-cache";

export async function GET(request: NextRequest) {
  const includeAnchors = request.nextUrl.searchParams.get("anchors") === "1";

  try {
    const db = getDb();

    // Laatste 50 signals (open eerst, dan recent gesloten)
    const signals = db.prepare(`
      SELECT id, asset, symbol, direction, entry_price, stop_loss, target,
             rsi, score, trend, status, close_price, signal_hash,
             created_at, closed_at
      FROM marcus_signals
      ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 50
    `).all() as {
      id: number; asset: string; symbol: string; direction: string;
      entry_price: number; stop_loss: number; target: number;
      rsi: number; score: number; trend: string; status: string;
      close_price: number | null; signal_hash: string | null;
      created_at: string; closed_at: string | null;
    }[];

    // Voeg live prijs toe aan open signals
    const enriched = signals.map(s => {
      const cached = sharedScanCache.data?.find(c => c.symbol === s.symbol);
      const currentPrice = cached?.price ?? null;
      const pnlPct = currentPrice && s.status === "open"
        ? parseFloat((((currentPrice - s.entry_price) / s.entry_price) * 100).toFixed(2))
        : null;
      const closedPnlPct = s.close_price
        ? parseFloat((((s.close_price - s.entry_price) / s.entry_price) * 100).toFixed(2))
        : null;
      return { ...s, currentPrice, pnlPct, closedPnlPct };
    });

    // Stats
    const all = db.prepare("SELECT status FROM marcus_signals").all() as { status: string }[];
    const totalSignals = all.length;
    const hitTarget = all.filter(s => s.status === "hit_target").length;
    const hitStop   = all.filter(s => s.status === "hit_stop").length;
    const winRate   = totalSignals > 0 ? Math.round((hitTarget / (hitTarget + hitStop || 1)) * 100) : 0;

    // Anchor log
    let anchors: unknown[] = [];
    if (includeAnchors) {
      anchors = db.prepare(`
        SELECT id, merkle_root, signal_ids, tx_hash, chain, created_at
        FROM signal_anchor_log ORDER BY created_at DESC LIMIT 10
      `).all();
    }

    return Response.json({
      signals: enriched,
      stats: { totalSignals, hitTarget, hitStop, winRate },
      anchors,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
