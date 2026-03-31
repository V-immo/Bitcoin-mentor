import { auth } from "@/auth";
import { getDb } from "@/db/db";
import Anthropic from "@anthropic-ai/sdk";

const EMOTIONS: Record<number, string> = { 1: "😨", 2: "😟", 3: "😐", 4: "😊", 5: "🔥" };

// Maandag van de huidige week
function getThisMonday(): string {
  const now = new Date();
  const day = now.getDay(); // 0=zon, 1=ma...
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

// Maandag 7 dagen geleden (vorige week)
function getLastMonday(): string {
  const monday = new Date(getThisMonday());
  monday.setDate(monday.getDate() - 7);
  return monday.toISOString().slice(0, 10);
}

// Rate limit: max 3x per uur per user
const rateMap = new Map<string, { count: number; resetAt: number }>();
function checkRate(key: string): boolean {
  const now = Date.now();
  const e = rateMap.get(key);
  if (!e || now > e.resetAt) { rateMap.set(key, { count: 1, resetAt: now + 3_600_000 }); return true; }
  if (e.count >= 3) return false;
  e.count++;
  return true;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const thisMonday = getThisMonday();
  const lastMonday = getLastMonday();
  const db = getDb();

  // Controleer of tabel bestaat
  const tableExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='marcus_weekly_reviews'"
  ).get();
  if (!tableExists) {
    return Response.json({ review: null, weekStart: thisMonday, isNew: false });
  }

  // Kijk of er al een review is voor deze week
  const existing = db.prepare(
    "SELECT review, created_at FROM marcus_weekly_reviews WHERE user_id = ? AND week_start = ?"
  ).get(userId, thisMonday) as { review: string; created_at: string } | undefined;

  if (existing) {
    return Response.json({ review: existing.review, weekStart: thisMonday, isNew: false });
  }

  // Geen review nog — genereer alleen als rate limit ok
  if (!checkRate(String(userId))) {
    return Response.json({ error: "Te veel verzoeken", review: null }, { status: 429 });
  }

  // Haal vorige week data op (ma t/m zo)
  const weekEnd = new Date(thisMonday);
  weekEnd.setDate(weekEnd.getDate() - 1); // zondag
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const entries = db.prepare(`
    SELECT date, note, emotion FROM trade_journal
    WHERE user_id = ? AND date >= ? AND date <= ?
    ORDER BY date ASC
  `).all(userId, lastMonday, weekEndStr) as { date: string; note: string | null; emotion: number }[];

  const papers = db.prepare(
    "SELECT asset, history FROM paper_trading WHERE user_id = ?"
  ).all(userId) as { asset: string; history: string }[];

  type DayStats = { pnl: number; count: number; wins: number; losses: number; emotions: number[] };
  const byDate: Record<string, DayStats> = {};

  for (const paper of papers) {
    try {
      const history = JSON.parse(paper.history ?? "[]") as {
        timestamp?: number; side: string; pnl?: number; emotion?: number;
      }[];
      for (const t of history) {
        if (!t.timestamp) continue;
        const date = new Date(t.timestamp).toISOString().slice(0, 10);
        if (date < lastMonday || date > weekEndStr) continue;
        if (!byDate[date]) byDate[date] = { pnl: 0, count: 0, wins: 0, losses: 0, emotions: [] };
        byDate[date].count++;
        if (t.side === "sell" && typeof t.pnl === "number") {
          byDate[date].pnl += t.pnl;
          if (t.pnl > 0) byDate[date].wins++; else byDate[date].losses++;
        }
        if (t.emotion) byDate[date].emotions.push(t.emotion);
      }
    } catch { /* ignore */ }
  }

  const tradeDays = Object.keys(byDate).length;
  const journalDays = entries.length;

  // Bouw data-samenvatting
  const lines: string[] = [`WEEK VAN ${lastMonday} T/M ${weekEndStr}\n`];

  if (tradeDays > 0) {
    lines.push("TRADES PER DAG:");
    for (const [date, day] of Object.entries(byDate)) {
      const emo = day.emotions.length > 0
        ? EMOTIONS[Math.round(day.emotions.reduce((a, b) => a + b, 0) / day.emotions.length)] ?? ""
        : "";
      lines.push(`  ${date} ${emo}: ${day.count} trades, ${day.wins}W/${day.losses}L, P&L €${day.pnl.toFixed(0)}`);
    }
    const totalPnl = Object.values(byDate).reduce((s, d) => s + d.pnl, 0);
    const totalW = Object.values(byDate).reduce((s, d) => s + d.wins, 0);
    const totalL = Object.values(byDate).reduce((s, d) => s + d.losses, 0);
    lines.push(`  TOTAAL: ${totalW + totalL} trades, €${totalPnl.toFixed(0)} P&L\n`);
  } else {
    lines.push("Geen trades deze week.\n");
  }

  if (journalDays > 0) {
    lines.push("JOURNAL NOTITIES:");
    entries.forEach(e => {
      const emo = EMOTIONS[e.emotion] ?? "";
      if (e.note) lines.push(`  ${e.date} ${emo}: "${e.note}"`);
      else lines.push(`  ${e.date} ${emo}: (geen notitie)`);
    });
    lines.push("");
  }

  if (tradeDays === 0 && journalDays === 0) {
    const review = "Je hebt deze week niet gehandeld en geen agenda bijgehouden. Dat is prima — rust is ook onderdeel van een goede strategie. Maar als je wilt groeien: ook al doe je geen trades, schrijf elke dag kort op wat je ziet in de markt. Dat bouwt patroonherkenning op. Eén zin per dag is genoeg.";
    db.prepare(`
      INSERT OR REPLACE INTO marcus_weekly_reviews (user_id, week_start, review)
      VALUES (?, ?, ?)
    `).run(userId, thisMonday, review);
    return Response.json({ review, weekStart: thisMonday, isNew: true });
  }

  // Genereer review met Claude
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const msg = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 500,
    system: `Je bent Marcus, een directe tradingcoach met 15 jaar ervaring.
Dit is een WEKELIJKSE REVIEW — elke maandag kijk je terug op de vorige week.
Schrijf in 3-4 alinea's. Wees direct, eerlijk en persoonlijk. Geen bullet points.
Structuur: 1) Wat ging goed, 2) Wat kon beter, 3) Emotioneel patroon van de week, 4) Focus voor deze week.
Eindig altijd met een concrete focus voor de komende week.`,
    messages: [{
      role: "user",
      content: `Hier is mijn week:\n\n${lines.join("\n")}\nGeef me mijn wekelijkse review.`,
    }],
  });

  const review = (msg.content[0] as { text: string }).text;

  db.prepare(`
    INSERT OR REPLACE INTO marcus_weekly_reviews (user_id, week_start, review)
    VALUES (?, ?, ?)
  `).run(userId, thisMonday, review);

  return Response.json({ review, weekStart: thisMonday, isNew: true });
}
