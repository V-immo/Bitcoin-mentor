import { NextRequest } from "next/server";
import { getYahooNews } from "@/lib/yahoo";

// CryptoPanic free API voor crypto nieuws
async function getCryptoPanicNews(currency: string): Promise<{ title: string; link: string; publisher: string; published: number }[]> {
  try {
    const res = await fetch(
      `https://cryptopanic.com/api/free/v1/posts/?currencies=${currency}&public=true`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).slice(0, 6).map((n: { title: string; url: string; source: { title: string }; published_at: string }) => ({
      title: n.title,
      link: n.url,
      publisher: n.source?.title ?? "CryptoPanic",
      published: new Date(n.published_at).getTime(),
    }));
  } catch {
    return [];
  }
}

const CRYPTO_TICKERS: Record<string, string> = {
  BTCUSDT: "BTC", ETHUSDT: "ETH", SOLUSDT: "SOL", BNBUSDT: "BNB", XRPUSDT: "XRP",
};

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") ?? "BTCUSDT";
  const cryptoTicker = CRYPTO_TICKERS[symbol];

  let news: { title: string; link: string; publisher: string; published: number }[] = [];

  if (cryptoTicker) {
    news = await getCryptoPanicNews(cryptoTicker);
  } else {
    // Stocks & metals: Yahoo Finance search
    news = await getYahooNews(symbol, 6);
  }

  // Fallback als geen nieuws gevonden
  if (news.length === 0) {
    news = await getYahooNews(symbol.replace("USDT", ""), 6);
  }

  return Response.json(news);
}
