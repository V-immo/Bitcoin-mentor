import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  const db = getDb();

  const user = db.prepare("SELECT id, username, email, role, start_capital, created_at, last_login_at FROM users WHERE id = ?").get(userId);
  if (!user) return Response.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  const quiz = db.prepare("SELECT * FROM quiz_progress WHERE user_id = ?").get(userId) as Record<string, unknown> | undefined;
  const papers = db.prepare("SELECT * FROM paper_trading WHERE user_id = ?").all(userId) as Record<string, unknown>[];
  const notes = db.prepare(`
    SELECT an.*, u.username as admin_name
    FROM admin_notes an
    JOIN users u ON u.id = an.admin_id
    WHERE an.user_id = ?
    ORDER BY an.created_at DESC
  `).all(userId);

  const paperParsed = papers.map((p) => ({
    asset: p.asset,
    cash: p.cash,
    startingBalance: p.starting_balance,
    position: p.position ? JSON.parse(p.position as string) : null,
    history: JSON.parse((p.history as string) ?? "[]"),
    updatedAt: p.updated_at,
  }));

  return Response.json({
    user,
    quiz: quiz ? {
      level: quiz.level,
      xp: quiz.xp,
      streak: quiz.streak,
      lastQuizDate: quiz.last_quiz_date,
      weakTopics: JSON.parse((quiz.weak_topics as string) ?? "[]"),
      history: JSON.parse((quiz.history as string) ?? "[]"),
    } : null,
    papers: paperParsed,
    notes,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  const body = await request.json().catch(() => ({}));
  const db = getDb();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (typeof body.startCapital === "number") {
    updates.push("start_capital = ?");
    values.push(body.startCapital);
    // Update ook de settings tabel
    db.prepare("UPDATE settings SET start_capital = ? WHERE user_id = ?").run(body.startCapital, userId);
  }
  if (body.role === "user" || body.role === "admin") {
    updates.push("role = ?");
    values.push(body.role);
  }

  if (updates.length > 0) {
    values.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  // Admin notitie toevoegen (ook als er verder niets verandert)
  if (body.note) {
    const adminId = parseInt((session?.user as { id?: string })?.id ?? "0");
    db.prepare("INSERT INTO admin_notes (user_id, admin_id, note) VALUES (?, ?, ?)").run(userId, adminId, body.note);
  }

  if (updates.length === 0 && !body.note) {
    return Response.json({ error: "Niets om bij te werken" }, { status: 400 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  const db = getDb();

  // Voorkom dat admin zichzelf verwijdert
  const adminId = parseInt((session?.user as { id?: string })?.id ?? "0");
  if (userId === adminId) {
    return Response.json({ error: "Je kunt jezelf niet verwijderen" }, { status: 400 });
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  return Response.json({ ok: true });
}
