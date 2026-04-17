import { getDb } from "@/db/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = parseInt(id);
  if (isNaN(userId)) return Response.json({ error: "Ongeldig ID" }, { status: 400 });

  const db = getDb();
  const row = db.prepare("SELECT username FROM users WHERE id = ?").get(userId) as { username: string } | undefined;
  if (!row) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  return Response.json({ username: row.username });
}
