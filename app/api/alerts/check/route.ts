import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import { sendAlertEmail } from "@/lib/mailer";
import { SCAN_ASSETS } from "@/lib/assets";
import webpush from "web-push";

// Beveilig dit endpoint met een geheime token (ALERT_CHECK_SECRET in .env)
// Wordt aangeroepen door een cron job (GitHub Actions, server crontab, etc.)
export async function GET(request: NextRequest) {
  const secret = process.env.ALERT_CHECK_SECRET;
  const incoming = request.nextUrl.searchParams.get("secret");

  if (secret && incoming !== secret) {
    return Response.json({ error: "Ongeldig secret" }, { status: 401 });
  }

  const db = getDb();

  // Haal alle actieve alerts op, gegroepeerd per asset
  const activeAlerts = db.prepare(
    "SELECT pa.*, u.email as user_email FROM price_alerts pa JOIN users u ON u.id = pa.user_id WHERE pa.active = 1"
  ).all() as {
    id: number;
    user_id: number;
    asset: string;
    condition: "above" | "below";
    target_price: number;
    email: string;
    user_email: string;
    last_triggered_at: string | null;
  }[];

  if (activeAlerts.length === 0) {
    return Response.json({ ok: true, checked: 0, triggered: 0 });
  }

  // Unieke assets ophalen
  const uniqueAssets = [...new Set(activeAlerts.map(a => a.asset))];

  // Prijzen ophalen via Binance REST API (voor crypto) of Finnhub (voor andere)
  const prices: Record<string, number> = {};

  await Promise.allSettled(
    uniqueAssets.map(async (asset) => {
      const assetDef = SCAN_ASSETS.find(a => a.symbol === asset);
      if (!assetDef) return;

      try {
        if (assetDef.source === "binance") {
          // Binance REST API — geen key nodig
          const res = await fetch(
            `https://api.binance.com/api/v3/ticker/price?symbol=${asset}`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (res.ok) {
            const data = await res.json() as { price: string };
            prices[asset] = parseFloat(data.price);
          }
        } else if (assetDef.source === "finnhub" && assetDef.finnhubSymbol) {
          const key = process.env.FINNHUB_API_KEY;
          if (!key) return;
          const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${assetDef.finnhubSymbol}&token=${key}`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (res.ok) {
            const data = await res.json() as { c: number };
            if (data.c > 0) prices[asset] = data.c;
          }
        }
      } catch {
        // Prijs niet beschikbaar — skip
      }
    })
  );

  // Configureer VAPID als beschikbaar
  const vapidReady = !!(process.env.VAPID_EMAIL && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  if (vapidReady) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
  }

  let triggered = 0;

  // Controleer elke alert
  for (const alert of activeAlerts) {
    const currentPrice = prices[alert.asset];
    if (!currentPrice || currentPrice <= 0) continue;

    const shouldFire =
      (alert.condition === "above" && currentPrice >= alert.target_price) ||
      (alert.condition === "below" && currentPrice <= alert.target_price);

    if (!shouldFire) continue;

    // Cooldown: niet vaker dan 1x per uur triggeren voor dezelfde alert
    if (alert.last_triggered_at) {
      const lastMs = new Date(alert.last_triggered_at).getTime();
      if (Date.now() - lastMs < 60 * 60 * 1000) continue;
    }

    // E-mail sturen
    let emailOk = false;
    try {
      await sendAlertEmail({
        to: alert.email,
        asset: alert.asset,
        condition: alert.condition,
        targetPrice: alert.target_price,
        currentPrice,
      });
      emailOk = true;
    } catch (err) {
      console.error(`Alert email mislukt voor alert ${alert.id}:`, err);
    }

    // Push notificatie sturen naar alle apparaten van deze gebruiker
    if (vapidReady) {
      const pushSubs = db.prepare(
        "SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?"
      ).all(alert.user_id) as { id: number; endpoint: string; p256dh: string; auth: string }[];

      const assetLabel = SCAN_ASSETS.find(a => a.symbol === alert.asset)?.ticker ?? alert.asset;
      const pushPayload = JSON.stringify({
        title: `🔔 Prijsalert: ${assetLabel}`,
        body: `${assetLabel} is ${alert.condition === "above" ? "gestegen boven" : "gedaald onder"} €${alert.target_price.toLocaleString("nl-NL")} — nu €${currentPrice.toLocaleString("nl-NL")}`,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        url: "/dashboard",
      });

      for (const sub of pushSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload,
          );
        } catch {
          // Verouderde subscription verwijderen
          db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(sub.id);
        }
      }
    }

    if (emailOk || vapidReady) {
      // Update last_triggered_at
      db.prepare(
        "UPDATE price_alerts SET last_triggered_at = datetime('now') WHERE id = ?"
      ).run(alert.id);
      triggered++;
    }
  }

  return Response.json({
    ok: true,
    checked: activeAlerts.length,
    prices: Object.keys(prices).length,
    triggered,
  });
}
