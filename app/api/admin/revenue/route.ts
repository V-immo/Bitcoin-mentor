import { auth } from "@/auth";
import { getDb } from "@/db/db";

type RecentProUser = {
  id: number;
  username: string;
  email: string;
  pro_until: string;
  created_at: string;
};

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = (new Date().getFullYear() + 1).toString();

  const n = (sql: string, ...params: unknown[]) =>
    ((db.prepare(sql).get(...params) as { c: number } | undefined)?.c ?? 0);

  const proUsers = n("SELECT COUNT(*) as c FROM users WHERE is_pro = 1");
  const proActive = n(
    "SELECT COUNT(*) as c FROM users WHERE is_pro = 1 AND (pro_until IS NULL OR pro_until >= ?)",
    today
  );
  const proLifetime = n(
    "SELECT COUNT(*) as c FROM users WHERE pro_until = '2099-12-31'"
  );
  const proYearly = n(
    "SELECT COUNT(*) as c FROM users WHERE is_pro = 1 AND pro_until NOT LIKE 'pending-%' AND pro_until != '2099-12-31' AND substr(pro_until, 1, 4) >= ?",
    nextYear
  );
  const proMonthly = n(
    "SELECT COUNT(*) as c FROM users WHERE is_pro = 1 AND pro_until NOT LIKE 'pending-%' AND pro_until != '2099-12-31' AND substr(pro_until, 1, 4) < ?",
    nextYear
  );
  const pendingUpgrades = n(
    "SELECT COUNT(*) as c FROM users WHERE pro_until LIKE 'pending-%'"
  );

  const revenueMonthlyEst = Math.round(proActive * 19.99 * 100) / 100;
  const revenueYearlyEst = Math.round((proYearly * 149 + proMonthly * 19.99) * 100) / 100;

  const recentPro = db
    .prepare(
      "SELECT id, username, email, pro_until, created_at FROM users WHERE is_pro = 1 ORDER BY created_at DESC LIMIT 10"
    )
    .all() as RecentProUser[];

  return Response.json({
    proUsers,
    proActive,
    proMonthly,
    proYearly,
    proLifetime,
    revenueMonthlyEst,
    revenueYearlyEst,
    pendingUpgrades,
    recentPro,
  });
}
