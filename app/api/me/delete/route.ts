import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import bcrypt from "bcryptjs";

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  if (!userId) return Response.json({ error: "Ongeldig gebruiker" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const { password } = body as { password?: string };

  if (!password) {
    return Response.json({ error: "Wachtwoord is verplicht ter bevestiging" }, { status: 400 });
  }

  const db = getDb();

  // Controleer wachtwoord
  const user = db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(userId) as { password_hash: string } | undefined;

  if (!user) return Response.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return Response.json({ error: "Wachtwoord onjuist" }, { status: 403 });

  // Verwijder alle gebruikersdata (CASCADE op foreign keys doet de rest)
  db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM price_alerts WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM quiz_progress WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM quiz_shown WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM paper_trading WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM trade_journal WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM settings WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);

  return Response.json({ ok: true });
}
