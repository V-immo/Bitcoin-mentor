import { getDb } from "@/db/db";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  try {
    const { companyName, email, password, seats, plan } = await req.json();
    if (!companyName || !email || !password) {
      return Response.json({ error: "Alle velden zijn verplicht" }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: "Wachtwoord minimaal 8 tekens" }, { status: 400 });
    }

    const db = getDb();

    const existing = db.prepare("SELECT id FROM companies WHERE contact_email = ?").get(email);
    if (existing) {
      return Response.json({ error: "Dit e-mailadres is al geregistreerd" }, { status: 409 });
    }

    const userExists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (userExists) {
      return Response.json({ error: "Dit e-mailadres is al in gebruik" }, { status: 409 });
    }

    const seatCount = Math.max(1, parseInt(seats ?? "5") || 5);
    const planType = plan === "yearly" ? "yearly" : "monthly";

    // Maak bedrijf aan
    db.prepare(
      "INSERT INTO companies (name, contact_email, seats, plan) VALUES (?, ?, ?, ?)"
    ).run(companyName, email, seatCount, planType);
    const company = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };
    const companyId = company.id;

    // Maak admin-gebruiker aan
    const hash = await bcrypt.hash(password, 10);
    const username = companyName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20) || "admin";
    db.prepare(
      "INSERT INTO users (username, email, password, role, company_id, company_role) VALUES (?, ?, ?, 'user', ?, 'admin')"
    ).run(username, email, hash, companyId);

    // Genereer uitnodigingslinks voor alle seats
    const inviteTokens: string[] = [];
    for (let i = 0; i < seatCount; i++) {
      const token = randomBytes(20).toString("hex");
      db.prepare(
        "INSERT INTO company_invites (company_id, token) VALUES (?, ?)"
      ).run(companyId, token);
      inviteTokens.push(token);
    }

    return Response.json({ ok: true, companyId, inviteTokens });
  } catch (err) {
    console.error("[b2b/register]", err);
    return Response.json({ error: "Registratie mislukt" }, { status: 500 });
  }
}
