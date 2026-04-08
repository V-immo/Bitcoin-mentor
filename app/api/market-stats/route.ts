import { getCachedFearGreed, getCachedGlobalMetrics } from "@/lib/market-poller";
import { sharedScanCache } from "@/lib/scan-cache";

export async function GET() {
  const [fearGreed, globalMetrics] = await Promise.all([
    getCachedFearGreed(),
    getCachedGlobalMetrics(),
  ]);

  // Haal BTC prijs en markt stats uit gedeelde scan cache
  const scan = sharedScanCache.data ?? [];
  const btc = scan.find(a => a.symbol === "BTCUSDT" || a.ticker === "BTC");
  const counts = { green: 0, yellow: 0, red: 0 };
  for (const a of scan) counts[a.color]++;

  return Response.json({
    fearGreed,
    globalMetrics,
    btcPrice: btc?.price ?? null,
    btcChange: btc?.change24h ?? null,
    counts,
    scanTs: sharedScanCache.ts,
  });
}
