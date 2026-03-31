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

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
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

  // Update last_login_at
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(userId);

  // Haal activiteitsdata op
  const user = db.prepare("SELECT last_login_at, username FROM users WHERE id = ?")
    .get(userId) as { last_login_at: string | null; username: string } | undefined;

  const paper = db.prepare("SELECT updated_at FROM paper_trading WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1")
    .get(userId) as { updated_at: string } | undefined;

  const lastJournal = db.prepare("SELECT MAX(updated_at) as last FROM trade_journal WHERE user_id = ?")
    .get(userId) as { last: string | null } | undefined;

  const lastTrade = db.prepare(`
    SELECT MAX(updated_at) as last FROM paper_trading WHERE user_id = ?
  `).get(userId) as { last: string | null } | undefined;

  const daysSinceLogin = daysSince(user?.last_login_at ?? null);
  const daysSinceTrade = daysSince(lastTrade?.last ?? null);
  const daysSinceJournal = daysSince(lastJournal?.last ?? null);

  // Geen nudge nodig als actief vandaag
  if (daysSinceTrade <= 1 && daysSinceJournal <= 1) {
    return Response.json({ nudge: null, active: true });
  }

  // Minimale inactiviteit voor nudge: 2 dagen geen trade OF 3 dagen geen journal
  const shouldNudge = daysSinceTrade >= 2 || daysSinceJournal >= 3;
  if (!shouldNudge) return Response.json({ nudge: null });

  if (!checkRate(String(userId))) {
    return Response.json({ nudge: null });
  }

  // Bepaal inactiviteitstype
  const inactiveDays = Math.max(daysSinceTrade, daysSinceJournal);
  const btcSummary = getBtcSummary();

  // Genereer nudge met Claude
  if (!process.env.ANTHROPIC_API_KEY) {
    // Fallback zonder AI
    const fallbacks = [
      "Hey, je bent al een paar dagen niet geweest. Markt wacht op niemand — even een blik werpen?",
      "De markt beweegt. Jij niet. Toeval? Kom terug en check wat er speelt.",
      "Je agenda is leeg. Zelfs op rustige dagen valt er wat te noteren. 5 minuten is genoeg.",
    ];
    return Response.json({ nudge: fallbacks[Math.floor(Math.random() * fallbacks.length)], inactiveDays });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 120,
    system: `Je bent Marcus, een directe tradingcoach. Schrijf een KORTE proactieve nudge (max 2 zinnen) voor een trader die ${inactiveDays} dagen inactief is geweest. Wees direct, niet veroordelend. Gebruik "je/jij". Geen aanhef, geen afsluiting. Gewoon de boodschap.${btcSummary ? ` Marktcontext: ${btcSummary}` : ""}`,
    messages: [{ role: "user", content: "Geef me een nudge." }],
  });

  const nudge = (msg.content[0] as { text: string }).text.trim();
  return Response.json({ nudge, inactiveDays });
}
