import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import bcrypt from "bcryptjs";

export async function PUT(request: NextRequest) {
  const session = await auth();
  const userId = parseInt((session?.user as { id?: string })?.id ?? "0");
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return Response.json({ error: "Veld ontbreekt" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return Response.json({ error: "Nieuw wachtwoord moet minimaal 8 tekens zijn" }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as
    | { password_hash: string }
    | undefined;

  if (!user) return Response.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return Response.json({ error: "Huidig wachtwoord klopt niet" }, { status: 400 });

  const newHash = await bcrypt.hash(newPassword, 12);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, userId);

  return Response.json({ ok: true });
}
