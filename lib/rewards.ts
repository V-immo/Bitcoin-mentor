import { getDb } from "@/db/db";

export const REWARD_AMOUNTS = {
  QUIZ_PASSED:    100,   // score ≥70%
  QUIZ_PERFECT:   500,   // score 100%
  QUIZ_LEVEL_UP: 1000,   // level omhoog gegaan
  TRADE_PROFIT:    50,   // winstgevende paper trade (max 3x/dag)
  TRADE_EXCELLENT: 200,  // uitstekende trade (P&L ≥2%, max 1x/dag extra)
} as const;

export type RewardReason = keyof typeof REWARD_AMOUNTS;

export type RewardEntry = {
  id: number;
  amount_sats: number;
  reason: string;
  metadata: string | null;
  created_at: string;
};

/** Schrijf een beloning weg voor een gebruiker. Gooit nooit. */
export function awardSats(
  userId: number,
  amountSats: number,
  reason: string,
  metadata?: Record<string, unknown>
): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO learn_to_earn (user_id, amount_sats, reason, metadata)
      VALUES (?, ?, ?, ?)
    `).run(userId, amountSats, reason, metadata ? JSON.stringify(metadata) : null);
  } catch { /* negeer */ }
}

/** Hoeveel trade-rewards heeft de gebruiker vandaag al ontvangen? */
export function getTodayTradeRewardCount(userId: number): number {
  try {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const row = db.prepare(`
      SELECT COUNT(*) as c FROM learn_to_earn
      WHERE user_id = ?
        AND reason IN ('trade_profit', 'trade_excellent')
        AND date(created_at) = ?
    `).get(userId, today) as { c: number };
    return row.c;
  } catch { return 0; }
}

/** Totale balans + recente history voor een gebruiker. */
export function getRewardsBalance(
  userId: number
): { totalSats: number; history: RewardEntry[] } {
  try {
    const db = getDb();
    const totalRow = db.prepare(`
      SELECT COALESCE(SUM(amount_sats), 0) as total
      FROM learn_to_earn WHERE user_id = ?
    `).get(userId) as { total: number };

    const history = db.prepare(`
      SELECT id, amount_sats, reason, metadata, created_at
      FROM learn_to_earn WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 20
    `).all(userId) as RewardEntry[];

    return { totalSats: totalRow.total, history };
  } catch {
    return { totalSats: 0, history: [] };
  }
}
