import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { isUserPro } from "@/lib/pro";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const db = getDb();
  const row = db.prepare("SELECT is_pro, pro_until FROM users WHERE id = ?").get(userId) as
    { is_pro: number; pro_until: string } | undefined;

  return Response.json({
    isPro: isUserPro(userId),
    proUntil: row?.pro_until ?? null,
  });
}

// POST: sla upgrade-intentie op (admin verwerkt handmatig of via betaallink)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const { plan } = await req.json().catch(() => ({ plan: "monthly" }));

  const db = getDb();
  // Sla intentie op als notitie in users tabel (voor handmatige verwerking)
  db.prepare("UPDATE users SET pro_until = 'pending-' || ? WHERE id = ?").run(plan, userId);

  return Response.json({ ok: true, pending: true, plan });
}
