import { NextRequest } from "next/server";
import { getFinnhubQuote } from "@/lib/finnhub";
import { isFinnhubAsset, getFinnhubSymbol } from "@/lib/assets";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") ?? "";
  if (!symbol || !isFinnhubAsset(symbol)) return Response.json({ price: 0, change24h: 0 });
  try {
    const finnhubSymbol = getFinnhubSymbol(symbol);
    const { price, change24h } = await getFinnhubQuote(finnhubSymbol);
    return Response.json({ price, change24h });
  } catch {
    return Response.json({ price: 0, change24h: 0 });
  }
}
