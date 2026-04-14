// On-chain data — gratis, geen API key nodig
// Bronnen: mempool.space + blockchain.info

export interface OnChainData {
  mempoolTxCount: number;
  mempoolSizeMb: number;
  fastestFee: number;       // sat/vB
  halfHourFee: number;
  hourFee: number;
  btcHashrate: string;      // EH/s
  btcDifficulty: string;
  btcTxPerDay: number;
  btcActiveAddresses: number;
  timestamp: number;
}

let onChainCache: { data: OnChainData | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 15 * 60 * 1000; // 15 minuten

export async function getCachedOnChainData(): Promise<OnChainData | null> {
  if (onChainCache.data && Date.now() - onChainCache.ts < CACHE_TTL) {
    return onChainCache.data;
  }
  const fresh = await fetchOnChainData();
  if (fresh) onChainCache = { data: fresh, ts: Date.now() };
  return fresh;
}

async function fetchOnChainData(): Promise<OnChainData | null> {
  try {
    const [mempoolRes, statsRes, feesRes] = await Promise.allSettled([
      fetch("https://mempool.space/api/mempool", { signal: AbortSignal.timeout(5000) }),
      fetch("https://blockchain.info/stats?format=json", { signal: AbortSignal.timeout(5000) }),
      fetch("https://mempool.space/api/v1/fees/recommended", { signal: AbortSignal.timeout(5000) }),
    ]);

    let mempoolTxCount = 0, mempoolSizeMb = 0;
    let btcHashrate = "onbekend", btcDifficulty = "onbekend";
    let btcTxPerDay = 0, btcActiveAddresses = 0;
    let fastestFee = 0, halfHourFee = 0, hourFee = 0;

    if (mempoolRes.status === "fulfilled" && mempoolRes.value.ok) {
      const m = await mempoolRes.value.json() as { count?: number; vsize?: number };
      mempoolTxCount = m.count ?? 0;
      mempoolSizeMb = Math.round((m.vsize ?? 0) / 1e6 * 10) / 10;
    }

    if (statsRes.status === "fulfilled" && statsRes.value.ok) {
      const s = await statsRes.value.json() as {
        hash_rate?: number; difficulty?: number;
        n_tx?: number; n_unique_addresses?: number;
      };
      if (s.hash_rate) btcHashrate = (s.hash_rate / 1e18).toFixed(1) + " EH/s";
      if (s.difficulty) btcDifficulty = (s.difficulty / 1e12).toFixed(2) + "T";
      btcTxPerDay = s.n_tx ?? 0;
      btcActiveAddresses = s.n_unique_addresses ?? 0;
    }

    if (feesRes.status === "fulfilled" && feesRes.value.ok) {
      const f = await feesRes.value.json() as {
        fastestFee?: number; halfHourFee?: number; hourFee?: number;
      };
      fastestFee = f.fastestFee ?? 0;
      halfHourFee = f.halfHourFee ?? 0;
      hourFee = f.hourFee ?? 0;
    }

    return {
      mempoolTxCount, mempoolSizeMb,
      fastestFee, halfHourFee, hourFee,
      btcHashrate, btcDifficulty,
      btcTxPerDay, btcActiveAddresses,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

export function formatOnChainForMarcus(d: OnChainData): string {
  const mempoolStatus = d.mempoolTxCount > 100000
    ? "🔴 Druk (>100k tx wachten — fees hoog)"
    : d.mempoolTxCount > 50000
      ? "🟡 Matig druk"
      : "🟢 Rustig";

  const feeStatus = d.fastestFee > 50
    ? "⚠️ Hoge fees — wacht of gebruik SegWit"
    : d.fastestFee > 20
      ? "Normaal"
      : "Laag — goed moment voor transacties";

  return `BTC ON-CHAIN DATA (live):
Mempool: ${d.mempoolTxCount.toLocaleString()} transacties wachten | ${d.mempoolSizeMb} MB | ${mempoolStatus}
Aanbevolen fees: snel ${d.fastestFee} sat/vB | 30min ${d.halfHourFee} sat/vB | 1u ${d.hourFee} sat/vB → ${feeStatus}
Hashrate: ${d.btcHashrate} (netwerk gezondheid — hoog = goed)
Mining moeilijkheid: ${d.btcDifficulty}
Transacties/dag: ${d.btcTxPerDay.toLocaleString()} | Actieve adressen: ${d.btcActiveAddresses.toLocaleString()}

MARCUS INTERPRETEERT:
- Hoog actieve adressen + stijgende prijs = organische vraag (bullish signaal)
- Lage mempool + lage fees = rustige markt, weinig urgentie bij traders
- Stijgende hashrate = miners vertrouwen lange termijn waarde van BTC
- Dalende hashrate = miners stappen uit (bearish druk op korte termijn mogelijk)`;
}
