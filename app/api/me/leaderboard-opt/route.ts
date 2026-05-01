import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import type { Session } from "next-auth";

function getUserId(session: Session | null): number | null {
  const id = (session?.user as { id?: string })?.id;
  return id ? parseInt(id) : null;
}

export async function GET() {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const db = getDb();
  const row = db.prepare(
    "SELECT leaderboard_opt_in, leaderboard_display_name FROM users WHERE id = ?"
  ).get(userId) as { leaderboard_opt_in: number; leaderboard_display_name: string } | undefined;

  return Response.json({
    optIn: !!row?.leaderboard_opt_in,
    displayName: row?.leaderboard_display_name ?? "",
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const db = getDb();

  if (body.optIn !== undefined) {
    db.prepare("UPDATE users SET leaderboard_opt_in = ? WHERE id = ?")
      .run(body.optIn ? 1 : 0, userId);
  }
  if (typeof body.displayName === "string") {
    const name = body.displayName.trim().slice(0, 30);
    db.prepare("UPDATE users SET leaderboard_display_name = ? WHERE id = ?")
      .run(name, userId);
  }

  return Response.json({ ok: true });
}
