import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { verify } from "otplib";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const { token } = await request.json().catch(() => ({})) as { token?: string };

  if (!token) return Response.json({ error: "Verificatiecode verplicht" }, { status: 400 });

  const db = getDb();
  const user = db
    .prepare("SELECT totp_secret FROM users WHERE id = ?")
    .get(userId) as { totp_secret?: string } | undefined;

  if (!user?.totp_secret) {
    return Response.json({ error: "Genereer eerst een QR code via setup" }, { status: 400 });
  }

  const valid = await verify({ token, secret: user.totp_secret, type: "totp" });
  if (!valid) {
    return Response.json({ error: "Ongeldige code — probeer opnieuw" }, { status: 400 });
  }

  db.prepare("UPDATE users SET totp_enabled = 1 WHERE id = ?").run(userId);
  return Response.json({ ok: true });
}
