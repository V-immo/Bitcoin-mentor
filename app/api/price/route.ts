import { NextRequest } from "next/server";
import { getFinnhubQuote } from "@/lib/finnhub";
import { getAssetDef, getFinnhubSymbol } from "@/lib/assets";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") ?? "";
  if (!symbol) return Response.json({ price: 0, change24h: 0 });

  const asset = getAssetDef(symbol);
  if (!asset) return Response.json({ price: 0, change24h: 0 });

  try {
    if (asset.source === "binance") {
      // Binance REST — crypto realtime
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, { next: { revalidate: 0 } });
      if (!res.ok) return Response.json({ price: 0, change24h: 0 });
      const d = await res.json() as { lastPrice: string; priceChangePercent: string };
      return Response.json({ price: parseFloat(d.lastPrice), change24h: parseFloat(d.priceChangePercent) });
    }

    // Finnhub — aandelen, metalen, ETFs
    const finnhubSymbol = getFinnhubSymbol(symbol);
    const { price, change24h } = await getFinnhubQuote(finnhubSymbol);
    return Response.json({ price, change24h });
  } catch {
    return Response.json({ price: 0, change24h: 0 });
  }
}
