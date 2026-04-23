/**
 * Bot Runner — voert actieve bots uit
 *
 * Exchanges: bitvavo, binance, coinbase (later), kraken (later)
 * Strategieën: dca, ema200, rsi, breakout, pullback, ema_cross, macd
 *
 * Wordt aangeroepen door /api/bots/run (cron-route, elke 5 minuten)
 */

import { getDb } from "@/db/db";
import { bitvavRequest } from "@/lib/bitvavo";
import { binanceGetPrice, binanceGetCandles, binancePlaceOrder } from "@/lib/binance";
import { bybitPlaceOrder, bybitGetPrice, bybitGetCandles } from "@/lib/bybit";

type BotRow = {
  id: number;
  user_id: number;
  name: string;
  strategy: string;
  config: string;
  exchange: string;
  symbol: string;
  active: number;
  simulation: number; // 1 = simulatie — geen echte orders
};

type Settings = {
  bitvavo_api_key: string;
  bitvavo_api_secret: string;
  binance_api_key: string;
  binance_api_secret: string;
  bybit_api_key: string;
  bybit_api_secret: string;
};

type ExchangeKeys = {
  apiKey: string;
  apiSecret: string;
  exchange: string;
};

type DcaConfig = {
  amount_eur: number;
  interval_minutes: number;
};

type RsiConfig = {
  buy_below: number;
  sell_above: number;
  amount_eur: number;
};

type BreakoutConfig = {
  resistance: number;
  amount_eur: number;
};

// ─── Exchange-agnostische helpers ────────────────────────────────────────────

async function getPrice(symbol: string, exchange: string): Promise<number> {
  if (exchange === "binance") return binanceGetPrice(symbol);
  if (exchange === "bybit")   return bybitGetPrice(symbol);
  // Bitvavo (default)
  const pair = symbol.includes("-") ? symbol : `${symbol}-EUR`;
  const res = await fetch(`https://api.bitvavo.com/v2/ticker/price?market=${pair}`);
  const data = await res.json() as { price?: string };
  return parseFloat(data.price ?? "0");
}

// Haal candles op — exchange-agnostisch
async function getCandles(symbol: string, interval: string, limit: number, exchange = "bitvavo"): Promise<number[]> {
  if (exchange === "binance") return binanceGetCandles(symbol, interval, limit);
  if (exchange === "bybit")   return bybitGetCandles(symbol, interval, limit);
  // Bitvavo
  const pair = symbol.includes("-") ? symbol : `${symbol}-EUR`;
  const res = await fetch(
    `https://api.bitvavo.com/v2/${pair}/candles?interval=${interval}&limit=${limit}`
  );
  const candles = await res.json() as [number, string, string, string, string, string][];
  if (!Array.isArray(candles)) return [];
  return candles.map(c => parseFloat(c[4])).reverse();
}

// EMA berekenen over een reeks closes
function calcEma(closes: number[], period: number): number[] {
  if (closes.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

// Bereken RSI(14) op basis van 4H candles
async function getRsi(symbol: string, period = 14, interval = "4h", exchange = "bitvavo"): Promise<number> {
  const closes = await getCandles(symbol, interval, period + 1, exchange);
  if (closes.length < period + 1) return 50;

  let gains = 0, losses = 0;
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Bereken MACD (12, 26, 9) — geeft terug { macd, signal }
async function getMacd(symbol: string, exchange = "bitvavo"): Promise<{ macd: number; signal: number; prev_macd: number; prev_signal: number }> {
  const closes = await getCandles(symbol, "1h", 100, exchange);
  if (closes.length < 35) return { macd: 0, signal: 0, prev_macd: 0, prev_signal: 0 };

  const ema12 = calcEma(closes, 12);
  const ema26 = calcEma(closes, 26);
  const offset = ema12.length - ema26.length;
  const macdLine = ema26.map((v, i) => ema12[i + offset] - v);
  const signalLine = calcEma(macdLine, 9);
  const sigOffset = macdLine.length - signalLine.length;

  return {
    macd:        macdLine[macdLine.length - 1],
    signal:      signalLine[signalLine.length - 1],
    prev_macd:   macdLine[macdLine.length - 2],
    prev_signal: signalLine[signalLine.length - 1 - sigOffset + (sigOffset > 0 ? sigOffset - 1 : 0)],
  };
}

// Plaatst een marktorder — exchange-agnostisch, of simuleert als simulation=true
async function placeOrder(
  keys: ExchangeKeys,
  symbol: string,
  side: "buy" | "sell",
  amount: number,
  simulation = false
): Promise<{ orderId?: string; error?: string }> {
  // Simulatiemodus: sla de order over maar doe alsof het gelukt is
  if (simulation) return { orderId: `sim_${Date.now()}` };

  if (keys.exchange === "binance") {
    const result = await binancePlaceOrder(
      keys.apiKey, keys.apiSecret, symbol,
      side === "buy" ? "BUY" : "SELL", amount
    );
    return { orderId: result.orderId ? String(result.orderId) : undefined, error: result.error };
  }
  if (keys.exchange === "bybit") {
    const result = await bybitPlaceOrder(
      keys.apiKey, keys.apiSecret, symbol,
      side === "buy" ? "Buy" : "Sell", amount
    );
    return result;
  }
  // Bitvavo (default)
  const pair = symbol.includes("-") ? symbol : `${symbol}-EUR`;
  const body = { market: pair, side, orderType: "market", amountQuote: String(amount) };
  const result = await bitvavRequest(keys.apiKey, keys.apiSecret, "POST", "/order", body) as { orderId?: string; error?: string };
  return result;
}

function logRun(
  botId: number,
  userId: number,
  action: string,
  symbol: string,
  side: string,
  amount: number,
  price: number,
  status: string,
  note: string
) {
  const db = getDb();
  db.prepare(
    "INSERT INTO bot_runs (bot_id, user_id, action, symbol, side, amount, price, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(botId, userId, action, symbol, side, amount, price, status, note);
}

// DCA: controleer of het interval verstreken is en koop dan
async function runDca(bot: BotRow, cfg: DcaConfig, keys: ExchangeKeys) {
  const db = getDb();
  const lastRun = db.prepare(
    "SELECT created_at FROM bot_runs WHERE bot_id = ? AND action = 'dca' ORDER BY created_at DESC LIMIT 1"
  ).get(bot.id) as { created_at: string } | undefined;

  const intervalMs = (cfg.interval_minutes ?? 1440) * 60 * 1000;
  const lastTs = lastRun ? new Date(lastRun.created_at).getTime() : 0;
  if (Date.now() - lastTs < intervalMs) return; // nog niet tijd

  const price = await getPrice(bot.symbol, keys.exchange);
  const result = await placeOrder(keys, bot.symbol, "buy", cfg.amount_eur, !!bot.simulation);
  const status = result.error ? "error" : bot.simulation ? "simulated" : "ok";
  logRun(bot.id, bot.user_id, "dca", bot.symbol, "buy", cfg.amount_eur, price, status, result.error ?? result.orderId ?? "");
}

// RSI: koop als RSI < buy_below, verkoop als RSI > sell_above
async function runRsi(bot: BotRow, cfg: RsiConfig, keys: ExchangeKeys) {
  const rsi   = await getRsi(bot.symbol, 14, "4h", keys.exchange);
  const price = await getPrice(bot.symbol, keys.exchange);

  if (rsi < (cfg.buy_below ?? 30)) {
    const result = await placeOrder(keys, bot.symbol, "buy", cfg.amount_eur, !!bot.simulation);
    logRun(bot.id, bot.user_id, "rsi_buy", bot.symbol, "buy", cfg.amount_eur, price,
      result.error ? "error" : bot.simulation ? "simulated" : "ok", result.error ?? result.orderId ?? "");
  } else if (rsi > (cfg.sell_above ?? 70)) {
    const result = await placeOrder(keys, bot.symbol, "sell", cfg.amount_eur, !!bot.simulation);
    logRun(bot.id, bot.user_id, "rsi_sell", bot.symbol, "sell", cfg.amount_eur, price,
      result.error ? "error" : bot.simulation ? "simulated" : "ok", result.error ?? result.orderId ?? "");
  }
}

// Breakout: koop als huidige prijs boven resistance
async function runBreakout(bot: BotRow, cfg: BreakoutConfig, keys: ExchangeKeys) {
  const db    = getDb();
  const price = await getPrice(bot.symbol, keys.exchange);
  if (price <= cfg.resistance) return;

  const recent = db.prepare(
    "SELECT id FROM bot_runs WHERE bot_id = ? AND action = 'breakout_buy' AND created_at > datetime('now', '-1 day') LIMIT 1"
  ).get(bot.id);
  if (recent) return;

  const result = await placeOrder(keys, bot.symbol, "buy", cfg.amount_eur, !!bot.simulation);
  logRun(bot.id, bot.user_id, "breakout_buy", bot.symbol, "buy", cfg.amount_eur, price,
    result.error ? "error" : bot.simulation ? "simulated" : "ok", result.error ?? result.orderId ?? "");
}

// EMA200: lang termijn trend volgen
async function runEma200(bot: BotRow, cfg: { amount_eur: number }, keys: ExchangeKeys) {
  const db     = getDb();
  const closes = await getCandles(bot.symbol, "1d", 220, keys.exchange);
  if (closes.length < 200) return;

  const ema200arr = calcEma(closes, 200);
  const ema200    = ema200arr[ema200arr.length - 1];
  const price     = closes[closes.length - 1];
  const aboveEma  = price > ema200;

  const lastRun   = db.prepare(
    "SELECT action FROM bot_runs WHERE bot_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(bot.id) as { action: string } | undefined;
  const lastAction = lastRun?.action ?? "";

  if (aboveEma && lastAction !== "ema200_buy") {
    const result = await placeOrder(keys, bot.symbol, "buy", cfg.amount_eur, !!bot.simulation);
    logRun(bot.id, bot.user_id, "ema200_buy", bot.symbol, "buy", cfg.amount_eur, price,
      result.error ? "error" : bot.simulation ? "simulated" : "ok", result.error ?? result.orderId ?? "");
  } else if (!aboveEma && lastAction === "ema200_buy") {
    const result = await placeOrder(keys, bot.symbol, "sell", cfg.amount_eur, !!bot.simulation);
    logRun(bot.id, bot.user_id, "ema200_sell", bot.symbol, "sell", cfg.amount_eur, price,
      result.error ? "error" : bot.simulation ? "simulated" : "ok", result.error ?? result.orderId ?? "");
  }
}

// Pullback naar EMA50 in uptrend
async function runPullback(bot: BotRow, cfg: { amount_eur: number }, keys: ExchangeKeys) {
  const db     = getDb();
  const closes = await getCandles(bot.symbol, "4h", 220, keys.exchange);
  if (closes.length < 200) return;

  const ema50arr  = calcEma(closes, 50);
  const ema200arr = calcEma(closes, 200);
  const ema50     = ema50arr[ema50arr.length - 1];
  const ema200    = ema200arr[ema200arr.length - 1];
  const price     = closes[closes.length - 1];

  if (price <= ema200) return; // geen uptrend
  if (price > ema50 * 1.01 || price < ema50 * 0.99) return; // niet dicht bij EMA50

  const recent = db.prepare(
    "SELECT id FROM bot_runs WHERE bot_id = ? AND action = 'pullback_buy' AND created_at > datetime('now', '-2 day') LIMIT 1"
  ).get(bot.id);
  if (recent) return;

  const result = await placeOrder(keys, bot.symbol, "buy", cfg.amount_eur, !!bot.simulation);
  logRun(bot.id, bot.user_id, "pullback_buy", bot.symbol, "buy", cfg.amount_eur, price,
    result.error ? "error" : bot.simulation ? "simulated" : "ok", result.error ?? result.orderId ?? "");
}

// EMA Cross 9/21 (1H)
async function runEmaCross(bot: BotRow, cfg: { amount_eur: number }, keys: ExchangeKeys) {
  const closes = await getCandles(bot.symbol, "1h", 60, keys.exchange);
  if (closes.length < 22) return;

  const ema9arr  = calcEma(closes, 9);
  const ema21arr = calcEma(closes, 21);
  const ema9_now  = ema9arr[ema9arr.length - 1];
  const ema21_now = ema21arr[ema21arr.length - 1];
  const ema9_prev  = ema9arr[ema9arr.length - 2];
  const ema21_prev = ema21arr[ema21arr.length - 2];
  const price = closes[closes.length - 1];

  if (ema9_prev < ema21_prev && ema9_now > ema21_now) {
    const result = await placeOrder(keys, bot.symbol, "buy", cfg.amount_eur, !!bot.simulation);
    logRun(bot.id, bot.user_id, "ema_cross_buy", bot.symbol, "buy", cfg.amount_eur, price,
      result.error ? "error" : bot.simulation ? "simulated" : "ok", result.error ?? result.orderId ?? "");
  } else if (ema9_prev > ema21_prev && ema9_now < ema21_now) {
    const result = await placeOrder(keys, bot.symbol, "sell", cfg.amount_eur, !!bot.simulation);
    logRun(bot.id, bot.user_id, "ema_cross_sell", bot.symbol, "sell", cfg.amount_eur, price,
      result.error ? "error" : bot.simulation ? "simulated" : "ok", result.error ?? result.orderId ?? "");
  }
}

// MACD kruising (1H)
async function runMacd(bot: BotRow, cfg: { amount_eur: number }, keys: ExchangeKeys) {
  const { macd, signal, prev_macd, prev_signal } = await getMacd(bot.symbol, keys.exchange);
  const price = await getPrice(bot.symbol, keys.exchange);

  if (prev_macd < prev_signal && macd > signal) {
    const result = await placeOrder(keys, bot.symbol, "buy", cfg.amount_eur, !!bot.simulation);
    logRun(bot.id, bot.user_id, "macd_buy", bot.symbol, "buy", cfg.amount_eur, price,
      result.error ? "error" : bot.simulation ? "simulated" : "ok", result.error ?? result.orderId ?? "");
  } else if (prev_macd > prev_signal && macd < signal) {
    const result = await placeOrder(keys, bot.symbol, "sell", cfg.amount_eur, !!bot.simulation);
    logRun(bot.id, bot.user_id, "macd_sell", bot.symbol, "sell", cfg.amount_eur, price,
      result.error ? "error" : bot.simulation ? "simulated" : "ok", result.error ?? result.orderId ?? "");
  }
}

// Hoofdfunctie — draait alle actieve bots
export async function runAllBots() {
  const db   = getDb();
  const bots = db.prepare("SELECT * FROM bots WHERE active = 1").all() as BotRow[];

  for (const bot of bots) {
    const settings = db.prepare(
      "SELECT bitvavo_api_key, bitvavo_api_secret, binance_api_key, binance_api_secret, bybit_api_key, bybit_api_secret FROM settings WHERE user_id = ?"
    ).get(bot.user_id) as Settings | undefined;

    // Kies de juiste API-sleutels op basis van exchange
    // Als exchange geen keys heeft maar simulatie aan staat → toch draaien
    let keys: ExchangeKeys | null = null;
    if (bot.exchange === "binance" && settings?.binance_api_key) {
      keys = { apiKey: settings.binance_api_key, apiSecret: settings.binance_api_secret, exchange: "binance" };
    } else if (bot.exchange === "bybit" && settings?.bybit_api_key) {
      keys = { apiKey: settings.bybit_api_key, apiSecret: settings.bybit_api_secret, exchange: "bybit" };
    } else if (settings?.bitvavo_api_key) {
      keys = { apiKey: settings.bitvavo_api_key, apiSecret: settings.bitvavo_api_secret, exchange: "bitvavo" };
    } else if (bot.simulation) {
      // Geen exchange keys maar simulatie — gebruik Binance als data-bron, geen echte orders
      keys = { apiKey: "", apiSecret: "", exchange: "binance" };
    }
    if (!keys) continue;

    const cfg = JSON.parse(bot.config);
    try {
      if (bot.strategy === "dca")       await runDca(bot, cfg as DcaConfig, keys);
      if (bot.strategy === "rsi")       await runRsi(bot, cfg as RsiConfig, keys);
      if (bot.strategy === "breakout")  await runBreakout(bot, cfg as BreakoutConfig, keys);
      if (bot.strategy === "ema200")    await runEma200(bot, cfg as { amount_eur: number }, keys);
      if (bot.strategy === "pullback")  await runPullback(bot, cfg as { amount_eur: number }, keys);
      if (bot.strategy === "ema_cross") await runEmaCross(bot, cfg as { amount_eur: number }, keys);
      if (bot.strategy === "macd")      await runMacd(bot, cfg as { amount_eur: number }, keys);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logRun(bot.id, bot.user_id, "error", bot.symbol, "", 0, 0, "error", msg);
    }
  }
}
