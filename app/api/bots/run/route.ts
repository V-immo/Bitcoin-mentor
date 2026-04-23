import { runAllBots } from "@/lib/bot-runner";

/**
 * GET /api/bots/run
 * Beveiligd met CRON_SECRET header — aangeroepen door cron-job elke 5 minuten.
 * Voert alle actieve bots uit.
 */
export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return new Response("Verboden", { status: 403 });
  }

  try {
    await runAllBots();
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
