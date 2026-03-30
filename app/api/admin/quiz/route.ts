import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";

function isAdmin(session: Awaited<ReturnType<typeof auth>>) {
  return (session?.user as { role?: string })?.role === "admin";
}

type QuizPoolRow = {
  id: number;
  level: number;
  lang: string;
  topic: string;
  question_json: string;
  created_at: string;
  times_shown: number;
};

// GET — lijst vragen met optionele filters
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!isAdmin(session)) return Response.json({ error: "Geen toegang" }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const level = searchParams.get("level");
  const lang  = searchParams.get("lang");

  const db = getDb();
  let query = "SELECT id, level, lang, topic, question_json, created_at, times_shown FROM quiz_pool WHERE 1=1";
  const params: (string | number)[] = [];
  if (level) { query += " AND level = ?"; params.push(parseInt(level)); }
  if (lang)  { query += " AND lang = ?";  params.push(lang); }
  query += " ORDER BY level ASC, id DESC LIMIT 200";

  const rows = db.prepare(query).all(...params) as QuizPoolRow[];
  const result = rows.map(r => {
    let q: { question?: string } = {};
    try { q = JSON.parse(r.question_json); } catch { /* ignore */ }
    return {
      id: r.id,
      level: r.level,
      lang: r.lang,
      topic: r.topic,
      question: q.question ?? "",
      created_at: r.created_at,
      times_shown: r.times_shown,
    };
  });

  return Response.json(result);
}

// POST — handmatig vraag toevoegen
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!isAdmin(session)) return Response.json({ error: "Geen toegang" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { level, lang, topic, question, context, options, correct, explanation } = body;

  if (!level || !lang || !topic || !question || !Array.isArray(options) || options.length !== 4 || !correct || !explanation) {
    return Response.json({ error: "Ontbrekende velden" }, { status: 400 });
  }

  const questionObj = {
    id: Date.now().toString(),
    topic,
    question,
    context: context ?? "",
    options,
    correct,
    explanation,
    difficulty: level,
  };

  const db = getDb();
  const result = db.prepare(
    "INSERT INTO quiz_pool (level, lang, topic, question_json) VALUES (?, ?, ?, ?)"
  ).run(level, lang, topic, JSON.stringify(questionObj));

  return Response.json({ ok: true, id: result.lastInsertRowid });
}

// DELETE — verwijder vraag op ID
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!isAdmin(session)) return Response.json({ error: "Geen toegang" }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "ID ontbreekt" }, { status: 400 });

  const db = getDb();
  db.prepare("DELETE FROM quiz_shown WHERE question_id = ?").run(parseInt(id));
  db.prepare("DELETE FROM quiz_pool WHERE id = ?").run(parseInt(id));

  return Response.json({ ok: true });
}
