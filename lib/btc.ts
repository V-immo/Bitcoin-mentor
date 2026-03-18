import type { BtcPriceSnapshot } from "./types";

type BinanceTickerResponse = {
  symbol?: string;
  price?: string;
};

type CoinGeckoResponse = {
  bitcoin?: {
    usd?: number;
  };
};

async function getBinancePrice(symbol = "BTCUSDT"): Promise<number> {
  const response = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
    {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Binance prijsfout: ${response.status}`);
  }

  const json = (await response.json()) as BinanceTickerResponse;
  const price = Number(json.price);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Binance gaf geen geldige prijs terug.");
  }

  return price;
}

async function getCoinGeckoFallbackPrice(): Promise<number> {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`CoinGecko prijsfout: ${response.status}`);
  }

  const json = (await response.json()) as CoinGeckoResponse;
  const price = json?.bitcoin?.usd;

  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error("CoinGecko gaf geen geldige prijs terug.");
  }

  return price;
}

export async function getBitcoinPrice(symbol = "BTCUSDT"): Promise<BtcPriceSnapshot> {
  try {
    const price = await getBinancePrice(symbol);
    return { price, source: "binance", fetchedAt: new Date().toISOString() };
  } catch {
    // CoinGecko fallback alleen voor BTC
    if (symbol === "BTCUSDT") {
      const price = await getCoinGeckoFallbackPrice();
      return { price, source: "coingecko", fetchedAt: new Date().toISOString() };
    }
    throw new Error(`Kon prijs niet ophalen voor ${symbol}`);
  }
}
