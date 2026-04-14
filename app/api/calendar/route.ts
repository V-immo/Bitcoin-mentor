import { NextRequest } from "next/server";

// Cache 1 uur — data verandert niet snel
let cache: { data: CalendarData; ts: number } | null = null;
const TTL = 60 * 60 * 1000;

export type EconEvent = {
  time: string;       // ISO date string
  event: string;
  country: string;
  impact: 1 | 2 | 3; // 1=laag, 2=middel, 3=hoog
  actual: string | null;
  estimate: string | null;
  previous: string | null;
  unit: string;
};

export type EarningsEvent = {
  symbol: string;
  name: string;
  reportDate: string; // YYYY-MM-DD
  hour: "bmo" | "amc" | "dmh" | "";  // before/after market open, during market hours
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
};

export type CalendarData = {
  economic: EconEvent[];
  earnings: EarningsEvent[];
  fetchedAt: string;
};

// Stocks die we trackern in de app
const TRACKED_SYMBOLS = new Set([
  "NVDA", "AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "META", "AMD", "NFLX", "PLTR"
]);

// Relevante US macro events (keywords)
const RELEVANT_EVENTS = [
  "cpi", "consumer price", "ppi", "producer price",
  "fed rate", "fomc", "federal funds", "interest rate decision",
  "nfp", "nonfarm", "non-farm", "payroll",
  "gdp", "gross domestic",
  "retail sales",
  "unemployment", "jobless",
  "pce", "personal consumption",
  "ism", "purchasing managers",
  "inflation",
  "core pce",
];

function isRelevantEcon(event: string, country: string): boolean {
  if (country !== "US") return false;
  const lower = event.toLowerCase();
  return RELEVANT_EVENTS.some(kw => lower.includes(kw));
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  // Cache check
  if (cache && Date.now() - cache.ts < TTL) {
    return Response.json(cache.data);
  }

  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    return Response.json({ economic: [], earnings: [], fetchedAt: new Date().toISOString() });
  }

  const from = dateStr(new Date());
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 14);
  const to = dateStr(toDate);

  // Fetch both in parallel
  const [econRes, earningsRes] = await Promise.allSettled([
    fetch(`https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${key}`, {
      signal: AbortSignal.timeout(8000),
    }),
    fetch(`https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${key}`, {
      signal: AbortSignal.timeout(8000),
    }),
  ]);

  // Economic events
  let economic: EconEvent[] = [];
  if (econRes.status === "fulfilled" && econRes.value.ok) {
    try {
      const raw = await econRes.value.json() as {
        economicCalendar?: {
          time: string; event: string; country: string;
          impact: string; actual: string; estimate: string; prev: string; unit: string;
        }[];
      };
      economic = (raw.economicCalendar ?? [])
        .filter(e => isRelevantEcon(e.event, e.country))
        .map(e => ({
          time: e.time,
          event: e.event,
          country: e.country,
          impact: (parseInt(e.impact) || 1) as 1 | 2 | 3,
          actual: e.actual || null,
          estimate: e.estimate || null,
          previous: e.prev || null,
          unit: e.unit || "",
        }))
        .sort((a, b) => a.time.localeCompare(b.time));
    } catch { /* ignore */ }
  }

  // Earnings
  let earnings: EarningsEvent[] = [];
  if (earningsRes.status === "fulfilled" && earningsRes.value.ok) {
    try {
      const raw = await earningsRes.value.json() as {
        earningsCalendar?: {
          symbol: string; name: string; date: string; hour: string;
          epsEstimate: number | null; epsActual: number | null;
          revenueEstimate: number | null; revenueActual: number | null;
        }[];
      };
      earnings = (raw.earningsCalendar ?? [])
        .filter(e => TRACKED_SYMBOLS.has(e.symbol))
        .map(e => ({
          symbol: e.symbol,
          name: e.name,
          reportDate: e.date,
          hour: (e.hour ?? "") as EarningsEvent["hour"],
          epsEstimate: e.epsEstimate,
          epsActual: e.epsActual,
          revenueEstimate: e.revenueEstimate,
          revenueActual: e.revenueActual,
        }))
        .sort((a, b) => a.reportDate.localeCompare(b.reportDate));
    } catch { /* ignore */ }
  }

  const data: CalendarData = { economic, earnings, fetchedAt: new Date().toISOString() };
  cache = { data, ts: Date.now() };
  return Response.json(data);
}
