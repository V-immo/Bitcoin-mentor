import { auth } from "@/auth";
import { getDb } from "@/db/db";

type MemberRow = {
  id: number;
  username: string;
  email: string;
  login_streak: number;
  last_streak_date: string | null;
  level: number | null;
  xp: number | null;
  quiz_streak: number | null;
  last_quiz_date: string | null;
  weak_topics: string | null;
};

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

  const company = db.prepare("SELECT name, seats, plan FROM companies WHERE id = ?").get(user.company_id) as
    { name: string; seats: number; plan: string } | undefined;

  const members = db.prepare(`
    SELECT u.id, u.username, u.email, u.login_streak, u.last_streak_date,
           qp.level, qp.xp, qp.streak as quiz_streak, qp.last_quiz_date, qp.weak_topics
    FROM users u
    LEFT JOIN quiz_progress qp ON qp.user_id = u.id
    WHERE u.company_id = ? AND u.company_role = 'member'
    ORDER BY COALESCE(qp.level, 0) DESC, u.login_streak DESC
  `).all(user.company_id) as MemberRow[];

  const today = new Date().toISOString().slice(0, 10);

  const formatted = members.map(m => {
    const level = m.level ?? 0;
    const xp = m.xp ?? 0;
    const quizStreak = m.quiz_streak ?? 0;
    const certReady = level >= 5 && xp >= 1000;
    const activeToday = m.last_streak_date === today || m.last_quiz_date === today;

    return {
      id: m.id,
      username: m.username,
      email: m.email,
      loginStreak: m.login_streak ?? 0,
      level,
      xp,
      quizStreak,
      lastQuizDate: m.last_quiz_date,
      weakTopics: m.weak_topics ? (JSON.parse(m.weak_topics) as string[]).slice(0, 2) : [],
      certReady,
      activeToday,
    };
  });

  const invitesUsed = (db.prepare("SELECT COUNT(*) as c FROM company_invites WHERE company_id = ? AND accepted = 1")
    .get(user.company_id) as { c: number }).c;

  return Response.json({
    company: { name: company?.name, seats: company?.seats, plan: company?.plan, invitesUsed },
    members: formatted,
  });
}
