import { NextResponse } from "next/server";
import { buildMentorSignal, TradingMode } from "@/lib/mentor";
import { auth } from "@/auth";
import { getDb } from "@/db/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const symbol = typeof body?.symbol === "string" ? body.symbol : "BTCUSDT";

    // Haal trading mode op uit DB (per gebruiker)
    let mode: TradingMode = "swing";
    try {
      const session = await auth();
      const userId = parseInt((session?.user as { id?: string })?.id ?? "0") || null;
      if (userId) {
        const db = getDb();
        const row = db.prepare("SELECT trading_mode FROM settings WHERE user_id = ?").get(userId) as { trading_mode?: string } | undefined;
        if (row?.trading_mode === "day" || row?.trading_mode === "long") {
          mode = row.trading_mode;
        }
      }
    } catch { /* gebruik swing als fallback */ }

    const signal = await buildMentorSignal(symbol, mode);
    return NextResponse.json(signal);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kon analyse niet laden" },
      { status: 500 }
    );
  }
}
