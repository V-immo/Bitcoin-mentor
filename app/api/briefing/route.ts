import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/db/db";
import { sharedScanCache } from "@/lib/scan-cache";
import { auth } from "@/auth";
import { getNewsForAsset, formatNewsForMarcus } from "@/lib/news";

const BRIEFING_SECRET = process.env.BRIEFING_SECRET ?? "marcus-daily-secret";

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// GET — haal de briefing van vandaag op (voor alle ingelogde gebruikers)
export async function GET() {
  try {
    const db = getDb();
    const today = getToday();
    const row = db.prepare(
      "SELECT content, assets, created_at FROM marcus_briefings WHERE date = ?"
    ).get(today) as { content: string; assets: string; created_at: string } | undefined;

    if (!row) {
      return Response.json({ briefing: null, date: today });
    }

    return Response.json({
      briefing: row.content,
      assets: JSON.parse(row.assets ?? "[]"),
      date: today,
      createdAt: row.created_at,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// POST — genereer nieuwe briefing (alleen via secret of admin)
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const secret = body.secret ?? request.headers.get("x-briefing-secret") ?? "";

  // Toegang: geldig secret OF ingelogde admin
  let authorized = secret === BRIEFING_SECRET;
  if (!authorized) {
    const session = await auth();
    const user = session?.user as { role?: string } | undefined;
    authorized = user?.role === "admin";
  }
  if (!authorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getToday();
  const force = body.force === true;

  // Check of al bestaat (tenzij force=true)
  const db = getDb();
  if (!force) {
    const existing = db.prepare("SELECT id FROM marcus_briefings WHERE date = ?").get(today);
    if (existing) {
      const row = db.prepare("SELECT content, assets, created_at FROM marcus_briefings WHERE date = ?").get(today) as { content: string; assets: string; created_at: string };
      return Response.json({ briefing: row.content, date: today, cached: true });
    }
  }

  // Haal marktdata op
  const { data: scanData } = sharedScanCache;
  if (!scanData || scanData.length === 0) {
    // Trigger scan eerst
    try {
      await fetch(`${process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "https://bitcoinmentor.be"}/api/market-scan`, { method: "GET" });
      await new Promise(r => setTimeout(r, 3000));
    } catch { /* ignore */ }
  }

  const scan = sharedScanCache.data ?? [];
  const green = scan.filter(a => a.color === "green").sort((a, b) => b.score - a.score);
  const yellow = scan.filter(a => a.color === "yellow").sort((a, b) => b.score - a.score);
  const top = [...green.slice(0, 3), ...yellow.slice(0, 2)].slice(0, 5);

  const scanSummary = scan.map(a => {
    const dot = a.color === "green" ? "🟢" : a.color === "yellow" ? "🟡" : "🔴";
    return `${dot} ${a.ticker} — trend: ${a.trend}, RSI: ${a.rsi}, score: ${a.score}/100, 24u: ${a.change24h >= 0 ? "+" : ""}${a.change24h.toFixed(1)}% — ${a.signal}`;
  }).join("\n");

  // Fear & Greed + nieuws — parallel ophalen
  let fearGreed = "onbekend";
  const [fgResult, btcNews] = await Promise.allSettled([
    fetch("https://api.alternative.me/fng/?limit=1"),
    getNewsForAsset("BTCUSDT", 5),
  ]);
  if (fgResult.status === "fulfilled" && fgResult.value.ok) {
    try {
      const fgData = await fgResult.value.json();
      const e = fgData?.data?.[0];
      if (e) fearGreed = `${e.value}/100 (${e.value_classification})`;
    } catch { /* ignore */ }
  }
  const newsContext = btcNews.status === "fulfilled"
    ? formatNewsForMarcus(btcNews.value)
    : "";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY ontbreekt" }, { status: 500 });

  const client = new Anthropic({ apiKey });

  const prompt = `Je bent Marcus, een ervaren trading coach. Schrijf de dagelijkse trading briefing voor vandaag (${today}).

MARKTDATA VAN DIT MOMENT:
${scanSummary || "Geen scandata beschikbaar."}

Fear & Greed Index: ${fearGreed}
${newsContext ? `\nACTUEEL NIEUWS (gebruik dit om context te geven aan je briefing):\n${newsContext}` : ""}

JOUW TAAK:
Schrijf een concrete, actiegericht briefing die bruikbaar is voor zowel day traders als swing traders. Geen bullshit, geen vage algemeenheden.

STRUCTUUR (volg dit exact):

📊 MARKT SFEER
[1-2 zinnen over het algemene marktsentiment. Bull/bear/sideways? Veilig of voorzichtig?]

🎯 SETUP VAN DE DAG
[Kies de 1-2 BESTE setups uit de scan. Geef voor elke setup:]
Asset: [naam + ticker]
Koopzone: $X – $Y
Stop-loss: $Z
Target: $A (R:R ~1:X)
Waarom: [2-3 zinnen: trend, RSI, structuur, momentum]

⚠️ ASSETS OM TE VERMIJDEN
[1-3 assets die rood staan of gevaarlijk zijn, kort waarom]

📌 JOUW TAAK VANDAAG
[1 concrete actie voor de gebruiker: grafiek bekijken, level bewaken, alert instellen, etc.]

Schrijf als Marcus — direct, menselijk, niet als rapport. Max 300 woorden.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0]?.type === "text" ? response.content[0].text : "";
  if (!content) return Response.json({ error: "Geen briefing gegenereerd" }, { status: 500 });

  // Opslaan in DB
  const assetNames = top.map(a => a.ticker);
  db.prepare(
    "INSERT OR REPLACE INTO marcus_briefings (date, content, assets) VALUES (?, ?, ?)"
  ).run(today, content, JSON.stringify(assetNames));

  return Response.json({ briefing: content, assets: assetNames, date: today, cached: false });
}
