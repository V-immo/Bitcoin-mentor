import { getYahooNews } from "@/lib/yahoo";

export type NewsItem = { title: string; link: string; publisher: string; published: number };

const CRYPTO_FEEDS: Record<string, { url: string; publisher: string }[]> = {
  BTC: [
    { url: "https://cointelegraph.com/rss/tag/bitcoin",     publisher: "CoinTelegraph" },
    { url: "https://feeds.feedburner.com/CoinDesk",         publisher: "CoinDesk" },
    { url: "https://bitcoinmagazine.com/.rss/full/",         publisher: "Bitcoin Magazine" },
  ],
  ETH: [
    { url: "https://cointelegraph.com/rss/tag/ethereum",    publisher: "CoinTelegraph" },
    { url: "https://feeds.feedburner.com/CoinDesk",         publisher: "CoinDesk" },
  ],
  SOL: [
    { url: "https://cointelegraph.com/rss/tag/solana",      publisher: "CoinTelegraph" },
    { url: "https://feeds.feedburner.com/CoinDesk",         publisher: "CoinDesk" },
  ],
  XRP: [
    { url: "https://cointelegraph.com/rss/tag/ripple",      publisher: "CoinTelegraph" },
    { url: "https://feeds.feedburner.com/CoinDesk",         publisher: "CoinDesk" },
  ],
  DEFAULT: [
    { url: "https://cointelegraph.com/rss",                 publisher: "CoinTelegraph" },
    { url: "https://feeds.feedburner.com/CoinDesk",         publisher: "CoinDesk" },
    { url: "https://decrypt.co/feed",                       publisher: "Decrypt" },
  ],
};

const CRYPTO_TICKERS: Record<string, string> = {
  BTCUSDT: "BTC", ETHUSDT: "ETH", SOLUSDT: "SOL", BNBUSDT: "BNB",
  XRPUSDT: "XRP", ADAUSDT: "DEFAULT", DOTUSDT: "DEFAULT",
};

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
      const title   = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) ?? [])[1]?.trim();
      const link    = (block.match(/<link>([^<]+)<\/link>/) ?? block.match(/<guid[^>]*>([^<]+)<\/guid>/) ?? [])[1]?.trim();
      const pubDate = (block.match(/<pubDate>([^<]+)<\/pubDate>/) ?? [])[1]?.trim();
      if (title && link) {
        items.push({ title, link, publisher, published: pubDate ? new Date(pubDate).getTime() : Date.now() });
      }
    }
    return items;
  } catch {
    return [];
  }
}

// 15-minuten cache per asset
const newsCache = new Map<string, { items: NewsItem[]; ts: number }>();
const NEWS_TTL = 15 * 60 * 1000;

export async function getNewsForAsset(symbol: string, limit = 5): Promise<NewsItem[]> {
  const cached = newsCache.get(symbol);
  if (cached && Date.now() - cached.ts < NEWS_TTL) return cached.items.slice(0, limit);

  const cryptoTicker = CRYPTO_TICKERS[symbol];
  let items: NewsItem[] = [];

  if (cryptoTicker) {
    const feeds = CRYPTO_FEEDS[cryptoTicker] ?? CRYPTO_FEEDS.DEFAULT;
    const results = await Promise.allSettled(feeds.map(f => parseRSS(f.url, f.publisher)));
    const all = results
      .filter(r => r.status === "fulfilled")
      .flatMap(r => (r as PromiseFulfilledResult<NewsItem[]>).value);

    const seen = new Set<string>();
    items = all
      .filter(n => { if (seen.has(n.title)) return false; seen.add(n.title); return true; })
      .sort((a, b) => b.published - a.published)
      .slice(0, 8);
  } else {
    items = await getYahooNews(symbol.replace("USDT", ""), 6);
  }

  // Fallback op Yahoo
  if (items.length === 0) {
    items = await getYahooNews(symbol.replace("USDT", ""), 6);
  }

  // Fallback op algemeen crypto nieuws
  if (items.length === 0 && cryptoTicker) {
    const results = await Promise.allSettled(CRYPTO_FEEDS.DEFAULT.map(f => parseRSS(f.url, f.publisher)));
    const all = results
      .filter(r => r.status === "fulfilled")
      .flatMap(r => (r as PromiseFulfilledResult<NewsItem[]>).value);
    const seen = new Set<string>();
    items = all
      .filter(n => { if (seen.has(n.title)) return false; seen.add(n.title); return true; })
      .sort((a, b) => b.published - a.published)
      .slice(0, 8);
  }

  newsCache.set(symbol, { items, ts: Date.now() });
  return items.slice(0, limit);
}

export function formatNewsForMarcus(items: NewsItem[]): string {
  if (items.length === 0) return "";
  const lines = items.map(n => {
    const ageMin = Math.round((Date.now() - n.published) / 60000);
    const age = ageMin < 60
      ? `${ageMin}m geleden`
      : ageMin < 1440
        ? `${Math.floor(ageMin / 60)}u geleden`
        : `${Math.floor(ageMin / 1440)}d geleden`;
    return `• ${n.title} (${n.publisher}, ${age})`;
  });
  return lines.join("\n");
}

export { CRYPTO_TICKERS, CRYPTO_FEEDS };
