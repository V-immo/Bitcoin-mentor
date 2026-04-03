import { NextRequest } from "next/server";
import { getYahooNews } from "@/lib/yahoo";

type NewsItem = { title: string; link: string; publisher: string; published: number };

// RSS feed parser — simpel maar betrouwbaar
async function parseRSS(url: string, publisher: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BitcoinMentor/1.0)" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items: NewsItem[] = [];
    const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 8) {
      const block = match[1];
      const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) ?? [])[1]?.trim();
      const link  = (block.match(/<link>([^<]+)<\/link>/) ?? block.match(/<guid[^>]*>([^<]+)<\/guid>/) ?? [])[1]?.trim();
      const pubDate = (block.match(/<pubDate>([^<]+)<\/pubDate>/) ?? [])[1]?.trim();
      if (title && link) {
        items.push({
          title,
          link,
          publisher,
          published: pubDate ? new Date(pubDate).getTime() : Date.now(),
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

const CRYPTO_FEEDS: Record<string, { url: string; publisher: string }[]> = {
  BTC: [
    { url: "https://cointelegraph.com/rss/tag/bitcoin",    publisher: "CoinTelegraph" },
    { url: "https://feeds.feedburner.com/CoinDesk",        publisher: "CoinDesk" },
  ],
  ETH: [
    { url: "https://cointelegraph.com/rss/tag/ethereum",   publisher: "CoinTelegraph" },
    { url: "https://feeds.feedburner.com/CoinDesk",        publisher: "CoinDesk" },
  ],
  SOL: [
    { url: "https://cointelegraph.com/rss/tag/solana",     publisher: "CoinTelegraph" },
    { url: "https://feeds.feedburner.com/CoinDesk",        publisher: "CoinDesk" },
  ],
  XRP: [
    { url: "https://cointelegraph.com/rss/tag/ripple",     publisher: "CoinTelegraph" },
    { url: "https://feeds.feedburner.com/CoinDesk",        publisher: "CoinDesk" },
  ],
  DEFAULT: [
    { url: "https://cointelegraph.com/rss",                publisher: "CoinTelegraph" },
    { url: "https://feeds.feedburner.com/CoinDesk",        publisher: "CoinDesk" },
  ],
};

const CRYPTO_TICKERS: Record<string, string> = {
  BTCUSDT: "BTC", ETHUSDT: "ETH", SOLUSDT: "SOL", BNBUSDT: "BNB",
  XRPUSDT: "XRP", ADAUSDT: "DEFAULT", DOTUSDT: "DEFAULT",
};

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") ?? "BTCUSDT";
  const cryptoTicker = CRYPTO_TICKERS[symbol];

  let news: NewsItem[] = [];

  if (cryptoTicker) {
    const feeds = CRYPTO_FEEDS[cryptoTicker] ?? CRYPTO_FEEDS.DEFAULT;
    const results = await Promise.allSettled(
      feeds.map(f => parseRSS(f.url, f.publisher))
    );
    const allItems = results
      .filter(r => r.status === "fulfilled")
      .flatMap(r => (r as PromiseFulfilledResult<NewsItem[]>).value);

    // Dedupliceer op titel, sorteer op nieuwst
    const seen = new Set<string>();
    news = allItems
      .filter(n => { if (seen.has(n.title)) return false; seen.add(n.title); return true; })
      .sort((a, b) => b.published - a.published)
      .slice(0, 8);
  } else {
    // Stocks & metals: Yahoo Finance
    news = await getYahooNews(symbol, 6);
  }

  // Fallback als nog steeds leeg
  if (news.length === 0) {
    news = await getYahooNews(symbol.replace("USDT", ""), 6);
  }

  return Response.json(news);
}
