import { auth } from "@/auth";
import { getDb } from "@/db/db";

function makeCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const db = getDb();
  let user = db.prepare(
    "SELECT referral_code, referral_xp_earned FROM users WHERE id = ?"
  ).get(userId) as { referral_code: string; referral_xp_earned: number } | undefined;

  // Genereer code als nog niet aangemaakt
  if (!user?.referral_code) {
    let code = makeCode();
    let attempts = 0;
    while (db.prepare("SELECT 1 FROM users WHERE referral_code = ?").get(code) && attempts++ < 10) {
      code = makeCode();
    }
    db.prepare("UPDATE users SET referral_code = ? WHERE id = ?").run(code, userId);
    user = { referral_code: code, referral_xp_earned: user?.referral_xp_earned ?? 0 };
  }

  const referredCount = (db.prepare(
    "SELECT COUNT(*) as c FROM users WHERE referred_by = ?"
  ).get(user.referral_code) as { c: number }).c;

  return Response.json({
    code: user.referral_code,
    referredCount,
    xpEarned: user.referral_xp_earned,
    rewardPerReferral: 100,
  });
}
