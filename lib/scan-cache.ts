// Gedeelde module-level scan cache — wordt gevuld door /api/market-scan
// en gelezen door /api/chat (geen HTTP-call nodig)

export type CachedScanEntry = {
  symbol: string;
  name: string;
  ticker: string;
  type: string;
  emoji: string;
  price: number;
  change24h: number;
  score: number;
  color: "green" | "yellow" | "red";
  signal: string;
  trend: string;
  rsi: number;
};

export const sharedScanCache: { data: CachedScanEntry[] | null; ts: number } = {
  data: null,
  ts: 0,
};
