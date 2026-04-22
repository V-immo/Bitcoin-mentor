/**
 * market-poller.ts
 * Gedeelde module-level cache voor externe marktdata.
 * Wordt actief bijgewerkt via startPoller() (aangeroepen vanuit instrumentation.ts).
 * Alle sessies wereldwijd (Aziatisch, Europees, VS) krijgen altijd verse data.
 */

import { sharedScanCache } from "./scan-cache";
import { calculateRsi } from "./market";
import { getDb } from "@/db/db";
import { SCAN_ASSETS } from "./assets";
import { sendReminderEmail } from "./mailer";

const POLL_INTERVAL       = 30 * 60 * 1000; // 30 minuten (externe data)
const CRYPTO_POLL_INTERVAL =  5 * 60 * 1000; //  5 minuten (alle crypto assets)
const EXT_TTL       = 35 * 60 * 1000; // 35 min — iets ruimer dan poll interval

type Cached<T> = { data: T; ts: number } | null;

// Gedeelde cache — geïmporteerd door chat route en andere modules
export let cachedFearGreed:    Cached<string>        = null;
export let cachedGlobalMetrics: Cached<GlobalMetrics> = null;
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
  if (cachedGlobalMetrics && Date.now() - cachedGlobalMetrics.ts < EXT_TTL) return cachedGlobalMetrics.data;
  const data = await fetchGlobalMetrics();
  cachedGlobalMetrics = { data, ts: Date.now() };
  return data;
}

export async function getCachedFundingRates(): Promise<FundingData[]> {
  if (cachedFunding && Date.now() - cachedFunding.ts < EXT_TTL) return cachedFunding.data;
  const data = await fetchFundingRates();
  cachedFunding = { data, ts: Date.now() };
  return data;
}

// --- Alle crypto assets poller (vult sharedScanCache voor alle 12 Binance assets) ---

type BinanceTicker24h = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  markPrice?: string;
};

type BinanceKlineRow = [number, string, string, string, string, string, number, ...unknown[]];

const CRYPTO_SYMBOLS = SCAN_ASSETS
  .filter(a => a.source === "binance")
  .map(a => a.symbol);

async function fetchAllCryptoSnapshots(): Promise<void> {
  try {
    // Batch 24h ticker voor alle crypto assets + klines voor BTC/ETH/SOL (voor RSI)
    const symbolsJson = `["${CRYPTO_SYMBOLS.join('","')}"]`;
    const [batchRes, ...klineResults] = await Promise.allSettled([
      fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsJson)}`, { cache: "no-store" }),
      ...["BTCUSDT", "ETHUSDT", "SOLUSDT"].map(sym =>
        fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=1h&limit=100`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : [])
      ),
    ]);

    if (batchRes.status !== "fulfilled" || !batchRes.value.ok) return;
    const tickers = await batchRes.value.json() as BinanceTicker24h[];

    const klineMap = new Map<string, BinanceKlineRow[]>();
    const klSymbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
    for (let i = 0; i < klSymbols.length; i++) {
      const r = klineResults[i];
      if (r.status === "fulfilled") klineMap.set(klSymbols[i], r.value as BinanceKlineRow[]);
    }

    const now = Date.now();
    const existing = [...(sharedScanCache.data ?? [])];

    for (const ticker of tickers) {
      const price = parseFloat(ticker.lastPrice);
      const change24h = parseFloat(ticker.priceChangePercent);
      if (!isFinite(price) || price <= 0) continue;

      const assetDef = SCAN_ASSETS.find(a => a.symbol === ticker.symbol);
      if (!assetDef) continue;

      let rsi = 50;
      let trend = "zijwaarts";
      let score = 50;

      const klines = klineMap.get(ticker.symbol);
      if (klines && klines.length >= 20) {
        const candles = klines.map(row => ({
          openTime: Number(row[0]), open: Number(row[1]),
          high: Number(row[2]), low: Number(row[3]),
          close: Number(row[4]), volume: Number(row[5]), closeTime: Number(row[6]),
        }));
        try { rsi = calculateRsi(candles, 14); } catch { /* ignore */ }
        const closes = candles.map(c => c.close);
        if (closes.length >= 50) {
          const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
          const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
          trend = ma20 > ma50 * 1.01 ? "omhoog" : ma20 < ma50 * 0.99 ? "omlaag" : "zijwaarts";
        }
        score = 50;
        if (rsi < 35) score += 15; else if (rsi < 50) score += 8;
        else if (rsi > 70) score -= 15; else if (rsi > 60) score -= 5;
        if (trend === "omhoog") score += 12; else if (trend === "omlaag") score -= 12;
        score = Math.max(0, Math.min(100, Math.round(score)));
      }

      const color: "green" | "yellow" | "red" = score >= 60 ? "green" : score >= 40 ? "yellow" : "red";
      const signal = rsi > 70 ? "Overkocht" : rsi < 30 ? "Oververkocht" : trend === "omhoog" ? "Bullish" : trend === "omlaag" ? "Bearish" : "Neutraal";

      const entry = {
        symbol: assetDef.symbol, name: assetDef.name, ticker: assetDef.ticker,
        type: assetDef.type, emoji: assetDef.emoji,
        price, change24h, score, color, signal, trend, rsi,
      };

      const idx = existing.findIndex(e => e.symbol === ticker.symbol);
      if (idx >= 0) existing[idx] = entry;
      else existing.push(entry);
    }

    sharedScanCache.data = existing;
    sharedScanCache.ts = now;
  } catch { /* stilletjes falen */ }
}

async function fetchBtcSnapshot(): Promise<void> {
  try {
    const [tickerRes, klineRes] = await Promise.all([
      fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", { cache: "no-store" }),
      fetch("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=100", { cache: "no-store" }),
    ]);
    if (!tickerRes.ok || !klineRes.ok) return;

    const ticker = await tickerRes.json() as BinanceTicker24h;
    const klines = await klineRes.json() as BinanceKlineRow[];

    const price = parseFloat(ticker.lastPrice);
    const change24h = parseFloat(ticker.priceChangePercent);
    if (!isFinite(price) || price <= 0) return;

    const candles = klines.map(row => ({
      openTime: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
      closeTime: Number(row[6]),
    }));

    const closes = candles.map(c => c.close);
    const rsi = calculateRsi(candles, 14);
    const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, closes.length);
    const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, closes.length);
    const trend = ma20 > ma50 * 1.01 ? "omhoog" : ma20 < ma50 * 0.99 ? "omlaag" : "zijwaarts";

    let score = 50;
    if (rsi < 35) score += 15; else if (rsi < 50) score += 8;
    else if (rsi > 70) score -= 15; else if (rsi > 60) score -= 5;
    if (trend === "omhoog") score += 12; else if (trend === "omlaag") score -= 12;
    score = Math.max(0, Math.min(100, Math.round(score)));

    const color: "green" | "yellow" | "red" = score >= 60 ? "green" : score >= 40 ? "yellow" : "red";
    const signal = rsi > 70 ? "Overkocht" : rsi < 30 ? "Oververkocht" : trend === "omhoog" ? "Bullish" : trend === "omlaag" ? "Bearish" : "Neutraal";

    const btcEntry = {
      symbol: "BTCUSDT", name: "Bitcoin", ticker: "BTC", type: "crypto", emoji: "₿",
      price, change24h, score, color, signal, trend, rsi,
    };

    // Behoud bestaande scan data — update of voeg BTC toe
    const existing = sharedScanCache.data ?? [];
    const idx = existing.findIndex(e => e.ticker === "BTC" || e.symbol === "BTCUSDT");
    if (idx >= 0) {
      existing[idx] = btcEntry;
      sharedScanCache.ts = Date.now();
    } else {
      sharedScanCache.data = [btcEntry, ...existing];
      sharedScanCache.ts = Date.now();
    }
  } catch {
    // stilletjes falen — stale cache blijft bruikbaar
  }
}

// --- Marcus signal engine ---

type MarcusSignalRow = {
  id: number; asset: string; symbol: string; entry_price: number;
  stop_loss: number; target: number; status: string; created_at: string;
};

function autoOpenPaperTrade(
  db: ReturnType<typeof getDb>,
  userId: number, asset: string, symbol: string,
  entryPrice: number, stopLoss: number, target: number, signalId: number
): void {
  try {
    const user = db.prepare("SELECT start_capital FROM users WHERE id = ?").get(userId) as { start_capital: number } | undefined;
    const startCapital = user?.start_capital ?? 10000;

    let row = db.prepare("SELECT cash, position, history, starting_balance FROM paper_trading WHERE user_id = ? AND asset = ?")
      .get(userId, symbol) as { cash: number; position: string | null; history: string; starting_balance: number } | undefined;

    if (!row) {
      db.prepare("INSERT INTO paper_trading (user_id, asset, cash, position, history, starting_balance) VALUES (?, ?, ?, NULL, '[]', ?)")
        .run(userId, symbol, startCapital, startCapital);
      row = db.prepare("SELECT cash, position, history, starting_balance FROM paper_trading WHERE user_id = ? AND asset = ?")
        .get(userId, symbol) as { cash: number; position: string | null; history: string; starting_balance: number };
    }

    if (!row || row.position) return; // already has open position

    const tradeValue = row.cash * 0.05; // 5% van cash per auto-trade
    if (tradeValue < 5) return;

    const openBtc = tradeValue / entryPrice;
    const newCash = row.cash - tradeValue;

    const position = { avgEntry: entryPrice, openBtc, side: "long", stopLoss, target, realizedPnl: 0, auto: true, signalId };
    const history = JSON.parse(row.history ?? "[]") as unknown[];
    history.push({ side: "buy", timestamp: Date.now(), price: entryPrice, amount: openBtc, auto: true, signalId });

    db.prepare("UPDATE paper_trading SET cash = ?, position = ?, history = ?, updated_at = datetime('now') WHERE user_id = ? AND asset = ?")
      .run(newCash, JSON.stringify(position), JSON.stringify(history), userId, symbol);
  } catch { /* stilletjes falen */ }
}

function runSignalEngine(): void {
  try {
    const db = getDb();
    const { data: scan } = sharedScanCache;
    if (!scan || scan.length === 0) return;

    const now = new Date().toISOString();
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString(); // 24u cooldown per asset

    for (const entry of scan) {
      if (entry.score < 70 || entry.color !== "green") continue;

      // Check if already have open signal for this asset (within 24h)
      const existing = db.prepare(
        "SELECT id FROM marcus_signals WHERE symbol = ? AND (status = 'open' OR created_at > ?)"
      ).get(entry.symbol, cutoff);
      if (existing) continue;

      const sl = parseFloat((entry.price * 0.97).toFixed(2));
      const target = parseFloat((entry.price * 1.06).toFixed(2));

      db.prepare(`
        INSERT INTO marcus_signals (asset, symbol, direction, entry_price, stop_loss, target, rsi, score, trend)
        VALUES (?, ?, 'long', ?, ?, ?, ?, ?, ?)
      `).run(entry.name ?? entry.ticker, entry.symbol, entry.price, sl, target, entry.rsi, entry.score, entry.trend);

      const signalId = (db.prepare("SELECT last_insert_rowid() as id").get() as { id: number }).id;

      // Auto-copy voor gebruikers met copy_trading ingeschakeld
      const copyUsers = db.prepare(
        "SELECT user_id FROM settings WHERE copy_trading = 1"
      ).all() as { user_id: number }[];

      for (const { user_id } of copyUsers) {
        autoOpenPaperTrade(db, user_id, entry.name ?? entry.ticker, entry.symbol, entry.price, sl, target, signalId);
      }
    }

    // Sluit verlopen/gerichte signals
    const openSignals = db.prepare("SELECT * FROM marcus_signals WHERE status = 'open'").all() as MarcusSignalRow[];
    for (const sig of openSignals) {
      const cached = scan.find(s => s.symbol === sig.symbol);
      if (!cached) continue;

      const p = cached.price;
      let newStatus: string | null = null;

      if (p <= sig.stop_loss) newStatus = "hit_stop";
      else if (p >= sig.target) newStatus = "hit_target";
      else {
        const ageMs = Date.now() - new Date(sig.created_at).getTime();
        if (ageMs > 14 * 24 * 3600 * 1000) newStatus = "expired";
      }

      if (newStatus) {
        db.prepare("UPDATE marcus_signals SET status = ?, close_price = ?, closed_at = ? WHERE id = ?")
          .run(newStatus, p, now, sig.id);
      }
    }
  } catch { /* stilletjes falen */ }
}

// --- Accountability partner matching ---

function runPartnerMatching(): void {
  try {
    const db = getDb();

    // Vind alle opt-in gebruikers zonder actieve partner
    const candidates = db.prepare(`
      SELECT po.user_id,
        COALESCE((SELECT COUNT(*) FROM quiz_shown WHERE user_id = po.user_id AND correct = 1), 0) as correct_answers
      FROM partner_opt_in po
      WHERE po.opted_in = 1
        AND NOT EXISTS (
          SELECT 1 FROM partnerships p
          WHERE (p.user_a = po.user_id OR p.user_b = po.user_id) AND p.status = 'active'
        )
      ORDER BY correct_answers ASC
    `).all() as { user_id: number; correct_answers: number }[];

    // Match pairs op vergelijkbaar niveau (adjacent in gesorteerde lijst)
    for (let i = 0; i + 1 < candidates.length; i += 2) {
      const a = candidates[i];
      const b = candidates[i + 1];
      // Niveau verschil max 50 correct answers (ca. 1 level)
      if (Math.abs(a.correct_answers - b.correct_answers) > 50) continue;

      const userA = Math.min(a.user_id, b.user_id);
      const userB = Math.max(a.user_id, b.user_id);

      db.prepare(`
        INSERT OR IGNORE INTO partnerships (user_a, user_b, status)
        VALUES (?, ?, 'active')
      `).run(userA, userB);
    }
  } catch { /* stilletjes falen */ }
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
    if (gm.status === "fulfilled") cachedGlobalMetrics = { data: gm.value, ts: Date.now() };
    if (fr.status === "fulfilled") cachedFunding      = { data: fr.value, ts: Date.now() };

    // Signal engine — genereer Marcus signals na data update
    runSignalEngine();

    // Accountability partner matching — koppel opt-in gebruikers zonder partner
    runPartnerMatching();
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

  // Direct eerste run: eerst alle crypto assets, dan externe data
  fetchAllCryptoSnapshots();
  pollAll();

  // Crypto prijzen elke 5 minuten — 24/7 alle sessies (Aziatisch, Europees, VS)
  setInterval(fetchAllCryptoSnapshots, CRYPTO_POLL_INTERVAL);

  // Externe data (FearGreed, CoinGecko, funding) elke 30 minuten
  setInterval(pollAll, POLL_INTERVAL);

  // Dagelijkse reminder wordt afgehandeld door /api/cron/daily-reminder (serverkant cron 19:00)
  // setInterval(runDailyReminderJob, 60_000);  — uitgeschakeld om dubbele emails te voorkomen

  // Wekelijkse streak freeze reload elke minuut — herlaadt elke maandag om 06:00
  setInterval(runWeeklyFreezeReload, 60_000);

  // Wekelijks league job elke minuut — snapshots zondag 23:55
  setInterval(runWeeklyLeagueJob, 60_000);

  // Dagelijkse morning brief elke minuut — genereert om 08:45
  setInterval(runMorningBriefJob, 60_000);
}

// --- Wekelijks league systeem (zondag 23:55) ---

let leagueJobWeek = "";

function runWeeklyLeagueJob(): void {
  const now = new Date();
  if (now.getDay() !== 0 || now.getHours() !== 23 || now.getMinutes() < 55) return;
  const weekNum = String(Math.floor(Date.now() / (7 * 86_400_000)));
  if (leagueJobWeek === weekNum) return;
  leagueJobWeek = weekNum;

  try {
    const db = getDb();
    const TIERS = 5;
    const PROMOTE = 3;
    const DEGRADE = 3;

    const users = db.prepare(
      "SELECT id, week_score, league_tier FROM users WHERE week_score > 0"
    ).all() as { id: number; week_score: number; league_tier: number }[];

    const byTier = new Map<number, typeof users>();
    for (const u of users) {
      const t = Math.max(1, Math.min(TIERS, u.league_tier));
      if (!byTier.has(t)) byTier.set(t, []);
      byTier.get(t)!.push(u);
    }

    const tierChanges = new Map<number, number>();

    for (const [tier, tierUsers] of byTier) {
      tierUsers.sort((a, b) => b.week_score - a.week_score);
      tierUsers.forEach((u, idx) => {
        db.prepare(
          "INSERT OR REPLACE INTO league_scores (week, user_id, tier, score, rank) VALUES (?, ?, ?, ?, ?)"
        ).run(weekNum, u.id, tier, u.week_score, idx + 1);

        let newTier = tier;
        if (idx < PROMOTE && tier < TIERS) newTier = tier + 1;
        else if (idx >= tierUsers.length - DEGRADE && tier > 1) newTier = tier - 1;
        tierChanges.set(u.id, newTier);
      });
    }

    for (const [uid, newTier] of tierChanges) {
      db.prepare("UPDATE users SET league_tier = ?, week_score = 0, week_key = '' WHERE id = ?").run(newTier, uid);
    }
    // Reset inactieve gebruikers
    db.prepare("UPDATE users SET week_score = 0, week_key = '' WHERE week_score > 0 AND id NOT IN (SELECT user_id FROM league_scores WHERE week = ?)").run(weekNum);
  } catch { /* stilletjes falen */ }
}

// --- Wekelijkse streak freeze reload (maandag 06:00) ---

let freezeReloadWeek = "";

function runWeeklyFreezeReload(): void {
  const now = new Date();
  if (now.getDay() !== 1 || now.getHours() !== 6) return; // alleen maandag 06:00
  const week = `${now.getFullYear()}-W${String(Math.ceil((now.getDate() - now.getDay() + 10) / 7)).padStart(2, "0")}`;
  if (freezeReloadWeek === week) return;
  freezeReloadWeek = week;

  try {
    const db = getDb();
    // Herlaad freeze naar 1 voor alle gebruikers die de freeze al hebben gebruikt (streak_freeze < 1)
    db.prepare("UPDATE users SET streak_freeze = 1, streak_freeze_week = ? WHERE streak_freeze < 1").run(week);
  } catch { /* stilletjes falen */ }
}

// --- Morning Brief (08:45) ---

let morningBriefDate = "";

async function runMorningBriefJob(): Promise<void> {
  const now = new Date();
  const hour = now.getHours();
  const min  = now.getMinutes();
  const today = now.toISOString().slice(0, 10);

  // Alleen 08:45–08:49, eenmalig per dag
  if (hour !== 8 || min < 45 || morningBriefDate === today) return;
  morningBriefDate = today;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return;

  // Haal marktdata op — gebruik bestaande cache of fetch vers
  const btcEntry = sharedScanCache.data?.find(e => e.ticker === "BTC" || e.symbol === "BTCUSDT");
  const ethEntry = sharedScanCache.data?.find(e => e.ticker === "ETH" || e.symbol === "ETHUSDT");
  const fearGreed = cachedFearGreed?.data ?? "onbekend";

  const marketCtx = [
    `BTC: $${btcEntry ? btcEntry.price.toLocaleString("nl-NL") : "?"} (${btcEntry ? (btcEntry.change24h >= 0 ? "+" : "") + btcEntry.change24h.toFixed(1) + "%" : "?"})`,
    btcEntry ? `RSI BTC: ${btcEntry.rsi.toFixed(0)}, trend: ${btcEntry.trend}` : "",
    ethEntry ? `ETH: $${ethEntry.price.toLocaleString("nl-NL")} (${ethEntry.change24h >= 0 ? "+" : ""}${ethEntry.change24h.toFixed(1)}%)` : "",
    `Fear & Greed: ${fearGreed}`,
    `Datum: ${today}`,
  ].filter(Boolean).join("\n");

  // 3 niveau-groepen: 1-2 (beginner), 3-4 (gevorderd), 5-6 (expert)
  const GROUPS: { group: number; systemPrompt: string }[] = [
    {
      group: 1,
      systemPrompt: `You are Marcus, a direct trading coach. Write a short Morning Brief (max 120 words) for BEGINNERS (level 1-2).
Tone: direct, motivating but honest. NO jargon — explain every concept immediately in plain language.
Structure: 1 sentence market overview → 1 concrete learning point for today → 1 tip to practice today (paper trading or quiz).
Address the reader as "you". End with a short call to action.
Write in the language that matches the market data language provided.`,
    },
    {
      group: 2,
      systemPrompt: `You are Marcus, a direct trading coach. Write a Morning Brief (max 150 words) for INTERMEDIATE traders (level 3-4).
Tone: analytical, direct. Use trading terms but briefly explain complex concepts.
Structure: market analysis (RSI, trend, what it means) → a concrete setup or pattern to watch today → risk management reminder.
Address the reader as "you". End with a concrete action.
Write in the language that matches the market data language provided.`,
    },
    {
      group: 3,
      systemPrompt: `You are Marcus, a direct trading coach. Write a Morning Brief (max 180 words) for EXPERIENCED traders (level 5-6).
Tone: direct, no sugarcoating. Use the full trading vocabulary (RSI, funding rates, dominance, trend confluence, invalidation).
Structure: macro context → technical analysis BTC/ETH → concrete setup thesis with entry/invalidation → mindset reminder.
No motivational fluff — only what works.
Write in the language that matches the market data language provided.`,
    },
  ];

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });
  const db = getDb();

  for (const { group, systemPrompt } of GROUPS) {
    // Check of al bestaat voor vandaag
    const existing = db.prepare("SELECT id FROM market_briefs WHERE date = ? AND level_group = ?").get(today, group);
    if (existing) continue;

    try {
      const msg = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Marktdata van vandaag:\n${marketCtx}\n\nGenereer de Morning Brief.`,
        }],
      });

      const content = (msg.content[0] as { text: string }).text.trim();
      db.prepare("INSERT OR IGNORE INTO market_briefs (date, level_group, content) VALUES (?, ?, ?)").run(today, group, content);
    } catch { /* stilletjes falen — morgen opnieuw */ }
  }
}

// --- Dagelijkse missie-reminder om 19:00 ---

let reminderSentDate = "";

async function runDailyReminderJob(): Promise<void> {
  const now = new Date();
  const hour = now.getHours();
  const today = now.toISOString().slice(0, 10);

  // Alleen tussen 19:00 en 19:05 sturen, eenmalig per dag
  if (hour !== 19 || reminderSentDate === today) return;
  reminderSentDate = today;

  try {
    const db = getDb();
    const users = db.prepare(`
      SELECT u.id, u.email, u.username as name, u.reminder_opt_out,
             qp.last_quiz_date
      FROM users u
      LEFT JOIN quiz_progress qp ON qp.user_id = u.id
      WHERE u.email IS NOT NULL
        AND (u.reminder_opt_out IS NULL OR u.reminder_opt_out = 0)
    `).all() as { id: number; email: string; name: string; reminder_opt_out: number; last_quiz_date: string | null }[];

    for (const user of users) {
      // Sla over als quiz al gedaan vandaag
      if (user.last_quiz_date === today) continue;

      // Token = base64 van user id (eenvoudige opt-out, geen geheim nodig)
      const token = Buffer.from(String(user.id)).toString("base64url");
      await sendReminderEmail({ to: user.email, name: user.name ?? "trader", token }).catch(() => { /* stilletjes falen */ });
    }
  } catch { /* stilletjes falen */ }
}
