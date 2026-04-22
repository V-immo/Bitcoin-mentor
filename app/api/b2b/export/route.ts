import { auth } from "@/auth";
import { getDb } from "@/db/db";

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

  const company = db.prepare("SELECT name FROM companies WHERE id = ?").get(user.company_id) as
    { name: string } | undefined;

  const members = db.prepare(`
    SELECT u.username, u.email, u.login_streak,
           COALESCE(qp.level, 0) as level,
           COALESCE(qp.xp, 0) as xp,
           COALESCE(qp.streak, 0) as quiz_streak,
           qp.last_quiz_date,
           qp.weak_topics
    FROM users u
    LEFT JOIN quiz_progress qp ON qp.user_id = u.id
    WHERE u.company_id = ? AND u.company_role = 'member'
    ORDER BY COALESCE(qp.level, 0) DESC
  `).all(user.company_id) as {
    username: string; email: string; login_streak: number;
    level: number; xp: number; quiz_streak: number;
    last_quiz_date: string | null; weak_topics: string | null;
  }[];

  const today = new Date().toISOString().slice(0, 10);

  const LEVEL_LABELS = [
    "—", "Beginner", "Lerende", "Bewuste Trader", "Gedisciplineerde",
    "Pro", "Geavanceerd", "TA Expert", "On-Chain", "Portfoliobeheer", "Professioneel",
  ];

  const rows = members.map(m => {
    const certReady = m.level >= 5 && m.xp >= 1000;
    const weakTopics = m.weak_topics ? (JSON.parse(m.weak_topics) as string[]).join("; ") : "";
    return [
      m.username,
      m.email,
      LEVEL_LABELS[m.level] ?? `Niveau ${m.level}`,
      String(m.xp),
      String(m.login_streak),
      String(m.quiz_streak),
      m.last_quiz_date ?? "—",
      certReady ? "Ja" : "Nee",
      weakTopics,
    ].map(v => `"${v.replace(/"/g, '""')}"`).join(",");
  });

  const header = [
    "Naam", "E-mail", "Niveau", "XP", "Login Streak",
    "Quiz Streak", "Laatste Quiz", "MiCA Gecertificeerd", "Aandachtspunten",
  ].join(",");

  const csv = [
    `# MiCA Compliance Export — ${company?.name ?? ""}`,
    `# Gegenereerd op: ${today}`,
    `# Vereiste voor certificering: Niveau 5+ en min. 1000 XP`,
    "",
    header,
    ...rows,
  ].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mica-compliance-${today}.csv"`,
    },
  });
}
