import { auth } from "@/auth";
import { getDb } from "@/db/db";
import type { Session } from "next-auth";

function getUserId(session: Session | null): number | null {
  const id = (session?.user as { id?: string })?.id;
  return id ? parseInt(id) : null;
}

type MemoryEntry = {
  date: string;
  category: string;
  content: string;
};

function parseNotes(raw: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  // Formaat: [2026-04-04] [CATEGORIE: inhoud]
  const linePattern = /^\[(\d{4}-\d{2}-\d{2})\]\s*\[(PATROON|ANGST|STIJL|MIJLPAAL|FOUT|MEMO):\s*([^\]]{1,200})\]/i;
  for (const line of raw.split("\n")) {
    const m = line.match(linePattern);
    if (m) {
      entries.push({ date: m[1], category: m[2].toUpperCase(), content: m[3].trim() });
    }
  }
  return entries;
}

export async function GET() {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const db = getDb();
  const row = db
    .prepare("SELECT marcus_notes FROM settings WHERE user_id = ?")
    .get(userId) as { marcus_notes?: string } | undefined;

  const raw = row?.marcus_notes ?? "";
  const entries = parseNotes(raw);

  return Response.json({ entries, raw, count: entries.length });
}

export async function DELETE() {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const db = getDb();
  db.prepare("UPDATE settings SET marcus_notes = '' WHERE user_id = ?").run(userId);

  return Response.json({ ok: true });
}
