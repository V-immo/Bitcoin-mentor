/**
 * instrumentation.ts — Next.js server instrumentation hook
 * Wordt 1x uitgevoerd bij server-opstart (niet bij elke request).
 * Start de background market poller zodat data 24/7 actueel blijft.
 */
export async function register() {
  // Alleen op de Node.js server draaien, niet in Edge runtime
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPoller } = await import("./lib/market-poller");
    startPoller();
  }
}
