import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import bcrypt from "bcryptjs";

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

  try {
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, start_capital)
      VALUES (?, ?, ?, 'user', 10000)
    `).run(username.trim(), email.trim().toLowerCase(), hash);

    return Response.json({ ok: true, id: result.lastInsertRowid });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("UNIQUE")) {
      if (msg.includes("username")) return Response.json({ error: "Gebruikersnaam al in gebruik" }, { status: 409 });
      if (msg.includes("email")) return Response.json({ error: "E-mailadres al in gebruik" }, { status: 409 });
    }
    return Response.json({ error: "Registratie mislukt" }, { status: 400 });
  }
}
