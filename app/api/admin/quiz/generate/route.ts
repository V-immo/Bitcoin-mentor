import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { generateAndSaveQuestions, LEVEL_TOPICS, LEVEL_TOPICS_EN } from "@/app/api/quiz/route";

function pickRandomTopics(topics: string[], count: number): string[] {
  return [...topics].sort(() => Math.random() - 0.5).slice(0, count);
}

// POST — genereer AI-vragen voor een level en sla op in pool
export async function POST(request: NextRequest) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") return Response.json({ error: "Geen toegang" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const level: number = parseInt(body.level ?? "1");
  const lang: "nl" | "en" = body.lang === "en" ? "en" : "nl";
  const count: number = Math.min(parseInt(body.count ?? "5"), 20);

  if (level < 1 || level > 5) return Response.json({ error: "Ongeldig niveau" }, { status: 400 });

  const topics = lang === "en" ? LEVEL_TOPICS_EN : LEVEL_TOPICS;
  const allTopics = topics[level] ?? topics[1];
  const selectedTopics = pickRandomTopics(allTopics, count);

  try {
    const questions = await generateAndSaveQuestions(level, selectedTopics, "", count, lang);
    return Response.json({ ok: true, count: questions.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fout";
    return Response.json({ error: msg }, { status: 500 });
  }
}
