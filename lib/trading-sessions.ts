/**
 * Bepaalt de huidige handelssessie op basis van UTC-tijd.
 * Geeft een string terug die Marcus injecteert in zijn system prompt.
 */

export type TradingSession = {
  name: string;
  sessions: string[];         // actieve sessies op dit moment
  overlaps: string[];         // actieve overlaps
  volatility: "low" | "medium" | "high" | "highest";
  cryptoVolume: "low" | "medium" | "high";
  advice: string;
  openExchanges: string[];
};

export function getCurrentTradingSession(now?: Date): TradingSession {
  const d = now ?? new Date();
  const utcHour = d.getUTCHours();
  const utcMin  = d.getUTCMinutes();
  const utcDecimal = utcHour + utcMin / 60;

  // Sessiegrenzen in UTC
  const ASIAN_START  = 0;   const ASIAN_END  = 9;
  const EU_START     = 7;   const EU_END     = 16;
  const US_START     = 13;  const US_END     = 22;

  const isAsian = utcDecimal >= ASIAN_START && utcDecimal < ASIAN_END;
  const isEU    = utcDecimal >= EU_START    && utcDecimal < EU_END;
  const isUS    = utcDecimal >= US_START    && utcDecimal < US_END;

  const sessions: string[] = [];
  if (isAsian) sessions.push("Aziatische sessie (Tokyo)");
  if (isEU)    sessions.push("Europese sessie (Londen/Frankfurt)");
  if (isUS)    sessions.push("Amerikaanse sessie (New York)");
  if (sessions.length === 0) sessions.push("Stille uren (laag volume)");

  const overlaps: string[] = [];
  if (isAsian && isEU) overlaps.push("Tokyo + Londen overlap (07:00–09:00 UTC)");
  if (isEU    && isUS) overlaps.push("Londen + New York overlap (13:00–16:00 UTC) — HOOGSTE LIQUIDITEIT");

  // Open beurzen
  const openExchanges: string[] = [];
  if (utcDecimal >= 1    && utcDecimal < 7.5)  openExchanges.push("Tokyo (Nikkei)");
  if (utcDecimal >= 2    && utcDecimal < 9)    openExchanges.push("Hong Kong (Hang Seng)");
  if (utcDecimal >= 7    && utcDecimal < 15.5) openExchanges.push("Londen (FTSE)");
  if (utcDecimal >= 7    && utcDecimal < 15.5) openExchanges.push("Frankfurt (DAX)");
  if (utcDecimal >= 7    && utcDecimal < 15.5) openExchanges.push("Amsterdam (AEX)");
  if (utcDecimal >= 13.5 && utcDecimal < 20)   openExchanges.push("New York (NYSE/NASDAQ)");

  // Volatiliteit
  let volatility: TradingSession["volatility"] = "low";
  let cryptoVolume: TradingSession["cryptoVolume"] = "low";
  let advice = "";

  if (overlaps.some(o => o.includes("New York"))) {
    // Londen + NY overlap — beste moment
    volatility = "highest";
    cryptoVolume = "high";
    advice = "Dit is de beste tijd om actief te traden. Londen + New York zijn allebei open — maximale liquiditeit, scherpste spreads, sterkste moves. Ideaal voor day traders op alle assets.";
  } else if (overlaps.some(o => o.includes("Tokyo"))) {
    // Tokyo + Londen overlap
    volatility = "medium";
    cryptoVolume = "medium";
    advice = "Tokyo + Londen overlap — goed voor GBP/JPY, EUR/JPY en crypto. Volume trekt aan. Europese nieuws-openers kunnen sterke moves geven.";
  } else if (isUS && !isEU) {
    // Alleen US sessie (na 16:00 UTC)
    volatility = "high";
    cryptoVolume = "high";
    advice = "Americaans sessie alleen actief. NYSE/NASDAQ open — sterk voor US aandelen en crypto. Nog steeds hoge volatiliteit, maar Europese markten zijn gesloten.";
  } else if (isEU && !isUS) {
    // Alleen EU sessie (07:00–13:00 UTC)
    volatility = "medium";
    cryptoVolume = "medium";
    advice = "Europese sessie actief, NY nog gesloten. Goed voor EUR-paren en Europese aandelen. Crypto volume neemt toe maar echte moves komen vaak na US open (15:30 NL).";
  } else if (isAsian && !isEU) {
    // Alleen Aziatisch
    volatility = "low";
    cryptoVolume = "medium";
    advice = "Aziatische sessie — lagere volumes, rustigere markt. Crypto kan nog bewegen (Aziatische spelers), maar voor aandelen en EUR-paren weinig actie. Swing traders: geen haast. Day traders: wachten op Europese open (07:00 UTC).";
  } else {
    // Stille uren (22:00–00:00 UTC of dead zone)
    volatility = "low";
    cryptoVolume = "low";
    advice = "Stille uren — alle grote sessies gesloten of aan het openen. Laagste liquiditeit, hoogste spreads, kans op false breakouts. Vermijd actieve trades tenzij je crypto houdt voor de lange termijn.";
  }

  // US pre-market specifiek
  if (utcDecimal >= 10 && utcDecimal < 13.5) {
    advice += " Let op: US pre-market actief (10:00–15:30 NL) — earnings en nieuws kunnen al bewegen maar liquiditeit is lager dan regular hours.";
  }

  // Crypto-specifiek: US market open spike
  if (utcDecimal >= 13.5 && utcDecimal < 14) {
    advice += " NY open net begonnen — vaak sterke eerste move in crypto (institutionelen worden actief).";
  }

  return { name: sessions.join(" + "), sessions, overlaps, volatility, cryptoVolume, advice, openExchanges };
}

/**
 * Formatteert de huidige sessie als string voor het Marcus system prompt.
 */
export function formatSessionForMarcus(): string {
  const now = new Date();
  const session = getCurrentTradingSession(now);

  const utcStr = now.toISOString().replace("T", " ").slice(0, 16) + " UTC";

  // NL lokale tijd (UTC+1 winter, UTC+2 zomer)
  const nlOffset = isDutchSummerTime(now) ? 2 : 1;
  const nlHour = (now.getUTCHours() + nlOffset) % 24;
  const nlMin  = String(now.getUTCMinutes()).padStart(2, "0");
  const nlStr  = `${String(nlHour).padStart(2, "0")}:${nlMin} NL`;

  const volLabel: Record<TradingSession["volatility"], string> = {
    low:     "Laag",
    medium:  "Gemiddeld",
    high:    "Hoog",
    highest: "MAXIMAAL — beste tradingmoment",
  };

  const cryptoLabel: Record<TradingSession["cryptoVolume"], string> = {
    low:    "Laag",
    medium: "Gemiddeld",
    high:   "Hoog",
  };

  const lines: string[] = [
    `HUIDIGE MARKTSESSIE (${utcStr} / ${nlStr}):`,
    `Actieve sessie(s): ${session.sessions.join(", ")}`,
  ];

  if (session.overlaps.length > 0) {
    lines.push(`Overlap(s): ${session.overlaps.join(", ")}`);
  }

  if (session.openExchanges.length > 0) {
    lines.push(`Open beurzen: ${session.openExchanges.join(", ")}`);
  } else {
    lines.push("Open beurzen: geen grote beurzen open");
  }

  lines.push(`Volatiliteit verwachting: ${volLabel[session.volatility]}`);
  lines.push(`Crypto volume: ${cryptoLabel[session.cryptoVolume]}`);
  lines.push(`Marcus advies voor dit moment: ${session.advice}`);

  // Weekendwaarschuwing
  const dayOfWeek = now.getUTCDay(); // 0=zon, 6=zat
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    lines.push("Let op: het is WEEKEND — aandelenmarkten gesloten, crypto actief maar lagere liquiditeit en hogere kans op false breakouts.");
  }

  return lines.join("\n");
}

/**
 * Bepaalt of Nederland zomertijd heeft (laatste zondag van maart t/m laatste zondag van oktober).
 */
function isDutchSummerTime(d: Date): boolean {
  const year = d.getUTCFullYear();
  const lastSundayMarch   = getLastSunday(year, 2); // maart = maand 2 (0-indexed)
  const lastSundayOctober = getLastSunday(year, 9); // oktober = maand 9
  return d >= lastSundayMarch && d < lastSundayOctober;
}

function getLastSunday(year: number, month: number): Date {
  // Laatste dag van de maand
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  // Trek terug naar zondag (0)
  const dayOfWeek = lastDay.getUTCDay();
  lastDay.setUTCDate(lastDay.getUTCDate() - dayOfWeek);
  lastDay.setUTCHours(1, 0, 0, 0); // zomertijdwissel om 02:00 lokaal ≈ 01:00 UTC
  return lastDay;
}
