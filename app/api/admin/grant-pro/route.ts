import { auth } from "@/auth";
import { getDb } from "@/db/db";

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") return Response.json({ error: "Geen toegang" }, { status: 403 });

  const { userId, months } = await req.json();
  if (!userId) return Response.json({ error: "userId vereist" }, { status: 400 });

  const db = getDb();
  const monthsNum = parseInt(months ?? "1") || 1;
  const until = new Date();
  until.setMonth(until.getMonth() + monthsNum);
  const proUntil = until.toISOString().slice(0, 10);

  db.prepare("UPDATE users SET is_pro = 1, pro_until = ? WHERE id = ?").run(proUntil, userId);

  return Response.json({ ok: true, userId, proUntil });
}
