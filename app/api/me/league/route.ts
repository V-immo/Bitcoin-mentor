import { auth } from "@/auth";
import { getDb } from "@/db/db";

const TIER_NAMES = ["", "Brons", "Zilver", "Goud", "Platina", "Diamant"];
const TIER_EMOJI = ["", "🥉", "🥈", "🥇", "💎", "👑"];

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const db = getDb();
  const weekNum = String(Math.floor(Date.now() / (7 * 86_400_000)));

  const user = db.prepare(
    "SELECT week_score, league_tier FROM users WHERE id = ?"
  ).get(userId) as { week_score: number; league_tier: number } | undefined;

  const tier = Math.max(1, Math.min(5, user?.league_tier ?? 1));
  const myScore = user?.week_score ?? 0;

  // Haal alle actieve gebruikers in dezelfde tier op (die deze week gescoord hebben)
  let leagueUsers = db.prepare(
    "SELECT id, username, week_score FROM users WHERE league_tier = ? AND week_key = ? ORDER BY week_score DESC LIMIT 20"
  ).all(tier, weekNum) as { id: number; username: string; week_score: number }[];

  // Vul aan met inactieve tiergenoten als groep te klein is
  if (leagueUsers.length < 5) {
    leagueUsers = db.prepare(
      "SELECT id, username, week_score FROM users WHERE league_tier = ? ORDER BY week_score DESC LIMIT 20"
    ).all(tier) as { id: number; username: string; week_score: number }[];
  }

  // Zorg dat de gebruiker zelf in de lijst zit (ook als week_score = 0)
  if (!leagueUsers.find(u => u.id === userId)) {
    leagueUsers.push({ id: userId, username: (session.user as { name?: string }).name ?? "Jij", week_score: myScore });
    leagueUsers.sort((a, b) => b.week_score - a.week_score);
  }

  const myRank = leagueUsers.findIndex(u => u.id === userId) + 1;
  const total = leagueUsers.length;

  const top5 = leagueUsers.slice(0, 5).map((u, idx) => ({
    rank: idx + 1,
    display: u.id === userId ? "Jij" : `${u.username.slice(0, 1)}***`,
    score: u.week_score,
    isMe: u.id === userId,
  }));

  // Voeg eigen positie toe als buiten top 5
  if (myRank > 5) {
    top5.push({ rank: myRank, display: "Jij", score: myScore, isMe: true });
  }

  return Response.json({
    tier,
    tierName: TIER_NAMES[tier] ?? "Brons",
    tierEmoji: TIER_EMOJI[tier] ?? "🥉",
    myScore,
    myRank,
    total,
    top5,
    promoteZone: 3,
    degradeZone: 3,
  });
}
