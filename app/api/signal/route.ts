import { NextResponse } from "next/server";
import { buildMentorSignal } from "@/lib/mentor";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const symbol = typeof body?.symbol === "string" ? body.symbol : "BTCUSDT";
    const signal = await buildMentorSignal(symbol);
    return NextResponse.json(signal);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kon analyse niet laden" },
      { status: 500 }
    );
  }
}
