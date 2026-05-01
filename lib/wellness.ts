import { getDb } from "@/db/db";

export type WellnessEntry = {
  sleep_hours: number | null;
  stress_level: number | null;
  energy_level: number | null;
  mood: string | null;
  notes: string | null;
  date: string;
};

export function getTodayWellness(userId: number): WellnessEntry | null {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const db = getDb();
    return db.prepare(
      "SELECT sleep_hours, stress_level, energy_level, mood, notes, date FROM daily_wellness WHERE user_id = ? AND date = ?"
    ).get(userId, today) as WellnessEntry | null;
  } catch { return null; }
}

export function getRecentWellness(userId: number, days = 7): WellnessEntry[] {
  try {
    const db = getDb();
    return db.prepare(`
      SELECT sleep_hours, stress_level, energy_level, mood, notes, date
      FROM daily_wellness WHERE user_id = ?
      ORDER BY date DESC LIMIT ?
    `).all(userId, days) as WellnessEntry[];
  } catch { return []; }
}

/** Genereer een tekst-blok voor Marcus zijn system prompt. */
export function formatWellnessForMarcus(userId: number): string {
  const today = getTodayWellness(userId);
  if (!today) return "";

  const lines: string[] = ["WELLNESS VAN VANDAAG (ingevuld door gebruiker):"];

  if (today.sleep_hours !== null) {
    const sleepLabel = today.sleep_hours < 5
      ? "ERNSTIG SLAAPTEKORT"
      : today.sleep_hours < 6
      ? "Onvoldoende slaap"
      : today.sleep_hours < 7
      ? "Matige slaap"
      : "Goede slaap";
    lines.push(`- Slaap: ${today.sleep_hours}u (${sleepLabel})`);
  }

  if (today.stress_level !== null) {
    const stressLabel = today.stress_level >= 4 ? "HOOG" : today.stress_level >= 3 ? "Gemiddeld" : "Laag";
    lines.push(`- Stress: ${today.stress_level}/5 (${stressLabel})`);
  }

  if (today.energy_level !== null) {
    const energyLabel = today.energy_level <= 2 ? "LAAG" : today.energy_level <= 3 ? "Gemiddeld" : "Hoog";
    lines.push(`- Energie: ${today.energy_level}/5 (${energyLabel})`);
  }

  if (today.mood) lines.push(`- Stemming: ${today.mood}`);
  if (today.notes?.trim()) lines.push(`- Notitie: "${today.notes.trim()}"`);

  // Marcus-instructie op basis van wellness
  const sleep = today.sleep_hours ?? 8;
  const stress = today.stress_level ?? 2;
  const energy = today.energy_level ?? 4;

  const riskScore = (sleep < 6 ? 2 : 0) + (stress >= 4 ? 2 : stress >= 3 ? 1 : 0) + (energy <= 2 ? 1 : 0);

  if (riskScore >= 3) {
    lines.push(
      "",
      "⚠️ MARCUS-INSTRUCTIE: HOOG TRADINGRISICO op basis van wellness.",
      "Onderzoek toont aan dat slaaptekort + hoge stress de impulscontrole ernstig verlaagt.",
      "Traders maken bij slaaptekort aantoonbaar slechtere beslissingen: te grote posities, te vroeg sluiten, revenge trading.",
      "Marcus dient de gebruiker DUIDELIJK en EMPATHISCH te ontraden nu te handelen.",
      "Zeg dit direct, niet als hint. Stel voor: rust, observeren in plaats van handelen, morgen opnieuw beoordelen.",
      "Als de gebruiker toch vraagt om een trade-setup: geef die pas NADAT je de wellness-waarschuwing hebt gegeven."
    );
  } else if (riskScore >= 1) {
    lines.push(
      "",
      "MARCUS-INSTRUCTIE: Lichte wellness-zorgen aanwezig.",
      "Wees voorzichtig met risico-advies. Noem de wellness alleen als de gebruiker er naar vraagt of als ze een grote trade willen doen.",
      "Stel eventueel voor om de positiegrootte te verkleinen."
    );
  } else {
    lines.push("", "Marcus-instructie: Geen wellness-zorgen — handelen is prima.");
  }

  return lines.join("\n");
}
