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

  const trades = db.prepare(`
    SELECT ct.id, ct.signal_id, ct.exchange, ct.symbol, ct.asset,
           ct.size_usdt, ct.entry_price, ct.close_price, ct.est_qty,
           ct.open_order_id, ct.close_order_id,
           ct.status, ct.error_msg, ct.opened_at, ct.closed_at,
           ms.stop_loss, ms.target, ms.score
    FROM copy_trades ct
    LEFT JOIN marcus_signals ms ON ms.id = ct.signal_id
    WHERE ct.user_id = ?
    ORDER BY ct.opened_at DESC
    LIMIT 50
  `).all(userId) as {
    id: number; signal_id: number; exchange: string; symbol: string; asset: string;
    size_usdt: number; entry_price: number; close_price: number | null; est_qty: number;
    open_order_id: string | null; close_order_id: string | null;
    status: string; error_msg: string | null; opened_at: string; closed_at: string | null;
    stop_loss: number; target: number; score: number;
  }[];

  // Stats
  const closed = trades.filter(t => t.status === "closed" && t.close_price !== null);
  const totalPnlUsdt = closed.reduce((sum, t) => {
    const pnl = (t.close_price! - t.entry_price) / t.entry_price * t.size_usdt;
    return sum + pnl;
  }, 0);
  const wins = closed.filter(t => t.close_price! > t.entry_price).length;
  const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;

  return Response.json({
    trades,
    stats: {
      total: trades.length,
      open: trades.filter(t => t.status === "open").length,
      closed: closed.length,
      errors: trades.filter(t => t.status === "error").length,
      totalPnlUsdt: parseFloat(totalPnlUsdt.toFixed(2)),
      winRate,
    },
  });
}
