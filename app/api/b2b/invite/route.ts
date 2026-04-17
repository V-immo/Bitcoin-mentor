import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { randomBytes } from "crypto";

// GET: haal alle uitnodigingen op voor het bedrijf van de admin
export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const db = getDb();
  const user = db.prepare("SELECT company_id, company_role FROM users WHERE id = ?").get(userId) as
    { company_id: number; company_role: string } | undefined;

  if (!user?.company_id || user.company_role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const invites = db.prepare(
    "SELECT token, email, accepted, created_at FROM company_invites WHERE company_id = ? ORDER BY created_at DESC"
  ).all(user.company_id) as { token: string; email: string; accepted: number; created_at: string }[];

  return Response.json({ invites });
}

// POST: genereer een extra uitnodigingslink
export async function POST() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const db = getDb();
  const user = db.prepare("SELECT company_id, company_role FROM users WHERE id = ?").get(userId) as
    { company_id: number; company_role: string } | undefined;

  if (!user?.company_id || user.company_role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const company = db.prepare("SELECT seats FROM companies WHERE id = ?").get(user.company_id) as
    { seats: number } | undefined;
  const used = (db.prepare("SELECT COUNT(*) as c FROM company_invites WHERE company_id = ?")
    .get(user.company_id) as { c: number }).c;

  if (used >= (company?.seats ?? 0)) {
    return Response.json({ error: "Alle seats zijn al uitgedeeld" }, { status: 400 });
  }

  const token = randomBytes(20).toString("hex");
  db.prepare("INSERT INTO company_invites (company_id, token) VALUES (?, ?)").run(user.company_id, token);

  return Response.json({ token });
}
