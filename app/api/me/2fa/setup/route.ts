import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const email  = session.user.email ?? "gebruiker";

  // Genereer een nieuw TOTP secret (nog niet opgeslagen — wacht op verificatie)
  const secret = generateSecret();

  // Sla tijdelijk op in DB (pending, totp_enabled blijft 0 tot verificatie)
  const db = getDb();
  db.prepare("UPDATE users SET totp_secret = ? WHERE id = ?").run(secret, userId);

  // Genereer otpauth URI en QR code
  const otpauth = generateURI({ secret, account: email, issuer: "Bitcoin Mentor" });
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  return Response.json({ secret, qrDataUrl });
}
