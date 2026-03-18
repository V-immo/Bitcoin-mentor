import { getBitcoinPrice } from "./btc";
import {
  analyzeTimeframe,
  buildResistanceZone,
  buildSupportZone,
  calculateRsi,
  detectResistance,
  detectStructure,
  detectSupport,
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

// Haal candles op voor elk asset type (Binance crypto of Yahoo stock/metal)
async function fetchAllCandles(symbol: string): Promise<{ price: number; candles1h: Candle[]; candles4h: Candle[]; candles1d: Candle[] }> {
  if (isYahooAsset(symbol)) {
    // Yahoo Finance: haal echte daily + hourly candles op
    const [price, candles1d, rawHourly] = await Promise.all([
      getYahooPrice(symbol),
      getYahooCandles(symbol, "1d", "2y"),
      getYahooCandles(symbol, "1h", "3mo"),
    ]);
    // Simuleer 4H door elke 4e hourly candle te nemen
    const candles4h = rawHourly.filter((_, i) => i % 4 === 3);
    const candles1h = rawHourly;
    return { price, candles1h, candles4h, candles1d };
  } else {
    // Binance crypto
    const [{ price }, candles1h, candles4h, candles1d] = await Promise.all([
      getBitcoinPrice(symbol),
      getCandles("1h", 250, symbol),
      getCandles("4h", 250, symbol),
      getCandles("1d", 250, symbol),
    ]);
    return { price, candles1h, candles4h, candles1d };
  }
}

export async function buildMentorSignal(symbol = "BTCUSDT"): Promise<MentorSignal> {
  const warnings: string[] = [];
  const blockers: string[] = [];

  const { price, candles1h, candles4h, candles1d } = await fetchAllCandles(symbol);

  const tf1h = analyzeTimeframe("1h", candles1h);
  const tf4h = analyzeTimeframe("4h", candles4h);
  const tf1d = analyzeTimeframe("1d", candles1d);

  const structure4h = detectStructure(candles4h, 30);
  const structure1d = detectStructure(candles1d, 30);

  const rsi1h = calculateRsi(candles1h, 14);
  const rsi4h = calculateRsi(candles4h, 14);
  const rsi1d = calculateRsi(candles1d, 14);

  const support = detectSupport(candles4h, 50);
  const resistance = detectResistance(candles4h, 50);

  const supportZone = buildSupportZone(candles4h, 50);
  const resistanceZone = buildResistanceZone(candles4h, 50);

  const volume = volumeStrength(candles1h);

  const entryZoneLow = supportZone.low * 1.002;
  const entryZoneHigh = supportZone.high * 1.01;
  const stopLossRaw = supportZone.low * 0.985;
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

  if (tf1d.trend === "bullish") {
    score += 20;
    whyList.push("De grote trend staat omhoog.");
  } else if (tf1d.trend === "neutral") {
    score += 5;
    whyList.push("De grote trend is nog niet volledig duidelijk.");
  } else {
    blockers.push("Daily trend bearish.");
    whyList.push("De grote trend staat omlaag.");
  }

  if (tf4h.trend === "bullish") {
    score += 15;
    whyList.push("De 4H trend helpt mee.");
  } else if (tf4h.trend === "neutral") {
    score += 4;
    whyList.push("De 4H trend is nog twijfelachtig.");
  } else {
    blockers.push("4H trend bearish.");
    whyList.push("De 4H trend werkt tegen.");
  }

  if (structure1d === "bullish") {
    score += 10;
    whyList.push("De daily structuur blijft sterk.");
  } else if (structure1d === "bearish") {
    blockers.push("Daily structure bearish.");
  }

  if (structure4h === "bullish") {
    score += 10;
    whyList.push("De 4H structuur blijft netjes omhoog.");
  } else if (structure4h === "bearish") {
    blockers.push("4H structure bearish.");
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
    whyList.push("De prijs zit in een betere koopzone.");
  } else if (belowEntryZone) {
    score += 5;
    whyList.push("De prijs zit onder de koopzone.");
  } else if (aboveEntryZone) {
    warnings.push("Prijs is op dit moment geen nette entry.");
    whyList.push("De prijs zit boven de betere koopzone.");
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

  if (rsi4h >= 45 && rsi4h <= 65) {
    score += 6;
  } else if (rsi4h > 72) {
    warnings.push("RSI 4H is hoog.");
  } else if (rsi4h < 35) {
    warnings.push("RSI 4H is laag.");
  }

  if (rsi1d > 75) {
    blockers.push("Daily RSI > 75.");
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

    chartCandles4h: candles4h.slice(-40),
  };
}
