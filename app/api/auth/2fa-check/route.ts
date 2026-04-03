import { NextRequest } from "next/server";
import { getDb } from "@/db/db";

// Controleer of een gebruiker 2FA heeft ingeschakeld (zonder wachtwoord te verifiëren)
// Wordt gebruikt in de login flow om de TOTP stap te tonen
export async function POST(request: NextRequest) {
  const { username } = await request.json().catch(() => ({})) as { username?: string };
  if (!username) return Response.json({ requires2fa: false });

  const db = getDb();
  const user = db
    .prepare("SELECT totp_enabled FROM users WHERE username = ?")
    .get(username) as { totp_enabled: number } | undefined;

  return Response.json({ requires2fa: !!(user?.totp_enabled) });
}
