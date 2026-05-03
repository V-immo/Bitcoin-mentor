/**
 * copy-trading.ts
 * Plaatst en sluit echte orders op Bybit / OKX namens gebruikers
 * die Marcus's signalen automatisch volgen.
 */

import { getDb } from "@/db/db";
import { bybitPlaceOrder } from "./bybit";
import { okxPlaceOrder } from "./okx";
import { mexcRequest } from "./mexc";

type CopySettings = {
  user_id: number;
  copy_exchange: string;    // 'bybit' | 'okx' | 'mexc' | 'none'
  copy_size_usdt: number;
  copy_max_open: number;
  bybit_api_key: string;
  bybit_api_secret: string;
  okx_api_key: string;
  okx_api_secret: string;
  okx_passphrase: string;
  mexc_api_key: string;
  mexc_api_secret: string;
};

type SignalInfo = {
  id: number;
  asset: string;
  symbol: string;     // bijv. BTCUSDT
  direction: string;
  entry_price: number;
  stop_loss: number;
  target: number;
};

// ── BUY: open copy trade bij nieuw signaal ──────────────────────────────────

export async function openCopyTrade(settings: CopySettings, signal: SignalInfo): Promise<void> {
  const db = getDb();

  // Max open check
  const openCount = (db.prepare(
    "SELECT COUNT(*) as c FROM copy_trades WHERE user_id = ? AND status = 'open'"
  ).get(settings.user_id) as { c: number }).c;

  if (openCount >= settings.copy_max_open) return;

  // Voorkom dubbele entry voor hetzelfde signaal
  const existing = db.prepare(
    "SELECT id FROM copy_trades WHERE user_id = ? AND signal_id = ?"
  ).get(settings.user_id, signal.id);
  if (existing) return;

  const sizeUsdt = settings.copy_size_usdt;
  const estQty = parseFloat((sizeUsdt / signal.entry_price).toFixed(6));
  let orderId: string | undefined;
  let errorMsg: string | undefined;

  try {
    if (settings.copy_exchange === "bybit") {
      const result = await bybitPlaceOrder(
        settings.bybit_api_key,
        settings.bybit_api_secret,
        signal.symbol,
        "Buy",
        sizeUsdt
      );
      if (result.error) errorMsg = result.error;
      else orderId = result.orderId;

    } else if (settings.copy_exchange === "okx") {
      // OKX instId formaat: BTC-USDT
      const instId = signal.symbol.replace("USDT", "-USDT");
      const result = await okxPlaceOrder(
        settings.okx_api_key,
        settings.okx_api_secret,
        settings.okx_passphrase,
        instId,
        "buy",
        sizeUsdt.toString()
      );
      if (result.error) errorMsg = result.error;
      else orderId = result.ordId;

    } else if (settings.copy_exchange === "mexc") {
      const result = await mexcRequest(
        settings.mexc_api_key,
        settings.mexc_api_secret,
        "POST",
        "/api/v3/order",
        { symbol: signal.symbol, side: "BUY", type: "MARKET", quoteOrderQty: sizeUsdt.toString() }
      ) as { orderId?: string; code?: number; msg?: string };
      if (result.msg) errorMsg = result.msg;
      else orderId = result.orderId?.toString();
    }
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e);
  }

  db.prepare(`
    INSERT INTO copy_trades
      (user_id, signal_id, exchange, symbol, asset, size_usdt, entry_price, est_qty, open_order_id, status, error_msg)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    settings.user_id,
    signal.id,
    settings.copy_exchange,
    signal.symbol,
    signal.asset,
    sizeUsdt,
    signal.entry_price,
    estQty,
    orderId ?? null,
    errorMsg ? "error" : "open",
    errorMsg ?? null
  );
}

// ── SELL: sluit copy trade als signaal sluit ────────────────────────────────

export async function closeCopyTrade(
  copyTradeId: number,
  closePrice: number,
  settings: CopySettings
): Promise<void> {
  const db = getDb();
  const ct = db.prepare("SELECT * FROM copy_trades WHERE id = ?").get(copyTradeId) as {
    id: number; user_id: number; exchange: string; symbol: string;
    est_qty: number; status: string;
  } | undefined;

  if (!ct || ct.status !== "open") return;

  let closeOrderId: string | undefined;
  let errorMsg: string | undefined;
  const qty = ct.est_qty;

  try {
    if (ct.exchange === "bybit") {
      const result = await bybitPlaceOrder(
        settings.bybit_api_key,
        settings.bybit_api_secret,
        ct.symbol,
        "Sell",
        qty * closePrice // quoteQty voor marktorder
      );
      if (result.error) errorMsg = result.error;
      else closeOrderId = result.orderId;

    } else if (ct.exchange === "okx") {
      const instId = ct.symbol.replace("USDT", "-USDT");
      // OKX: sell by base qty
      const result = await okxPlaceOrder(
        settings.okx_api_key,
        settings.okx_api_secret,
        settings.okx_passphrase,
        instId,
        "sell",
        qty.toString()
      );
      if (result.error) errorMsg = result.error;
      else closeOrderId = result.ordId;

    } else if (ct.exchange === "mexc") {
      const result = await mexcRequest(
        settings.mexc_api_key,
        settings.mexc_api_secret,
        "POST",
        "/api/v3/order",
        { symbol: ct.symbol, side: "SELL", type: "MARKET", quantity: qty.toString() }
      ) as { orderId?: string; code?: number; msg?: string };
      if (result.msg) errorMsg = result.msg;
      else closeOrderId = result.orderId?.toString();
    }
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e);
  }

  db.prepare(`
    UPDATE copy_trades SET
      status = ?,
      close_price = ?,
      close_order_id = ?,
      error_msg = ?,
      closed_at = datetime('now')
    WHERE id = ?
  `).run(
    errorMsg ? "error" : "closed",
    closePrice,
    closeOrderId ?? null,
    errorMsg ?? null,
    copyTradeId
  );
}

// ── Helpers voor de poller ─────────────────────────────────────────────────

/** Haal alle gebruikers op die copy trading aan hebben staan voor een bepaalde exchange. */
export function getCopyUsers(): CopySettings[] {
  try {
    const db = getDb();
    return db.prepare(`
      SELECT user_id, copy_exchange, copy_size_usdt, copy_max_open,
             bybit_api_key, bybit_api_secret,
             okx_api_key, okx_api_secret, okx_passphrase,
             mexc_api_key, mexc_api_secret
      FROM settings
      WHERE copy_trading = 1
        AND copy_exchange != 'none'
        AND copy_exchange != ''
    `).all() as CopySettings[];
  } catch { return []; }
}

/** Haal alle open copy trades op voor een signaal-id. */
export function getOpenCopyTradesForSignal(
  signalId: number
): { id: number; user_id: number }[] {
  try {
    const db = getDb();
    return db.prepare(
      "SELECT id, user_id FROM copy_trades WHERE signal_id = ? AND status = 'open'"
    ).all(signalId) as { id: number; user_id: number }[];
  } catch { return []; }
}
