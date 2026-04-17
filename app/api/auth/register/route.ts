import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import bcrypt from "bcryptjs";

const EUROPE_CODES = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR",
  "HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK",
  "SI","ES","SE","NO","IS","LI","CH",
]);

async function detectCurrency(request: NextRequest): Promise<{ currency: string; countryCode: string }> {
  try {
    const ip =
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "";
    if (!ip || ip === "127.0.0.1" || ip.startsWith("192.168") || ip.startsWith("10.")) {
      return { currency: "EUR", countryCode: "BE" };
    }
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,status`, {
      signal: AbortSignal.timeout(2500),
    });
    const data = await res.json() as { countryCode?: string; status?: string };
    if (data.status === "success" && data.countryCode) {
      return {
        currency: EUROPE_CODES.has(data.countryCode) ? "EUR" : "USD",
        countryCode: data.countryCode,
      };
    }
  } catch { /* gebruik EUR als fallback */ }
  return { currency: "EUR", countryCode: "" };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { username, email, password } = body;

  if (!username || !email || !password) {
    return Response.json({ error: "Alle velden zijn verplicht" }, { status: 400 });
  }

  if (username.length < 3 || username.length > 30) {
    return Response.json({ error: "Gebruikersnaam moet 3-30 tekens zijn" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Ongeldig e-mailadres" }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ error: "Wachtwoord moet minimaal 8 tekens zijn" }, { status: 400 });
  }

  const { ref } = body;

  const db = getDb();
  const hash = bcrypt.hashSync(password, 12);

  // Detecteer regio op de achtergrond voor valuta-default
  const { currency, countryCode } = await detectCurrency(request);

  // Valideer referral code
  let referrerId: number | null = null;
  if (ref && typeof ref === "string" && /^[A-Z0-9]{6,10}$/.test(ref)) {
    const referrer = db.prepare("SELECT id FROM users WHERE referral_code = ?").get(ref) as { id: number } | undefined;
    if (referrer) referrerId = referrer.id;
  }

  // Genereer eigen referral code (6 tekens, uniek)
  function makeCode(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }
  let newCode = makeCode();
  let attempts = 0;
  while (db.prepare("SELECT 1 FROM users WHERE referral_code = ?").get(newCode) && attempts++ < 10) {
    newCode = makeCode();
  }

  try {
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, start_capital, referred_by, referral_code)
      VALUES (?, ?, ?, 'user', 10000, ?, ?)
    `).run(username.trim(), email.trim().toLowerCase(), hash, ref ?? "", newCode);

    const userId = result.lastInsertRowid as number;

    // Maak settings direct aan met gedetecteerde valuta en land
    try {
      db.prepare(`
        INSERT INTO settings (user_id, trading_mode, risk_level, start_capital, preferred_assets, ai_language, preferred_currency, country_code)
        VALUES (?, 'swing', 'medium', 10000, '["BTCUSDT","ETHUSDT"]', 'nl', ?, ?)
      `).run(userId, currency, countryCode);
    } catch { /* settings worden later aangemaakt door getOrCreateSettings */ }

    // Referral beloning: +100 XP + 1 streak freeze voor beide partijen
    if (referrerId) {
      const REFERRAL_XP = 100;

      // Nieuwe gebruiker: +100 XP welkomstbonus
      db.prepare(`
        INSERT INTO quiz_progress (user_id, level, xp, streak, last_quiz_date, weak_topics, history)
        VALUES (?, 1, ?, 0, '', '[]', '[]')
        ON CONFLICT(user_id) DO UPDATE SET xp = xp + ?
      `).run(userId, REFERRAL_XP, REFERRAL_XP);
      db.prepare("UPDATE users SET streak_freeze = streak_freeze + 1 WHERE id = ?").run(userId);

      // Referrer: +100 XP + 1 streak freeze
      db.prepare(`
        INSERT INTO quiz_progress (user_id, level, xp, streak, last_quiz_date, weak_topics, history)
        VALUES (?, 1, ?, 0, '', '[]', '[]')
        ON CONFLICT(user_id) DO UPDATE SET xp = xp + ?
      `).run(referrerId, REFERRAL_XP, REFERRAL_XP);
      db.prepare("UPDATE users SET streak_freeze = streak_freeze + 1, referral_xp_earned = referral_xp_earned + ? WHERE id = ?")
        .run(REFERRAL_XP, referrerId);
    }

    return Response.json({ ok: true, id: userId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("UNIQUE")) {
      if (msg.includes("username")) return Response.json({ error: "Gebruikersnaam al in gebruik" }, { status: 409 });
      if (msg.includes("email")) return Response.json({ error: "E-mailadres al in gebruik" }, { status: 409 });
    }
    return Response.json({ error: "Registratie mislukt" }, { status: 400 });
  }
}
