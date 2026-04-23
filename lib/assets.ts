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
  etoroName?: string; // Naam op eToro voor de gebruiker
}

export const SCAN_ASSETS: AssetDef[] = [
  // ── Crypto (Binance WebSocket — realtime 24/7) ──────────────────────────
  { symbol: "BTCUSDT",   name: "Bitcoin",       ticker: "BTC",    type: "crypto", source: "binance", emoji: "₿",  currency: "USDT" },
  { symbol: "ETHUSDT",   name: "Ethereum",      ticker: "ETH",    type: "crypto", source: "binance", emoji: "Ξ",  currency: "USDT" },
  { symbol: "SOLUSDT",   name: "Solana",        ticker: "SOL",    type: "crypto", source: "binance", emoji: "◎",  currency: "USDT" },
  { symbol: "BNBUSDT",   name: "BNB",           ticker: "BNB",    type: "crypto", source: "binance", emoji: "⬡",  currency: "USDT" },
  { symbol: "XRPUSDT",   name: "XRP",           ticker: "XRP",    type: "crypto", source: "binance", emoji: "✕",  currency: "USDT" },
  { symbol: "DOGEUSDT",  name: "Dogecoin",      ticker: "DOGE",   type: "crypto", source: "binance", emoji: "D",  currency: "USDT" },
  { symbol: "ADAUSDT",   name: "Cardano",       ticker: "ADA",    type: "crypto", source: "binance", emoji: "₳",  currency: "USDT" },
  { symbol: "AVAXUSDT",  name: "Avalanche",     ticker: "AVAX",   type: "crypto", source: "binance", emoji: "▲",  currency: "USDT" },
  { symbol: "LINKUSDT",  name: "Chainlink",     ticker: "LINK",   type: "crypto", source: "binance", emoji: "◇",  currency: "USDT" },
  { symbol: "LTCUSDT",   name: "Litecoin",      ticker: "LTC",    type: "crypto", source: "binance", emoji: "Ł",  currency: "USDT" },
  { symbol: "MATICUSDT", name: "Polygon",       ticker: "MATIC",  type: "crypto", source: "binance", emoji: "⬟", currency: "USDT" },
  { symbol: "DOTUSDT",   name: "Polkadot",      ticker: "DOT",    type: "crypto", source: "binance", emoji: "●",  currency: "USDT" },
  { symbol: "SUIUSDT",   name: "Sui",           ticker: "SUI",    type: "crypto", source: "binance", emoji: "◈",  currency: "USDT" },
  { symbol: "TONUSDT",   name: "Toncoin",       ticker: "TON",    type: "crypto", source: "binance", emoji: "◎",  currency: "USDT" },
  { symbol: "TRXUSDT",   name: "TRON",          ticker: "TRX",    type: "crypto", source: "binance", emoji: "◉",  currency: "USDT" },
  { symbol: "NEARUSDT",  name: "NEAR Protocol", ticker: "NEAR",   type: "crypto", source: "binance", emoji: "○",  currency: "USDT" },
  { symbol: "UNIUSDT",   name: "Uniswap",       ticker: "UNI",    type: "crypto", source: "binance", emoji: "◇",  currency: "USDT" },
  { symbol: "AAVEUSDT",  name: "Aave",          ticker: "AAVE",   type: "crypto", source: "binance", emoji: "★",  currency: "USDT" },

  // ── Grondstoffen (Finnhub OANDA — realtime ma-vr) ───────────────────────
  { symbol: "GC=F",  name: "Goud",        ticker: "GOLD",   type: "metal", source: "finnhub", emoji: "◈",  currency: "USD", finnhubSymbol: "OANDA:XAU_USD",   etoroName: "GOLD"   },
  { symbol: "SI=F",  name: "Zilver",      ticker: "SILVER", type: "metal", source: "finnhub", emoji: "○",  currency: "USD", finnhubSymbol: "OANDA:XAG_USD",   etoroName: "SILVER" },
  { symbol: "CL=F",  name: "Olie (WTI)",  ticker: "OIL",    type: "metal", source: "finnhub", emoji: "◎",  currency: "USD", finnhubSymbol: "OANDA:WTICO_USD", etoroName: "USOIL"  },

  // ── Aandelen (Finnhub — realtime tijdens beurstijden) ───────────────────
  { symbol: "NVDA",  name: "Nvidia",      ticker: "NVDA",  type: "stock", source: "finnhub", emoji: "▣",  currency: "USD", finnhubSymbol: "NVDA",  etoroName: "NVDA"  },
  { symbol: "AAPL",  name: "Apple",       ticker: "AAPL",  type: "stock", source: "finnhub", emoji: "○",  currency: "USD", finnhubSymbol: "AAPL",  etoroName: "AAPL"  },
  { symbol: "TSLA",  name: "Tesla",       ticker: "TSLA",  type: "stock", source: "finnhub", emoji: "▲",  currency: "USD", finnhubSymbol: "TSLA",  etoroName: "TSLA"  },
  { symbol: "MSFT",  name: "Microsoft",   ticker: "MSFT",  type: "stock", source: "finnhub", emoji: "□",  currency: "USD", finnhubSymbol: "MSFT",  etoroName: "MSFT"  },
  { symbol: "GOOGL", name: "Alphabet",    ticker: "GOOGL", type: "stock", source: "finnhub", emoji: "◎",  currency: "USD", finnhubSymbol: "GOOGL", etoroName: "GOOGL" },
  { symbol: "AMZN",  name: "Amazon",      ticker: "AMZN",  type: "stock", source: "finnhub", emoji: "◇",  currency: "USD", finnhubSymbol: "AMZN",  etoroName: "AMZN"  },
  { symbol: "META",  name: "Meta",        ticker: "META",  type: "stock", source: "finnhub", emoji: "◉",  currency: "USD", finnhubSymbol: "META",  etoroName: "META"  },
  { symbol: "AMD",   name: "AMD",         ticker: "AMD",   type: "stock", source: "finnhub", emoji: "▤",  currency: "USD", finnhubSymbol: "AMD",   etoroName: "AMD"   },
  { symbol: "NFLX",  name: "Netflix",     ticker: "NFLX",  type: "stock", source: "finnhub", emoji: "▶",  currency: "USD", finnhubSymbol: "NFLX",  etoroName: "NFLX"  },
  { symbol: "PLTR",  name: "Palantir",    ticker: "PLTR",  type: "stock", source: "finnhub", emoji: "◈",  currency: "USD", finnhubSymbol: "PLTR",  etoroName: "PLTR"  },
  { symbol: "MSTR",  name: "MicroStrategy", ticker: "MSTR", type: "stock", source: "finnhub", emoji: "₿", currency: "USD", finnhubSymbol: "MSTR",  etoroName: "MSTR"  },
  { symbol: "COIN",  name: "Coinbase",    ticker: "COIN",  type: "stock", source: "finnhub", emoji: "◎",  currency: "USD", finnhubSymbol: "COIN",  etoroName: "COIN"  },
  { symbol: "MARA",  name: "MARA Holdings", ticker: "MARA", type: "stock", source: "finnhub", emoji: "▲", currency: "USD", finnhubSymbol: "MARA",  etoroName: "MARA"  },

  // ── Bitcoin ETFs (Finnhub — VS beurzen) ──────────────────────────────────
  { symbol: "IBIT",  name: "iShares Bitcoin ETF",   ticker: "IBIT",  type: "etf", source: "finnhub", emoji: "₿", currency: "USD", finnhubSymbol: "IBIT",  etoroName: "IBIT"  },
  { symbol: "FBTC",  name: "Fidelity Bitcoin ETF",  ticker: "FBTC",  type: "etf", source: "finnhub", emoji: "₿", currency: "USD", finnhubSymbol: "FBTC",  etoroName: "FBTC"  },
  { symbol: "GBTC",  name: "Grayscale Bitcoin",     ticker: "GBTC",  type: "etf", source: "finnhub", emoji: "₿", currency: "USD", finnhubSymbol: "GBTC",  etoroName: "GBTC"  },
  { symbol: "ARKB",  name: "ARK Bitcoin ETF",       ticker: "ARKB",  type: "etf", source: "finnhub", emoji: "₿", currency: "USD", finnhubSymbol: "ARKB",  etoroName: "ARKB"  },
  { symbol: "BITB",  name: "Bitwise Bitcoin ETF",   ticker: "BITB",  type: "etf", source: "finnhub", emoji: "₿", currency: "USD", finnhubSymbol: "BITB",  etoroName: "BITB"  },
  { symbol: "ETHA",  name: "iShares Ethereum ETF",  ticker: "ETHA",  type: "etf", source: "finnhub", emoji: "Ξ", currency: "USD", finnhubSymbol: "ETHA",  etoroName: "ETHA"  },

  // ── Brede ETFs ────────────────────────────────────────────────────────────
  { symbol: "SPY",   name: "S&P 500",     ticker: "SPY",   type: "etf", source: "finnhub", emoji: "≡",  currency: "USD", finnhubSymbol: "SPY",   etoroName: "SPY500"  },
  { symbol: "QQQ",   name: "NASDAQ-100",  ticker: "QQQ",   type: "etf", source: "finnhub", emoji: "↑",  currency: "USD", finnhubSymbol: "QQQ",   etoroName: "NSDQ100" },
  { symbol: "GLD",   name: "Gold ETF",    ticker: "GLD",   type: "etf", source: "finnhub", emoji: "◈",  currency: "USD", finnhubSymbol: "GLD",   etoroName: "GLD"     },
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
