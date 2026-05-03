import { NextRequest } from "next/server";
import { auth } from "@/auth";

type RawKline = [number, string, string, string, string, string, ...unknown[]];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const symbol   = sp.get("symbol") ?? "BTCUSDT";
  const interval = sp.get("interval") ?? "15m";
  const from     = sp.get("from");
  const to       = sp.get("to");

  if (!from || !to) return Response.json({ error: "from en to zijn verplicht" }, { status: 400 });

  const url =
    `https://api.binance.com/api/v3/klines` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&interval=${interval}` +
    `&startTime=${from}` +
    `&endTime=${to}` +
    `&limit=200`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Binance ${res.status}`);
    const raw: RawKline[] = await res.json();

    const candles = raw.map((k) => ({
      t: k[0],
      o: parseFloat(k[1]),
      h: parseFloat(k[2]),
      l: parseFloat(k[3]),
      c: parseFloat(k[4]),
    }));

    return Response.json({ candles });
  } catch (err) {
    console.error("replay klines error", err);
    return Response.json({ error: "Binance data ophalen mislukt" }, { status: 502 });
  }
}
