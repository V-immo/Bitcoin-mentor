/**
 * Bot Runner — voert actieve bots uit
 *
 * Strategieën:
 *  - dca:      koop elke X minuten een vast bedrag
 *  - rsi:      koop als RSI < drempel, verkoop als RSI > drempel
 *  - breakout: koop als prijs boven resistance breekt
 *
 * Wordt aangeroepen door /api/bots/run (cron-route, elke 5 minuten)
 */

import { getDb } from "@/db/db";
import { bitvavRequest } from "@/lib/bitvavo";

type BotRow = {
  id: number;
  user_id: number;
  name: string;
  strategy: string;
  config: string;
  exchange: string;
  symbol: string;
  active: number;
};

type Settings = {
  bitvavo_api_key: string;
  bitvavo_api_secret: string;
};

type DcaConfig = {
  amount_eur: number;       // te kopen bedrag per run in EUR
  interval_minutes: number; // elke X minuten uitvoeren
};

type RsiConfig = {
  buy_below: number;   // RSI onder deze drempel: koop
  sell_above: number;  // RSI boven deze drempel: verkoop
  amount_eur: number;
};

type BreakoutConfig = {
  resistance: number;  // prijs boven dit niveau: koop
  amount_eur: number;
};

// Haal huidige prijs op via Bitvavo public API
async function getPrice(symbol: string): Promise<number> {
  const pair = symbol.includes("-") ? symbol : `${symbol}-EUR`;
  const res = await fetch(`https://api.bitvavo.com/v2/ticker/price?market=${pair}`);
  const data = await res.json() as { price?: string };
  return parseFloat(data.price ?? "0");
}

// Haal candles op van Bitvavo
async function getCandles(symbol: string, interval: string, limit: number): Promise<number[]> {
  const pair = symbol.includes("-") ? symbol : `${symbol}-EUR`;
  const res = await fetch(
    `https://api.bitvavo.com/v2/${pair}/candles?interval=${interval}&limit=${limit}`
  );
  const candles = await res.json() as [number, string, string, string, string, string][];
  if (!Array.isArray(candles)) return [];
  // Bitvavo geeft nieuwste eerst terug — omdraaien voor chronologische volgorde
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
async function getRsi(symbol: string, period = 14, interval = "4h"): Promise<number> {
  const closes = await getCandles(symbol, interval, period + 1);
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
async function getMacd(symbol: string): Promise<{ macd: number; signal: number; prev_macd: number; prev_signal: number }> {
  const closes = await getCandles(symbol, "1h", 100);
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

// Plaatst een marktorder via Bitvavo
async function placeOrder(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  side: "buy" | "sell",
  amountEur: number
): Promise<{ orderId?: string; error?: string }> {
  const pair = symbol.includes("-") ? symbol : `${symbol}-EUR`;
  const body = {
    market: pair,
    side,
    orderType: "market",
    amountQuote: String(amountEur), // in EUR
  };
  const result = await bitvavRequest(apiKey, apiSecret, "POST", "/order", body) as { orderId?: string; error?: string };
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
async function runDca(bot: BotRow, cfg: DcaConfig, apiKey: string, apiSecret: string) {
  const db = getDb();
  const lastRun = db.prepare(
    "SELECT created_at FROM bot_runs WHERE bot_id = ? AND action = 'dca' ORDER BY created_at DESC LIMIT 1"
  ).get(bot.id) as { created_at: string } | undefined;

  const intervalMs = (cfg.interval_minutes ?? 1440) * 60 * 1000;
  const lastTs = lastRun ? new Date(lastRun.created_at).getTime() : 0;
  if (Date.now() - lastTs < intervalMs) return; // nog niet tijd

  const price = await getPrice(bot.symbol);
  const result = await placeOrder(apiKey, apiSecret, bot.symbol, "buy", cfg.amount_eur);
  const status = result.error ? "error" : "ok";
  const note   = result.error ?? result.orderId ?? "";
  logRun(bot.id, bot.user_id, "dca", bot.symbol, "buy", cfg.amount_eur, price, status, note);
}

// RSI: koop als RSI < buy_below, verkoop als RSI > sell_above
async function runRsi(bot: BotRow, cfg: RsiConfig, apiKey: string, apiSecret: string) {
  const rsi = await getRsi(bot.symbol);
  const price = await getPrice(bot.symbol);

  if (rsi < (cfg.buy_below ?? 30)) {
    const result = await placeOrder(apiKey, apiSecret, bot.symbol, "buy", cfg.amount_eur);
    const status = result.error ? "error" : "ok";
    logRun(bot.id, bot.user_id, "rsi_buy", bot.symbol, "buy", cfg.amount_eur, price, status, result.error ?? result.orderId ?? "");
  } else if (rsi > (cfg.sell_above ?? 70)) {
    // Verkoop alle holdings — gebruik amount_eur als indicatie maar verkoop in base currency
    const result = await placeOrder(apiKey, apiSecret, bot.symbol, "sell", cfg.amount_eur);
    const status = result.error ? "error" : "ok";
    logRun(bot.id, bot.user_id, "rsi_sell", bot.symbol, "sell", cfg.amount_eur, price, status, result.error ?? result.orderId ?? "");
  }
}

// Breakout: koop als huidige prijs boven resistance
async function runBreakout(bot: BotRow, cfg: BreakoutConfig, apiKey: string, apiSecret: string) {
  const db = getDb();
  const price = await getPrice(bot.symbol);
  if (price <= cfg.resistance) return;

  // Geen dubbele entry binnen 24 uur
  const recent = db.prepare(
    "SELECT id FROM bot_runs WHERE bot_id = ? AND action = 'breakout_buy' AND created_at > datetime('now', '-1 day') LIMIT 1"
  ).get(bot.id);
  if (recent) return;

  const result = await placeOrder(apiKey, apiSecret, bot.symbol, "buy", cfg.amount_eur);
  const status = result.error ? "error" : "ok";
  logRun(bot.id, bot.user_id, "breakout_buy", bot.symbol, "buy", cfg.amount_eur, price, status, result.error ?? result.orderId ?? "");
}

// EMA200: koop als prijs > EMA200, verkoop als prijs < EMA200 (lang termijn trend)
async function runEma200(bot: BotRow, cfg: { amount_eur: number }, apiKey: string, apiSecret: string) {
  const db = getDb();
  const closes = await getCandles(bot.symbol, "1d", 220);
  if (closes.length < 200) return;

  const ema200arr = calcEma(closes, 200);
  const ema200 = ema200arr[ema200arr.length - 1];
  const price  = closes[closes.length - 1];
  const aboveEma = price > ema200;

  const lastRun = db.prepare(
    "SELECT action FROM bot_runs WHERE bot_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(bot.id) as { action: string } | undefined;

  const lastAction = lastRun?.action ?? "";

  if (aboveEma && lastAction !== "ema200_buy") {
    const result = await placeOrder(apiKey, apiSecret, bot.symbol, "buy", cfg.amount_eur);
    logRun(bot.id, bot.user_id, "ema200_buy", bot.symbol, "buy", cfg.amount_eur, price,
      result.error ? "error" : "ok", result.error ?? result.orderId ?? "");
  } else if (!aboveEma && lastAction === "ema200_buy") {
    const result = await placeOrder(apiKey, apiSecret, bot.symbol, "sell", cfg.amount_eur);
    logRun(bot.id, bot.user_id, "ema200_sell", bot.symbol, "sell", cfg.amount_eur, price,
      result.error ? "error" : "ok", result.error ?? result.orderId ?? "");
  }
}

// Pullback naar EMA50: koop als in uptrend (prijs > EMA200) en prijs terugvalt naar EMA50
async function runPullback(bot: BotRow, cfg: { amount_eur: number }, apiKey: string, apiSecret: string) {
  const db = getDb();
  const closes = await getCandles(bot.symbol, "4h", 220);
  if (closes.length < 200) return;

  const ema50arr  = calcEma(closes, 50);
  const ema200arr = calcEma(closes, 200);
  const ema50  = ema50arr[ema50arr.length - 1];
  const ema200 = ema200arr[ema200arr.length - 1];
  const price  = closes[closes.length - 1];

  const inUptrend  = price > ema200;
  const nearEma50  = price <= ema50 * 1.01 && price >= ema50 * 0.99; // binnen 1% van EMA50

  if (!inUptrend || !nearEma50) return;

  // Geen dubbele entry binnen 2 dagen
  const recent = db.prepare(
    "SELECT id FROM bot_runs WHERE bot_id = ? AND action = 'pullback_buy' AND created_at > datetime('now', '-2 day') LIMIT 1"
  ).get(bot.id);
  if (recent) return;

  const result = await placeOrder(apiKey, apiSecret, bot.symbol, "buy", cfg.amount_eur);
  logRun(bot.id, bot.user_id, "pullback_buy", bot.symbol, "buy", cfg.amount_eur, price,
    result.error ? "error" : "ok", result.error ?? result.orderId ?? "");
}

// EMA Cross 9/21: koop bij golden cross, verkoop bij death cross (1H)
async function runEmaCross(bot: BotRow, cfg: { amount_eur: number }, apiKey: string, apiSecret: string) {
  const closes = await getCandles(bot.symbol, "1h", 60);
  if (closes.length < 22) return;

  const ema9arr  = calcEma(closes, 9);
  const ema21arr = calcEma(closes, 21);
  const offset   = ema9arr.length - ema21arr.length;

  const ema9_now  = ema9arr[ema9arr.length - 1];
  const ema21_now = ema21arr[ema21arr.length - 1];
  const ema9_prev  = ema9arr[ema9arr.length - 2];
  const ema21_prev = ema21arr[ema21arr.length - 2];

  const goldenCross = ema9_prev < ema21arr[ema21arr.length - 2 - offset + offset] && ema9_now > ema21_now;
  const deathCross  = ema9_prev > ema21_prev && ema9_now < ema21_now;

  const price = closes[closes.length - 1];

  if (goldenCross) {
    const result = await placeOrder(apiKey, apiSecret, bot.symbol, "buy", cfg.amount_eur);
    logRun(bot.id, bot.user_id, "ema_cross_buy", bot.symbol, "buy", cfg.amount_eur, price,
      result.error ? "error" : "ok", result.error ?? result.orderId ?? "");
  } else if (deathCross) {
    const result = await placeOrder(apiKey, apiSecret, bot.symbol, "sell", cfg.amount_eur);
    logRun(bot.id, bot.user_id, "ema_cross_sell", bot.symbol, "sell", cfg.amount_eur, price,
      result.error ? "error" : "ok", result.error ?? result.orderId ?? "");
  }
}

// MACD: koop bij bullish kruising, verkoop bij bearish kruising (1H)
async function runMacd(bot: BotRow, cfg: { amount_eur: number }, apiKey: string, apiSecret: string) {
  const { macd, signal, prev_macd, prev_signal } = await getMacd(bot.symbol);
  const price = await getPrice(bot.symbol);

  const bullishCross = prev_macd < prev_signal && macd > signal;
  const bearishCross = prev_macd > prev_signal && macd < signal;

  if (bullishCross) {
    const result = await placeOrder(apiKey, apiSecret, bot.symbol, "buy", cfg.amount_eur);
    logRun(bot.id, bot.user_id, "macd_buy", bot.symbol, "buy", cfg.amount_eur, price,
      result.error ? "error" : "ok", result.error ?? result.orderId ?? "");
  } else if (bearishCross) {
    const result = await placeOrder(apiKey, apiSecret, bot.symbol, "sell", cfg.amount_eur);
    logRun(bot.id, bot.user_id, "macd_sell", bot.symbol, "sell", cfg.amount_eur, price,
      result.error ? "error" : "ok", result.error ?? result.orderId ?? "");
  }
}

// Hoofdfunctie — draait alle actieve bots
export async function runAllBots() {
  const db = getDb();
  const bots = db.prepare("SELECT * FROM bots WHERE active = 1").all() as BotRow[];

  for (const bot of bots) {
    const settings = db.prepare(
      "SELECT bitvavo_api_key, bitvavo_api_secret FROM settings WHERE user_id = ?"
    ).get(bot.user_id) as Settings | undefined;

    if (!settings?.bitvavo_api_key || !settings?.bitvavo_api_secret) continue;

    const cfg = JSON.parse(bot.config);
    try {
      if (bot.strategy === "dca")       await runDca(bot, cfg as DcaConfig, settings.bitvavo_api_key, settings.bitvavo_api_secret);
      if (bot.strategy === "rsi")       await runRsi(bot, cfg as RsiConfig, settings.bitvavo_api_key, settings.bitvavo_api_secret);
      if (bot.strategy === "breakout")  await runBreakout(bot, cfg as BreakoutConfig, settings.bitvavo_api_key, settings.bitvavo_api_secret);
      if (bot.strategy === "ema200")    await runEma200(bot, cfg as { amount_eur: number }, settings.bitvavo_api_key, settings.bitvavo_api_secret);
      if (bot.strategy === "pullback")  await runPullback(bot, cfg as { amount_eur: number }, settings.bitvavo_api_key, settings.bitvavo_api_secret);
      if (bot.strategy === "ema_cross") await runEmaCross(bot, cfg as { amount_eur: number }, settings.bitvavo_api_key, settings.bitvavo_api_secret);
      if (bot.strategy === "macd")      await runMacd(bot, cfg as { amount_eur: number }, settings.bitvavo_api_key, settings.bitvavo_api_secret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logRun(bot.id, bot.user_id, "error", bot.symbol, "", 0, 0, "error", msg);
    }
  }
}
