import { auth } from "@/auth";
import { getDb } from "@/db/db";
import Anthropic from "@anthropic-ai/sdk";

// Cache per user per dag — vermijdt overbodige Haiku-calls
const promptCache = new Map<number, { text: string; date: string }>();

const FALLBACK_PROMPTS_NL = [
  "Wat was het moeilijkste beslissingsmoment van vandaag, en wat deed je?",
  "Welk concept uit het curriculum begrijp je vandaag beter dan gisteren?",
  "Als je vandaag één trade had mogen plaatsen, welke setup zou je kiezen en waarom?",
  "Wat hield je vandaag tegen om impulsief te handelen — of deed je dat toch?",
  "Beschrijf het marktmoment van vandaag in drie zinnen, alsof je het uitlegt aan iemand die niets weet van crypto.",
];

const FALLBACK_PROMPTS_EN = [
  "What was the hardest decision moment today, and what did you do?",
  "Which concept from the curriculum do you understand better today than yesterday?",
  "If you could place one trade today, what setup would you choose and why?",
  "What stopped you from acting impulsively today — or did you anyway?",
  "Describe today's market moment in three sentences, as if explaining it to someone who knows nothing about crypto.",
];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const today = new Date().toISOString().slice(0, 10);
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") ?? "nl";

  // Serveer cached prompt als die van vandaag is
  const cached = promptCache.get(userId);
  if (cached?.date === today) {
    return Response.json({ prompt: cached.text, cached: true });
  }

  const db = getDb();

  const quizRow = db.prepare(
    "SELECT level, streak, weak_topics, history FROM quiz_progress WHERE user_id = ?"
  ).get(userId) as {
    level: number; streak: number;
    weak_topics: string; history: string;
  } | undefined;

  const userRow = db.prepare(
    "SELECT login_streak, username FROM users WHERE id = ?"
  ).get(userId) as { login_streak: number; username: string } | undefined;

  const level = quizRow?.level ?? 1;
  const quizStreak = quizRow?.streak ?? 0;
  const loginStreak = userRow?.login_streak ?? 0;
  const username = userRow?.username ?? "trader";

  let weakTopics: string[] = [];
  try { weakTopics = JSON.parse(quizRow?.weak_topics ?? "[]"); } catch { /* ignore */ }

  let recentScore = 0;
  try {
    const hist = JSON.parse(quizRow?.history ?? "[]") as { score: number; total: number }[];
    if (hist.length > 0) recentScore = Math.round((hist[0].score / hist[0].total) * 100);
  } catch { /* ignore */ }

  // Fallback zonder API key
  const client = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

  if (!client) {
    const fallbacks = lang === "nl" ? FALLBACK_PROMPTS_NL : FALLBACK_PROMPTS_EN;
    const dayIdx = new Date().getDate() % fallbacks.length;
    const text = fallbacks[dayIdx];
    promptCache.set(userId, { text, date: today });
    return Response.json({ prompt: text });
  }

  const weakStr = weakTopics.length > 0
    ? (lang === "nl" ? `Zwakke onderwerpen: ${weakTopics.slice(0, 3).join(", ")}.` : `Weak topics: ${weakTopics.slice(0, 3).join(", ")}.`)
    : "";

  const systemPrompt = lang === "nl"
    ? `Je bent Marcus, directe trading coach. Genereer ÉÉN dagelijkse journaalvraag voor ${username}.
Context: Level ${level}/5, quiz streak ${quizStreak} dagen, platform streak ${loginStreak} dagen, laatste quizscore ${recentScore}%. ${weakStr}
Regels: Max 2 zinnen. Stel één concrete vraag die de trader aanzet tot echte reflectie — niet vaag of motivationeel. Focus op het echte leerproces, beslissingen, of emoties van vandaag. Geen begroeting, geen afsluiting.`
    : `You are Marcus, a direct trading coach. Generate ONE daily journal question for ${username}.
Context: Level ${level}/5, quiz streak ${quizStreak} days, platform streak ${loginStreak} days, last quiz score ${recentScore}%. ${weakStr}
Rules: Max 2 sentences. Ask one concrete question that prompts real reflection — not vague or motivational. Focus on actual learning, decisions, or emotions from today. No greeting, no closing.`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 120,
      system: systemPrompt,
      messages: [{ role: "user", content: "Genereer de dagelijkse journaalvraag." }],
    });
    const text = (msg.content[0] as { text: string }).text.trim().replace(/^["']|["']$/g, "");
    promptCache.set(userId, { text, date: today });
    return Response.json({ prompt: text });
  } catch {
    const fallbacks = lang === "nl" ? FALLBACK_PROMPTS_NL : FALLBACK_PROMPTS_EN;
    const text = fallbacks[new Date().getDate() % fallbacks.length];
    promptCache.set(userId, { text, date: today });
    return Response.json({ prompt: text });
  }
}
