import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import crypto from "crypto";

function randomPassword(len = 8): string {
  // Alfanumeriek, geen verwarrende tekens (0, O, I, l)
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.randomBytes(len))
    .map((b) => chars[b % chars.length])
    .join("");
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  if (isNaN(userId)) return Response.json({ error: "Ongeldig ID" }, { status: 400 });

  const db = getDb();
  const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(userId) as
    | { id: number; username: string }
    | undefined;

  if (!user) return Response.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  const tempPassword = randomPassword();

  // Hash het wachtwoord met bcrypt (via dynamic import omdat het server-only is)
  try {
    // Gebruik dezelfde hash-methode als de registratie — SHA-256 als fallback
    // of bcrypt als beschikbaar
    let hashed: string;
    try {
      const bcrypt = await import("bcryptjs");
      hashed = await bcrypt.hash(tempPassword, 10);
    } catch {
      // Fallback: SHA-256 (minder veilig, maar werkt zonder bcrypt)
      hashed = crypto.createHash("sha256").update(tempPassword).digest("hex");
    }

    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
      .run(hashed, userId);

    return Response.json({ tempPassword });
  } catch (err) {
    console.error("Wachtwoord reset fout:", err);
    return Response.json({ error: "Reset mislukt" }, { status: 500 });
  }
}
