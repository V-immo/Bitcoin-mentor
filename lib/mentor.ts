import { getBitcoinPrice } from "./btc";
import {
  analyzeTimeframe,
  buildResistanceZone,
  buildSupportZone,
  calculateRsi,
  detectResistance,
  detectStructure,
  detectSupport,
  filterClosedCandles,
  getCandles,
  volumeStrength,
} from "./market";
import { getYahooCandles, getYahooPrice } from "./yahoo";
import { isYahooAsset } from "./assets";
import type { AlertState, Candle, MentorSignal } from "./types";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function fmtRange(low: number, high: number): string {
  return `${Math.round(low).toLocaleString("en-US")} - ${Math.round(high).toLocaleString("en-US")}`;
}

function getAlertState(
  price: number,
  entryZoneLow: number,
  entryZoneHigh: number
): AlertState {
  if (price >= entryZoneLow && price <= entryZoneHigh) {
    return "Koopzone geraakt";
  }

  if (price > entryZoneHigh && price <= entryZoneHigh * 1.01) {
    return "Bijna in koopzone";
  }

  return "Geen alert";
}

export type TradingMode = "day" | "swing" | "long";

type FetchedCandles = {
  price: number;
  candles15m: Candle[];
  candles1h: Candle[];
  candles4h: Candle[];
  candles1d: Candle[];
};

// Haal candles op voor elk asset type (Binance crypto of Yahoo stock/metal)
async function fetchAllCandles(symbol: string, mode: TradingMode): Promise<FetchedCandles> {
  const empty: Candle[] = [];

  if (isYahooAsset(symbol)) {
    // Yahoo: geen 15m beschikbaar — gebruik 1H als kortste timeframe voor alle modes
    const [price, candles1d, rawHourly] = await Promise.all([
      getYahooPrice(symbol),
      getYahooCandles(symbol, "1d", "2y"),
      getYahooCandles(symbol, "1h", "3mo"),
    ]);
    const candles4h = rawHourly.filter((_, i) => i % 4 === 3);
    return { price, candles15m: rawHourly, candles1h: rawHourly, candles4h, candles1d };
  }

  if (mode === "day") {
    // Day trading: 15m voor zones, 1H + 4H voor trend context
    const [{ price }, candles15m, candles1h, candles4h, candles1d] = await Promise.all([
      getBitcoinPrice(symbol),
      getCandles("15m", 250, symbol),
      getCandles("1h", 100, symbol),
      getCandles("4h", 50, symbol),
      getCandles("1d", 30, symbol),
    ]);
    return { price, candles15m, candles1h, candles4h, candles1d };
  }

  if (mode === "long") {
    // Long term: daily voor zones, 4H voor trend context
    const [{ price }, candles4h, candles1d] = await Promise.all([
      getBitcoinPrice(symbol),
      getCandles("4h", 100, symbol),
      getCandles("1d", 365, symbol),
    ]);
    return { price, candles15m: empty, candles1h: candles4h, candles4h, candles1d };
  }

  // Swing (default): 4H voor zones, 1H + 1D voor context
  const [{ price }, candles1h, candles4h, candles1d] = await Promise.all([
    getBitcoinPrice(symbol),
    getCandles("1h", 250, symbol),
    getCandles("4h", 250, symbol),
    getCandles("1d", 250, symbol),
  ]);
  return { price, candles15m: empty, candles1h, candles4h, candles1d };
}

// Labels per trading mode
function getModeLabels(mode: TradingMode) {
  if (mode === "day") return {
    trendLabel: "4H trend",
    zoneLabel: "intraday koopzone",
    structureLabel: "1H structuur",
    rsiHigh: 70, rsiLow: 30,
    stopPct: 0.992,   // tight stop: 0.8%
    entryHighMult: 1.005,
  };
  if (mode === "long") return {
    trendLabel: "Weekly trend",
    zoneLabel: "accumulatiezone",
    structureLabel: "Daily structuur",
    rsiHigh: 78, rsiLow: 28,
    stopPct: 0.975,   // wijd stop: 2.5%
    entryHighMult: 1.02,
  };
  return {
    trendLabel: "4H trend",
    zoneLabel: "koopzone",
    structureLabel: "4H structuur",
    rsiHigh: 72, rsiLow: 35,
    stopPct: 0.985,
    entryHighMult: 1.01,
  };
}

export async function buildMentorSignal(symbol = "BTCUSDT", mode: TradingMode = "swing"): Promise<MentorSignal> {
  const warnings: string[] = [];
  const blockers: string[] = [];
  const labels = getModeLabels(mode);

  const { price, candles15m, candles1h, candles4h, candles1d } = await fetchAllCandles(symbol, mode);

  const closed15m = filterClosedCandles(candles15m);
  const closed1h = filterClosedCandles(candles1h);
  const closed4h = filterClosedCandles(candles4h);
  const closed1d = filterClosedCandles(candles1d);

  // Zones berekend op de kortste timeframe die bij de mode past
  const zoneCandles = mode === "day" ? closed15m : mode === "long" ? closed1d : closed4h;

  const tf1h = analyzeTimeframe("1h", closed1h);
  const tf4h = analyzeTimeframe("4h", closed4h);
  const tf1d = analyzeTimeframe("1d", closed1d);

  const structure4h = detectStructure(closed4h, 30);
  const structure1d = detectStructure(closed1d, 30);

  const rsi1h = calculateRsi(closed1h, 14);
  const rsi4h = calculateRsi(closed4h, 14);
  const rsi1d = calculateRsi(closed1d, 14);

  // Zones berekend op mode-specifieke timeframe (15m voor day, 4H voor swing, 1D voor long)
  const support = detectSupport(zoneCandles, 50);
  const resistance = detectResistance(zoneCandles, 50);

  const supportZone = buildSupportZone(zoneCandles, 50);
  const resistanceZone = buildResistanceZone(zoneCandles, 50);

  const volume = volumeStrength(zoneCandles);

  const entryZoneLow = supportZone.low * 1.002;
  const entryZoneHigh = supportZone.high * labels.entryHighMult;
  const stopLossRaw = supportZone.low * labels.stopPct;
  const stopLoss = Math.round(stopLossRaw);

  const distanceToResistancePct = ((resistanceZone.low - price) / price) * 100;
  const risk = price - stopLossRaw;
  const reward = resistanceZone.low - price;
  const riskRewardEstimate = risk > 0 ? Number((reward / risk).toFixed(2)) : 0;

  const inEntryZone = price >= entryZoneLow && price <= entryZoneHigh;
  const aboveEntryZone = price > entryZoneHigh;
  const belowEntryZone = price < entryZoneLow;

  let score = 0;
  const whyList: string[] = [];

  // Grote trend (1d slot = grote timeframe voor deze mode)
  if (tf1d.trend === "bullish") {
    score += 20;
    whyList.push("De grote trend staat omhoog.");
  } else if (tf1d.trend === "neutral") {
    score += 5;
    whyList.push("De grote trend is nog niet volledig duidelijk.");
  } else {
    blockers.push("Grote trend bearish.");
    whyList.push("De grote trend staat omlaag.");
  }

  // Middel timeframe trend
  if (tf4h.trend === "bullish") {
    score += 15;
    whyList.push(`De ${labels.trendLabel} helpt mee.`);
  } else if (tf4h.trend === "neutral") {
    score += 4;
    whyList.push(`De ${labels.trendLabel} is nog twijfelachtig.`);
  } else {
    blockers.push(`${labels.trendLabel} bearish.`);
    whyList.push(`De ${labels.trendLabel} werkt tegen.`);
  }

  if (structure1d === "bullish") {
    score += 10;
    whyList.push("De grote structuur blijft sterk.");
  } else if (structure1d === "bearish") {
    blockers.push("Grote structuur bearish.");
  }

  if (structure4h === "bullish") {
    score += 10;
    whyList.push(`De ${labels.structureLabel} blijft netjes omhoog.`);
  } else if (structure4h === "bearish") {
    blockers.push(`${labels.structureLabel} bearish.`);
  }

  if (tf1h.trend === "bullish") {
    score += 6;
  }

  if (volume === "strong") {
    score += 8;
    whyList.push("Er zit genoeg kracht in de markt.");
  } else {
    warnings.push("Volume is niet sterk.");
  }

  if (inEntryZone) {
    score += 15;
    whyList.push(`De prijs zit in een goede ${labels.zoneLabel}.`);
  } else if (belowEntryZone) {
    score += 5;
    whyList.push(`De prijs zit onder de ${labels.zoneLabel}.`);
  } else if (aboveEntryZone) {
    warnings.push("Prijs is op dit moment geen nette entry.");
    whyList.push(`De prijs zit boven de ${labels.zoneLabel}.`);
  }

  if (distanceToResistancePct > 6) {
    score += 8;
    whyList.push("Er is nog genoeg ruimte omhoog.");
  } else if (distanceToResistancePct > 3) {
    score += 3;
    whyList.push("Er is nog wat ruimte omhoog.");
  } else if (distanceToResistancePct > 1) {
    warnings.push("Ruimte omhoog is beperkt (" + distanceToResistancePct.toFixed(1) + "%).");
  } else {
    blockers.push("Bijna geen ruimte omhoog (" + distanceToResistancePct.toFixed(1) + "%).");
  }

  if (riskRewardEstimate >= 2) {
    score += 8;
  } else if (riskRewardEstimate >= 1.5) {
    score += 4;
  } else if (riskRewardEstimate >= 0.8) {
    warnings.push("Risk/reward is laag (" + riskRewardEstimate + ").");
  } else {
    blockers.push("Risk/reward is slecht (" + riskRewardEstimate + ").");
  }

  // RSI check op kortste timeframe
  if (rsi1h >= 45 && rsi1h <= labels.rsiHigh - 5) {
    score += 6;
  } else if (rsi1h > labels.rsiHigh) {
    warnings.push("RSI is hoog — mogelijk overbought.");
  } else if (rsi1h < labels.rsiLow) {
    warnings.push("RSI is laag — mogelijk oversold.");
  }

  if (rsi4h > labels.rsiHigh) {
    blockers.push("Middel timeframe RSI overbought.");
  }

  score = clampScore(score);

  const strongTrend =
    tf1d.trend === "bullish" &&
    tf4h.trend === "bullish" &&
    structure1d === "bullish" &&
    structure4h === "bullish";

  const mixedTrend =
    tf1d.trend !== "bearish" &&
    tf4h.trend === "bullish" &&
    structure4h !== "bearish";

  const hardBlock = blockers.length > 0;

  let status: MentorSignal["status"] = "Vandaag niet kopen";
  let action: MentorSignal["action"] = "Niet kopen";
  let shortWhy = "De setup is nu niet sterk genoeg.";
  let setupGrade: MentorSignal["setupGrade"] = "F";
  let canBuyNow = false;

  if (hardBlock) {
    shortWhy = blockers[0] ?? "De basis klopt nu niet.";
  } else if (
    strongTrend &&
    inEntryZone &&
    volume === "strong" &&
    distanceToResistancePct > 4 &&
    riskRewardEstimate >= 1.5 &&
    rsi4h >= 45 &&
    rsi4h <= 68 &&
    score >= 72
  ) {
    status = "Goed moment";
    action = "Kleine koop mogelijk";
    shortWhy = "Trend, structuur en prijs liggen goed.";
    setupGrade = "A";
    canBuyNow = true;
  } else if (
    strongTrend &&
    aboveEntryZone &&
    distanceToResistancePct > 4 &&
    riskRewardEstimate >= 1.5 &&
    score >= 60
  ) {
    status = "Nog even wachten";
    action = "Wacht op betere prijs";
    shortWhy = "De setup is best goed, maar je prijs is nog niet mooi.";
    setupGrade = "B";
  } else if (
    mixedTrend &&
    distanceToResistancePct > 3 &&
    riskRewardEstimate >= 1.3 &&
    score >= 48
  ) {
    status = "Nog even wachten";
    action = "Wacht op betere prijs";
    shortWhy =
      "Er is iets positiefs, maar nog niet sterk genoeg om nu te kopen.";
    setupGrade = "C";
  }

  return {
    price,
    status,
    action,
    shortWhy,
    whyList,
    score,
    probabilityScore: score,

    trend1d: tf1d.trend,
    trend4h: tf4h.trend,
    trend1h: tf1h.trend,

    structure4h,
    structure1d,

    volume,

    rsi1h,
    rsi4h,
    rsi1d,

    support,
    resistance,
    supportZoneLow: supportZone.low,
    supportZoneHigh: supportZone.high,
    resistanceZoneLow: resistanceZone.low,
    resistanceZoneHigh: resistanceZone.high,

    entryZoneLow,
    entryZoneHigh,
    entryZoneText: fmtRange(entryZoneLow, entryZoneHigh),
    stopLoss,

    distanceToResistancePct: Number(distanceToResistancePct.toFixed(2)),
    riskRewardEstimate,

    dataQuality: "ok",
    warnings,
    blockers,
    setupGrade,
    canBuyNow,
    alertState: getAlertState(price, entryZoneLow, entryZoneHigh),

    chartCandles4h: (mode === "day" ? candles15m : mode === "long" ? candles1d : candles4h).slice(-40),
  };
}
