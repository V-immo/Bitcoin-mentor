/**
 * market-poller.ts
 * Gedeelde module-level cache voor externe marktdata.
 * Wordt actief bijgewerkt via startPoller() (aangeroepen vanuit instrumentation.ts).
 * Alle sessies wereldwijd (Aziatisch, Europees, VS) krijgen altijd verse data.
 */

const POLL_INTERVAL = 30 * 60 * 1000; // 30 minuten
const EXT_TTL       = 35 * 60 * 1000; // 35 min — iets ruimer dan poll interval

type Cached<T> = { data: T; ts: number } | null;

// Gedeelde cache — geïmporteerd door chat route en andere modules
export let cachedFearGreed:    Cached<string>        = null;
export let cachedGlobalMetics: Cached<GlobalMetrics> = null;
export let cachedFunding:      Cached<FundingData[]> = null;

export type GlobalMetrics = {
  btcDominance: string;
  totalMarketCap: string;
  marketCapChange24h: string;
};

export type FundingData = {
  symbol: string;
  fundingRate: string;
  openInterest: string;
};

// --- Fetch functies ---

export async function fetchFearAndGreed(): Promise<string> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return "onbekend";
    const data = await res.json();
    const entry = data?.data?.[0];
    if (!entry) return "onbekend";
    return `${entry.value}/100 (${entry.value_classification})`;
  } catch {
    return "onbekend";
  }
}

export async function fetchGlobalMetrics(): Promise<GlobalMetrics> {
  const fallback: GlobalMetrics = {
    btcDominance: "onbekend",
    totalMarketCap: "onbekend",
    marketCapChange24h: "onbekend",
  };
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/global", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const d = data?.data;
    if (!d) return fallback;
    return {
      btcDominance: `${d.market_cap_percentage?.btc?.toFixed(1) ?? "?"}%`,
      totalMarketCap: d.total_market_cap?.usd
        ? `$${(d.total_market_cap.usd / 1e12).toFixed(2)}T`
        : "onbekend",
      marketCapChange24h: typeof d.market_cap_change_percentage_24h_usd === "number"
        ? `${d.market_cap_change_percentage_24h_usd.toFixed(2)}%`
        : "onbekend",
    };
  } catch {
    return fallback;
  }
}

export async function fetchFundingRates(): Promise<FundingData[]> {
  const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"];
  const results: FundingData[] = [];
  try {
    const [premiumRes, ...oiCalls] = await Promise.allSettled([
      fetch("https://fapi.binance.com/fapi/v1/premiumIndex", { next: { revalidate: 300 } }),
      ...symbols.map(s =>
        fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${s}`, { next: { revalidate: 300 } })
          .then(r => r.ok ? r.json() : null)
      ),
    ]);

    const premiumData: { symbol: string; lastFundingRate: string; markPrice?: string }[] =
      premiumRes.status === "fulfilled" && premiumRes.value.ok
        ? await premiumRes.value.json()
        : [];

    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      const pm = premiumData.find(p => p.symbol === sym);
      if (!pm) continue;
      const rate = parseFloat(pm.lastFundingRate) * 100;
      const rateStr = `${rate >= 0 ? "+" : ""}${rate.toFixed(4)}%`;

      let oiStr = "onbekend";
      const oiResult = oiCalls[i];
      if (oiResult.status === "fulfilled" && oiResult.value) {
        const oiVal = parseFloat(oiResult.value.openInterest ?? "0");
        const markPrice = parseFloat(pm.markPrice ?? "0");
        const oiUsd = oiVal * markPrice;
        oiStr = oiUsd > 1e9 ? `$${(oiUsd / 1e9).toFixed(1)}B`
              : oiUsd > 1e6 ? `$${(oiUsd / 1e6).toFixed(0)}M`
              : "onbekend";
      }
      results.push({ symbol: sym.replace("USDT", ""), fundingRate: rateStr, openInterest: oiStr });
    }
  } catch { /* geen data */ }
  return results;
}

// --- Gecachede wrappers (voor on-demand gebruik in chat route) ---

export async function getCachedFearGreed(): Promise<string> {
  if (cachedFearGreed && Date.now() - cachedFearGreed.ts < EXT_TTL) return cachedFearGreed.data;
  const data = await fetchFearAndGreed();
  cachedFearGreed = { data, ts: Date.now() };
  return data;
}

export async function getCachedGlobalMetrics(): Promise<GlobalMetrics> {
  if (cachedGlobalMetics && Date.now() - cachedGlobalMetics.ts < EXT_TTL) return cachedGlobalMetics.data;
  const data = await fetchGlobalMetrics();
  cachedGlobalMetics = { data, ts: Date.now() };
  return data;
}

export async function getCachedFundingRates(): Promise<FundingData[]> {
  if (cachedFunding && Date.now() - cachedFunding.ts < EXT_TTL) return cachedFunding.data;
  const data = await fetchFundingRates();
  cachedFunding = { data, ts: Date.now() };
  return data;
}

// --- Actieve background poller ---

let pollerStarted = false;

async function pollAll(): Promise<void> {
  try {
    const [fg, gm, fr] = await Promise.allSettled([
      fetchFearAndGreed(),
      fetchGlobalMetrics(),
      fetchFundingRates(),
    ]);
    if (fg.status === "fulfilled") cachedFearGreed    = { data: fg.value, ts: Date.now() };
    if (gm.status === "fulfilled") cachedGlobalMetics = { data: gm.value, ts: Date.now() };
    if (fr.status === "fulfilled") cachedFunding      = { data: fr.value, ts: Date.now() };
  } catch {
    // stilletjes falen — stale cache blijft geldig
  }
}

/**
 * Start de background poller. Veilig om meerdere keren aan te roepen — start maar 1x.
 * Wordt aangeroepen vanuit instrumentation.ts bij server-opstart.
 */
export function startPoller(): void {
  if (pollerStarted) return;
  pollerStarted = true;

  // Direct eerste run zodat cache gevuld is bij opstart
  pollAll();

  // Daarna elke 30 minuten — ongeacht of er gebruikers actief zijn
  setInterval(pollAll, POLL_INTERVAL);
}
