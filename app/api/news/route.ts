import { NextRequest } from "next/server";
import { getNewsForAsset } from "@/lib/news";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") ?? "BTCUSDT";
  const news = await getNewsForAsset(symbol, 8);
  return Response.json(news);
}
