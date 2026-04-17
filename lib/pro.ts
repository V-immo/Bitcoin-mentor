import { getDb } from "@/db/db";

export function isUserPro(userId: number): boolean {
  const db = getDb();
  const row = db.prepare("SELECT is_pro, pro_until FROM users WHERE id = ?").get(userId) as
    { is_pro: number; pro_until: string } | undefined;
  if (!row || !row.is_pro) return false;
  if (!row.pro_until) return true; // geen verloopdatum = permanent pro
  return row.pro_until >= new Date().toISOString().slice(0, 10);
}
