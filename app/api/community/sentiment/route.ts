import { getDb } from "@/db/db";

export async function GET() {
  try {
    const db = getDb();
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);

    // Open posities (wie is nu long)
    const openRows = db.prepare(
      "SELECT asset, position FROM paper_trading WHERE position IS NOT NULL AND position != 'null'"
    ).all() as { asset: string; position: string }[];

    let openLongs = 0;
    const openAssets: Record<string, number> = {};

    for (const row of openRows) {
      try {
        const pos = JSON.parse(row.position) as { side?: string };
        if (pos?.side === "long" || !pos?.side) {
          openLongs++;
          const ticker = row.asset.replace("USDT", "");
          openAssets[ticker] = (openAssets[ticker] ?? 0) + 1;
        }
      } catch { /* ignore */ }
    }

    // Recente trades (24u) — buys vs sells
    const allHistory = db.prepare(
      "SELECT asset, history FROM paper_trading"
    ).all() as { asset: string; history: string }[];

    let recentBuys = 0;
    let recentSells = 0;
    const recentBuyAssets: Record<string, number> = {};

    for (const row of allHistory) {
      try {
        const hist = JSON.parse(row.history ?? "[]") as { side?: string; timestamp?: number }[];
        const ticker = row.asset.replace("USDT", "");
        for (const t of hist) {
          if (!t.timestamp) continue;
          const date = new Date(t.timestamp).toISOString().slice(0, 10);
          if (date < cutoff) continue;
          if (t.side === "buy") {
            recentBuys++;
            recentBuyAssets[ticker] = (recentBuyAssets[ticker] ?? 0) + 1;
          } else if (t.side === "sell") {
            recentSells++;
          }
        }
      } catch { /* ignore */ }
    }

    const totalOpen = openRows.length;
    const bullishPct = totalOpen > 0 ? Math.round((openLongs / totalOpen) * 100) : 50;

    // Top 3 meest gekochte assets
    const hotAssets = Object.entries(recentBuyAssets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([asset, count]) => ({ asset, count }));

    // Open positie asset verdeling
    const openAssetList = Object.entries(openAssets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([asset, count]) => ({ asset, count }));

    return Response.json({
      bullishPct,
      openLongs,
      totalOpen,
      recentBuys,
      recentSells,
      hotAssets,
      openAssets: openAssetList,
      activeTraders: totalOpen,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
