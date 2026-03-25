import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { token, password } = body;

  if (!token || !password || password.length < 8) {
    return Response.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const db = getDb();

  const row = db.prepare(`
    SELECT prt.id, prt.user_id, prt.used, prt.expires_at
    FROM password_reset_tokens prt
    WHERE prt.token = ?
  `).get(token) as { id: number; user_id: number; used: number; expires_at: string } | undefined;

  if (!row) {
    return Response.json({ error: "Ongeldige of verlopen reset-link" }, { status: 400 });
  }

  if (row.used) {
    return Response.json({ error: "Deze reset-link is al gebruikt" }, { status: 400 });
  }

  if (new Date(row.expires_at) < new Date()) {
    return Response.json({ error: "Reset-link is verlopen. Vraag een nieuwe aan." }, { status: 400 });
  }

  const hash = bcrypt.hashSync(password, 12);

  db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, row.user_id);
    db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").run(row.id);
  })();

  return Response.json({ ok: true });
}
