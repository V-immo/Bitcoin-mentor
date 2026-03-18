export type AssetSource = "binance" | "finnhub";
export type AssetType = "crypto" | "stock" | "etf" | "metal";

export interface AssetDef {
  symbol: string;
  name: string;
  ticker: string;
  type: AssetType;
  source: AssetSource;
  emoji: string;
  currency: string;
  finnhubSymbol?: string;
}

export const SCAN_ASSETS: AssetDef[] = [
  // ── Crypto (Binance WebSocket — realtime 24/7) ──────────────────────────
  { symbol: "BTCUSDT",  name: "Bitcoin",    ticker: "BTC",   type: "crypto", source: "binance", emoji: "₿",  currency: "USDT" },
  { symbol: "ETHUSDT",  name: "Ethereum",   ticker: "ETH",   type: "crypto", source: "binance", emoji: "Ξ",  currency: "USDT" },
  { symbol: "SOLUSDT",  name: "Solana",     ticker: "SOL",   type: "crypto", source: "binance", emoji: "◎",  currency: "USDT" },
  { symbol: "BNBUSDT",  name: "BNB",        ticker: "BNB",   type: "crypto", source: "binance", emoji: "⬡",  currency: "USDT" },
  { symbol: "XRPUSDT",  name: "XRP",        ticker: "XRP",   type: "crypto", source: "binance", emoji: "✕",  currency: "USDT" },
  { symbol: "DOGEUSDT", name: "Dogecoin",   ticker: "DOGE",  type: "crypto", source: "binance", emoji: "🐕", currency: "USDT" },
  { symbol: "ADAUSDT",  name: "Cardano",    ticker: "ADA",   type: "crypto", source: "binance", emoji: "₳",  currency: "USDT" },
  { symbol: "AVAXUSDT", name: "Avalanche",  ticker: "AVAX",  type: "crypto", source: "binance", emoji: "🔺", currency: "USDT" },
  { symbol: "LINKUSDT", name: "Chainlink",  ticker: "LINK",  type: "crypto", source: "binance", emoji: "🔗", currency: "USDT" },
  { symbol: "LTCUSDT",  name: "Litecoin",   ticker: "LTC",   type: "crypto", source: "binance", emoji: "Ł",  currency: "USDT" },
  { symbol: "MATICUSDT",name: "Polygon",    ticker: "MATIC", type: "crypto", source: "binance", emoji: "⬟", currency: "USDT" },
  { symbol: "DOTUSDT",  name: "Polkadot",   ticker: "DOT",   type: "crypto", source: "binance", emoji: "●",  currency: "USDT" },

  // ── Grondstoffen (Finnhub OANDA — realtime ma-vr) ───────────────────────
  { symbol: "GC=F",  name: "Goud",        ticker: "GOLD",   type: "metal", source: "finnhub", emoji: "🥇", currency: "USD", finnhubSymbol: "OANDA:XAU_USD" },
  { symbol: "SI=F",  name: "Zilver",      ticker: "SILVER", type: "metal", source: "finnhub", emoji: "🥈", currency: "USD", finnhubSymbol: "OANDA:XAG_USD" },
  { symbol: "CL=F",  name: "Olie (WTI)",  ticker: "OIL",    type: "metal", source: "finnhub", emoji: "🛢", currency: "USD", finnhubSymbol: "OANDA:WTICO_USD" },

  // ── Aandelen (Finnhub — realtime tijdens beurstijden) ───────────────────
  { symbol: "NVDA",  name: "Nvidia",      ticker: "NVDA",  type: "stock", source: "finnhub", emoji: "🖥",  currency: "USD", finnhubSymbol: "NVDA"  },
  { symbol: "AAPL",  name: "Apple",       ticker: "AAPL",  type: "stock", source: "finnhub", emoji: "🍎", currency: "USD", finnhubSymbol: "AAPL"  },
  { symbol: "TSLA",  name: "Tesla",       ticker: "TSLA",  type: "stock", source: "finnhub", emoji: "⚡", currency: "USD", finnhubSymbol: "TSLA"  },
  { symbol: "MSFT",  name: "Microsoft",   ticker: "MSFT",  type: "stock", source: "finnhub", emoji: "🪟", currency: "USD", finnhubSymbol: "MSFT"  },
  { symbol: "GOOGL", name: "Alphabet",    ticker: "GOOGL", type: "stock", source: "finnhub", emoji: "🔍", currency: "USD", finnhubSymbol: "GOOGL" },
  { symbol: "AMZN",  name: "Amazon",      ticker: "AMZN",  type: "stock", source: "finnhub", emoji: "📦", currency: "USD", finnhubSymbol: "AMZN"  },
  { symbol: "META",  name: "Meta",        ticker: "META",  type: "stock", source: "finnhub", emoji: "👤", currency: "USD", finnhubSymbol: "META"  },
  { symbol: "AMD",   name: "AMD",         ticker: "AMD",   type: "stock", source: "finnhub", emoji: "💻", currency: "USD", finnhubSymbol: "AMD"   },
  { symbol: "NFLX",  name: "Netflix",     ticker: "NFLX",  type: "stock", source: "finnhub", emoji: "🎬", currency: "USD", finnhubSymbol: "NFLX"  },
  { symbol: "PLTR",  name: "Palantir",    ticker: "PLTR",  type: "stock", source: "finnhub", emoji: "🔭", currency: "USD", finnhubSymbol: "PLTR"  },

  // ── ETFs ────────────────────────────────────────────────────────────────
  { symbol: "SPY",   name: "S&P 500",     ticker: "SPY",   type: "etf",   source: "finnhub", emoji: "📊", currency: "USD", finnhubSymbol: "SPY"   },
  { symbol: "QQQ",   name: "NASDAQ-100",  ticker: "QQQ",   type: "etf",   source: "finnhub", emoji: "💹", currency: "USD", finnhubSymbol: "QQQ"   },
];

export function getAssetDef(symbol: string): AssetDef | undefined {
  return SCAN_ASSETS.find((a) => a.symbol === symbol);
}

export function isFinnhubAsset(symbol: string): boolean {
  return getAssetDef(symbol)?.source === "finnhub";
}

// Backward compat alias
export const isYahooAsset = isFinnhubAsset;

export function getFinnhubSymbol(symbol: string): string {
  const def = getAssetDef(symbol);
  return def?.finnhubSymbol ?? symbol;
}
