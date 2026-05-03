import crypto from "crypto";

export type SignalPayload = {
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
  created_at: string;
};

/** Deterministisch SHA-256 hash van een signaal — kan niet achteraf veranderen. */
export function computeSignalHash(sig: SignalPayload): string {
  const payload = [
    sig.id,
    sig.asset,
    sig.symbol,
    sig.direction,
    sig.entry_price,
    sig.stop_loss,
    sig.target,
    sig.rsi,
    sig.score,
    sig.trend,
    sig.created_at,
  ].join("|");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Bereken een Merkle-root over een reeks signal-hashes.
 * Gebruikt SHA-256(left + right) op elk niveau.
 */
export function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return "0".repeat(64);
  let level = [...hashes];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? level[i]; // odd → duplicate last
      next.push(
        crypto.createHash("sha256").update(left + right).digest("hex")
      );
    }
    level = next;
  }
  return level[0];
}

/** Verifieer dat een hash klopt bij de gegeven signaaldata. */
export function verifySignalHash(sig: SignalPayload, hash: string): boolean {
  return computeSignalHash(sig) === hash;
}
