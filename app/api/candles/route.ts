import { NextRequest } from "next/server";
import { getCandles } from "@/lib/market";
import { getFinnhubCandles } from "@/lib/finnhub";
import { isFinnhubAsset, getFinnhubSymbol } from "@/lib/assets";

// Binance limit per interval
const BINANCE_LIMIT: Record<string, number> = {
  "1m": 500, "5m": 500, "15m": 500, "1h": 500, "4h": 500, "1d": 500,
};

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") ?? "BTCUSDT";
  const interval = request.nextUrl.searchParams.get("interval") ?? "1d";

  try {
    if (isFinnhubAsset(symbol)) {
      const finnhubSymbol = getFinnhubSymbol(symbol);
      const candles = await getFinnhubCandles(finnhubSymbol, interval);
      return Response.json(candles);
    } else {
      const limit = BINANCE_LIMIT[interval] ?? 500;
      const candles = await getCandles(
        interval as "1m" | "5m" | "15m" | "1h" | "4h" | "1d",
        limit,
        symbol
      );
      return Response.json(candles);
    }
  } catch {
    return Response.json([]);
  }
}
