export type Trend = "bullish" | "bearish" | "neutral";
export type TradeDecision = "long" | "skip";

export interface TradeBrief {
  decision: TradeDecision;
  entryPrice: number;
  stopLoss: number;
  target: number;
  riskRewardRatio: number;
  tradeAmountEur: number;
  riskEur: number;
  expectedProfitEur: number;
  waaromNu: string;
  wanneerUitStappen: string;
  grootsteRisico: string;
  verwachtScenario: string;
  tijdshorizon: string;
  asset: string;
  generatedAt: string;
}
export type VolumeStrength = "strong" | "weak";
export type StructureTrend = "bullish" | "bearish" | "neutral";

export type SetupStatus =
  | "Goed moment"
  | "Nog even wachten"
  | "Vandaag niet kopen";

export type ActionLabel =
  | "Kleine koop mogelijk"
  | "Wacht op betere prijs"
  | "Niet kopen";

export type AlertState =
  | "Geen alert"
  | "Bijna in koopzone"
  | "Koopzone geraakt";

export interface BtcPriceSnapshot {
  price: number;
  source: "binance" | "coingecko";
  fetchedAt: string;
}

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface TimeframeAnalysis {
  timeframe: "1h" | "4h" | "1d";
  trend: Trend;
  ma50: number;
  ma200: number;
}

export interface MarketZone {
  low: number;
  high: number;
}

export interface MentorSignal {
  price: number;
  status: SetupStatus;
  action: ActionLabel;
  shortWhy: string;
  whyList: string[];
  score: number;
  probabilityScore: number;

  trend1d: Trend;
  trend4h: Trend;
  trend1h: Trend;

  structure4h: StructureTrend;
  structure1d: StructureTrend;

  volume: VolumeStrength;

  rsi1h: number;
  rsi4h: number;
  rsi1d: number;

  support: number;
  resistance: number;
  supportZoneLow: number;
  supportZoneHigh: number;
  resistanceZoneLow: number;
  resistanceZoneHigh: number;

  entryZoneLow: number;
  entryZoneHigh: number;
  entryZoneText: string;
  stopLoss: number;

  distanceToResistancePct: number;
  riskRewardEstimate: number;

  dataQuality: "ok" | "degraded";
  warnings: string[];
  blockers: string[];
  setupGrade: "A" | "B" | "C" | "F";
  canBuyNow: boolean;
  alertState: AlertState;

  chartCandles4h: Candle[];
}
