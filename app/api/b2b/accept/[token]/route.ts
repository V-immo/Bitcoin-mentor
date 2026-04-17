import { auth } from "@/auth";
import { getDb } from "@/db/db";

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const db = getDb();
  const invite = db.prepare(
    "SELECT id, company_id, accepted FROM company_invites WHERE token = ?"
  ).get(token) as { id: number; company_id: number; accepted: number } | undefined;

  if (!invite) return Response.json({ error: "Ongeldig uitnodigingstoken" }, { status: 404 });
  if (invite.accepted) return Response.json({ error: "Uitnodiging al gebruikt" }, { status: 409 });

  const user = db.prepare("SELECT company_id FROM users WHERE id = ?").get(userId) as
    { company_id: number } | undefined;
  if (user?.company_id && user.company_id > 0) {
    return Response.json({ error: "Je bent al gekoppeld aan een bedrijf" }, { status: 409 });
  }

  db.prepare("UPDATE users SET company_id = ?, company_role = 'member' WHERE id = ?")
    .run(invite.company_id, userId);
  db.prepare("UPDATE company_invites SET accepted = 1 WHERE id = ?").run(invite.id);

  const company = db.prepare("SELECT name FROM companies WHERE id = ?").get(invite.company_id) as
    { name: string } | undefined;

  return Response.json({ ok: true, companyName: company?.name ?? "" });
}
