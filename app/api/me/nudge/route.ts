import { auth } from "@/auth";
import { getDb } from "@/db/db";
import Anthropic from "@anthropic-ai/sdk";
import { sharedScanCache } from "@/lib/scan-cache";

// Rate limit: max 10x per uur (nudge wordt gecached in browser, dus zelden aangeroepen)
const rateMap = new Map<string, { count: number; resetAt: number }>();
function checkRate(key: string): boolean {
  const now = Date.now();
  const e = rateMap.get(key);
  if (!e || now > e.resetAt) { rateMap.set(key, { count: 1, resetAt: now + 3_600_000 }); return true; }
  if (e.count >= 10) return false;
  e.count++;
  return true;
}

// Geeft null terug als nooit gedaan, getal als wel gedaan
function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getBtcSummary(): string {
  const { data } = sharedScanCache;
  if (!data || data.length === 0) return "";
  const btc = data.find(a => a.ticker === "BTC" || a.ticker === "BTCUSDT");
  if (!btc) return "";
  return `Bitcoin staat nu op ${btc.change24h >= 0 ? "+" : ""}${btc.change24h.toFixed(1)}% vandaag, trend: ${btc.trend}, score: ${btc.score}/100.`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ nudge: null });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const db = getDb();

  // Lees EERST de vorige activiteit + streak data, daarna updaten
  const user = db.prepare("SELECT last_login_at, username, login_streak, last_streak_date FROM users WHERE id = ?")
    .get(userId) as { last_login_at: string | null; username: string; login_streak: number; last_streak_date: string | null } | undefined;

  // Bereken nieuwe streak
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  let newStreak = 1;
  if (user?.last_streak_date === today) {
    newStreak = user.login_streak || 1; // al geteld vandaag
  } else if (user?.last_streak_date === yesterday) {
    newStreak = (user.login_streak || 0) + 1; // dag op dag → uitbreiden
  }
  // else: streek verbroken of eerste keer → reset naar 1

  // Update last_login_at + streak na het lezen
  db.prepare("UPDATE users SET last_login_at = datetime('now'), login_streak = ?, last_streak_date = ? WHERE id = ?")
    .run(newStreak, today, userId);

  // Haal history JSON op — echte trades, niet alleen "rij bestaat"
  const paperRow = db.prepare("SELECT history FROM paper_trading WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1")
    .get(userId) as { history: string } | undefined;

  let lastTradeDate: string | null = null;
  if (paperRow?.history) {
    try {
      const hist = JSON.parse(paperRow.history) as { date?: string; timestamp?: string }[];
      if (hist.length > 0) {
        const last = hist[hist.length - 1];
        lastTradeDate = last.date ?? last.timestamp ?? null;
      }
    } catch { /* ignore */ }
  }

  const lastJournal = db.prepare("SELECT MAX(updated_at) as last FROM trade_journal WHERE user_id = ?")
    .get(userId) as { last: string | null } | undefined;

  const daysSinceTrade = daysSince(lastTradeDate);
  const daysSinceJournal = daysSince(lastJournal?.last ?? null);
  const daysSinceLogin = daysSince(user?.last_login_at ?? null) ?? 0;

  // Geen nudge als gebruiker vandaag of gisteren actief was (trade, journal OF sitebezoek)
  const recentlyActive =
    daysSinceLogin <= 1 ||
    (daysSinceTrade !== null && daysSinceTrade <= 1) ||
    (daysSinceJournal !== null && daysSinceJournal <= 1);
  if (recentlyActive) {
    return Response.json({ nudge: null, active: true, streak: newStreak });
  }

  // Nudge alleen als sitebezoek ook 2+ dagen geleden is
  const shouldNudge = daysSinceLogin >= 2;
  if (!shouldNudge) return Response.json({ nudge: null });

  if (!checkRate(String(userId))) {
    return Response.json({ nudge: null });
  }

  // Inactieve dagen op basis van écht laatste bezoek
  const inactiveDays = Math.min(14, daysSinceLogin);
  const neverTraded = !lastTradeDate;
  const btcSummary = getBtcSummary();

  // Genereer nudge met Claude
  if (!process.env.ANTHROPIC_API_KEY) {
    const fallbacks = [
      "De markt beweegt terwijl je weg bent — even een blik werpen?",
      "Kom terug en check wat er speelt. 5 minuten is genoeg.",
      "Je agenda is leeg. Zelfs op rustige dagen valt er wat te noteren.",
    ];
    return Response.json({ nudge: fallbacks[Math.floor(Math.random() * fallbacks.length)], inactiveDays, streak: newStreak });
  }

  const context = neverTraded
    ? "een nieuwe trader die nog geen paper trade heeft gedaan"
    : `een trader die ${inactiveDays} ${inactiveDays === 1 ? "dag" : "dagen"} inactief is geweest`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 120,
    system: `Je bent Marcus, een directe tradingcoach. Schrijf een KORTE motiverende nudge (max 2 zinnen) voor ${context}. Wees concreet en positief, niet veroordelend. Gebruik "je/jij". Geen aanhef, geen afsluiting. Alleen de boodschap zelf.${btcSummary ? ` Marktcontext: ${btcSummary}` : ""}`,
    messages: [{ role: "user", content: "Geef me een nudge." }],
  });

  const nudge = (msg.content[0] as { text: string }).text.trim();
  return Response.json({ nudge, inactiveDays, streak: newStreak });
}
