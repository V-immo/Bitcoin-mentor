import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import type { Session } from "next-auth";

function getUserId(session: Session | null): number | null {
  const id = (session?.user as { id?: string })?.id;
  return id ? parseInt(id) : null;
}

// EU + EER landen die Bitvavo/EUR-exchanges gebruiken
const EUROPE_CODES = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR",
  "HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK",
  "SI","ES","SE","NO","IS","LI","CH",
]);

type IpApiResponse = {
  country?: string;
  countryCode?: string;
  continentCode?: string;
  status?: string;
};

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "127.0.0.1"
  );
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const ip = getClientIp(request);

  // Lokale IP → geen detectie mogelijk, gebruik EU als default
  if (ip === "127.0.0.1" || ip.startsWith("192.168") || ip.startsWith("10.") || ip.startsWith("::1")) {
    return Response.json({
      country: "België",
      countryCode: "BE",
      suggestedCurrency: "EUR",
      suggestedExchange: "bitvavo",
      detected: false,
    });
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,continentCode,status`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) throw new Error("ip-api.com niet bereikbaar");
    const data = await res.json() as IpApiResponse;

    if (data.status !== "success" || !data.countryCode) {
      throw new Error("Geen resultaat");
    }

    const isEurope = EUROPE_CODES.has(data.countryCode);
    const suggestedCurrency = isEurope ? "EUR" : "USD";
    const suggestedExchange = isEurope ? "bitvavo" : "bybit";

    // Sla land op in settings voor Marcus context
    try {
      const db = getDb();
      db.prepare("UPDATE settings SET country_code = ? WHERE user_id = ?")
        .run(data.countryCode, userId);
    } catch { /* ignore */ }

    return Response.json({
      country: data.country ?? "",
      countryCode: data.countryCode,
      suggestedCurrency,
      suggestedExchange,
      detected: true,
    });
  } catch {
    // Fallback: EU/EUR
    return Response.json({
      country: "",
      countryCode: "",
      suggestedCurrency: "EUR",
      suggestedExchange: "bitvavo",
      detected: false,
    });
  }
}
