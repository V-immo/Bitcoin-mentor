import { auth } from "@/auth";
import { getDb } from "@/db/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const db = getDb();

  const user = db
    .prepare("SELECT totp_enabled FROM users WHERE id = ?")
    .get(userId) as { totp_enabled: number } | undefined;

  return Response.json({ enabled: !!(user?.totp_enabled) });
}
