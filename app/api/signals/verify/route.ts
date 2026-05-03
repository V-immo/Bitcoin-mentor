import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import { verifySignalHash } from "@/lib/signal-hash";

type SignalRow = {
  id: number;
  asset: string;
  symbol: string;
  direction: string;
  entry_price: number;
  stop_loss: number;
  target: number;
  rsi: number;
  score: number;
  trend: string;
  status: string;
  close_price: number | null;
  signal_hash: string | null;
  created_at: string;
  closed_at: string | null;
};

export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("hash")?.trim().toLowerCase();
  if (!hash || hash.length !== 64) {
    return Response.json({ error: "Ongeldige hash" }, { status: 400 });
  }

  try {
    const db = getDb();
    const sig = db.prepare(
      "SELECT * FROM marcus_signals WHERE signal_hash = ?"
    ).get(hash) as SignalRow | undefined;

    if (!sig) {
      return Response.json({ valid: false, error: "Hash niet gevonden" });
    }

    const isValid = verifySignalHash(
      {
        id: sig.id,
        asset: sig.asset,
        symbol: sig.symbol,
        direction: sig.direction,
        entry_price: sig.entry_price,
        stop_loss: sig.stop_loss,
        target: sig.target,
        rsi: sig.rsi,
        score: sig.score,
        trend: sig.trend,
        created_at: sig.created_at,
      },
      hash
    );

    return Response.json({
      valid: isValid,
      signal: {
        id: sig.id,
        asset: sig.asset,
        symbol: sig.symbol,
        direction: sig.direction,
        entryPrice: sig.entry_price,
        stopLoss: sig.stop_loss,
        target: sig.target,
        rsi: sig.rsi,
        score: sig.score,
        trend: sig.trend,
        status: sig.status,
        closePrice: sig.close_price,
        signalHash: sig.signal_hash,
        createdAt: sig.created_at,
        closedAt: sig.closed_at,
      },
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
