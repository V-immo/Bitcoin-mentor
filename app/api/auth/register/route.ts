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

  const db = getDb();
  const hash = bcrypt.hashSync(password, 12);

  // Detecteer regio op de achtergrond voor valuta-default
  const { currency, countryCode } = await detectCurrency(request);

  try {
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, start_capital)
      VALUES (?, ?, ?, 'user', 10000)
    `).run(username.trim(), email.trim().toLowerCase(), hash);

    const userId = result.lastInsertRowid;

    // Maak settings direct aan met gedetecteerde valuta en land
    try {
      db.prepare(`
        INSERT INTO settings (user_id, trading_mode, risk_level, start_capital, preferred_assets, ai_language, preferred_currency, country_code)
        VALUES (?, 'swing', 'medium', 10000, '["BTCUSDT","ETHUSDT"]', 'nl', ?, ?)
      `).run(userId, currency, countryCode);
    } catch { /* settings worden later aangemaakt door getOrCreateSettings */ }

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
