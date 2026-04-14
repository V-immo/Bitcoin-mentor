// Tavily web search — specifiek gebouwd voor AI agents
// Gratis tier: 1.000 zoekopdrachten/maand
// API key instellen: TAVILY_API_KEY in .env.local

const SEARCH_DOMAINS = [
  "coindesk.com", "cointelegraph.com", "theblock.co", "decrypt.co",
  "reuters.com", "bloomberg.com", "investing.com", "tradingeconomics.com",
  "cnbc.com", "ft.com", "marketwatch.com", "seekingalpha.com",
  "bitcoinmagazine.com", "cryptoslate.com",
];

export interface SearchResult {
  title: string;
  content: string;
  url: string;
  score: number;
}

export async function webSearch(query: string, maxResults = 4): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return "";

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: query.slice(0, 300),
        search_depth: "basic",
        include_answer: true,
        include_domains: SEARCH_DOMAINS,
        max_results: maxResults,
      }),
    });

    if (!res.ok) return "";
    const data = await res.json() as {
      answer?: string;
      results?: { title: string; content: string; url: string; score: number }[];
    };

    const parts: string[] = [];
    if (data.answer) parts.push(`Samenvatting: ${data.answer}`);
    if (data.results?.length) {
      parts.push(
        data.results
          .filter(r => r.score > 0.3)
          .slice(0, maxResults)
          .map(r => `📰 ${r.title}\n${r.content.slice(0, 400)}\nBron: ${r.url}`)
          .join("\n\n")
      );
    }
    return parts.join("\n\n");
  } catch {
    return "";
  }
}

// Detecteer of een vraag actuele webdata nodig heeft
export function needsWebSearch(message: string): boolean {
  const lower = message.toLowerCase();
  const keywords = [
    "nieuws", "news", "vandaag", "today", "actueel", "current", "latest",
    "huidig", "recent", "gisteren", "yesterday", "deze week", "this week",
    "wat is er", "wat gebeurt", "breaking", "announcement", "aankondiging",
    "rente", "inflatie", "inflation", "fed", "ecb", "fomc", "regelgeving",
    "regulation", "sec", "ban", "verbod", "hack", "exploit", "liquidatie",
    "liquidation", "etf goedgekeurd", "etf approved", "halving", "upgrade",
    "fork", "update", "partnership", "samenwerking", "earnings", "resultaten",
    "kwartaalcijfers", "nfp", "cpi", "pce", "jerome powell", "lagarde",
    "trump", "macro", "economisch", "economic", "waarom daalt", "waarom stijgt",
    "wat zegt", "analyse", "verwachting", "prediction", "outlook",
    "wat is het sentiment", "marktsentiment",
  ];
  return keywords.some(kw => lower.includes(kw));
}

// Bouw een goede zoekopdracht op basis van het gebruikersbericht
export function buildSearchQuery(userMessage: string, asset?: string): string {
  const base = asset && asset !== "BTCUSDT"
    ? `${asset.replace("USDT", "")} crypto ${userMessage}`
    : userMessage;
  return base.slice(0, 200);
}
