"use client";

/**
 * useLivePrices — live prijzen voor alle scanner assets via WebSocket
 *
 * Crypto (Binance):
 *   1 combined mini-ticker stream → alle 12 crypto's op 1 connectie, sub-seconde
 *   wss://stream.binance.com:9443/stream?streams=btcusdt@miniTicker/ethusdt@miniTicker/...
 *
 * Stocks + Metalen (Finnhub):
 *   1 WebSocket connectie → subscribe op alle symbolen
 *   wss://ws.finnhub.io?token=...
 *   Goud/zilver: OANDA:XAU_USD handelt 23u/dag ma-vr
 *
 * Fallback: als WS offline → REST prijzen via /api/market-scan (al elke 15s)
 */

import { useEffect, useRef, useState } from "react";
import { SCAN_ASSETS } from "@/lib/assets";

export type LivePrice = {
  price: number;
  change24h: number;
  live: boolean; // true = van WebSocket, false = van REST
};

export type LivePriceMap = Map<string, LivePrice>;

const BINANCE_SYMBOLS = SCAN_ASSETS
  .filter((a) => a.source === "binance")
  .map((a) => a.symbol.toLowerCase());

const FINNHUB_ASSETS = SCAN_ASSETS
  .filter((a) => a.source === "finnhub" && a.finnhubSymbol);

export function useLivePrices(): LivePriceMap {
  const [prices, setPrices] = useState<LivePriceMap>(new Map());
  const binanceWsRef = useRef<WebSocket | null>(null);
  const finnhubWsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

  // ── Binance combined mini-ticker ──────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    let backoffMs = 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const streams = BINANCE_SYMBOLS.map((s) => `${s}@miniTicker`).join("/");
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    function connect() {
      if (destroyed) return;
      const ws = new WebSocket(wsUrl);
      binanceWsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          // Combined stream format: { stream: "btcusdt@miniTicker", data: { s, c, P, ... } }
          const d = msg.data ?? msg;
          const symbol: string = d.s;
          const price = parseFloat(d.c);
          const change24h = parseFloat(d.P);
          if (!symbol || !Number.isFinite(price) || price <= 0) return;

          setPrices((prev) => {
            const next = new Map(prev);
            next.set(symbol, { price, change24h: Number.isFinite(change24h) ? change24h : 0, live: true });
            return next;
          });
          backoffMs = 1000;
        } catch { /* ignore */ }
      };

      ws.onerror = () => { /* reconnect via onclose */ };
      ws.onclose = () => {
        if (destroyed) return;
        timer = setTimeout(connect, backoffMs);
        backoffMs = Math.min(backoffMs * 2, 30_000);
      };
    }

    connect();
    return () => {
      destroyed = true;
      if (timer) clearTimeout(timer);
      binanceWsRef.current?.close();
    };
  }, []);

  // ── Finnhub WebSocket — stocks + metalen ─────────────────────────────────
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? "";
    if (!apiKey || FINNHUB_ASSETS.length === 0) return;

    let backoffMs = 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    // Symbol → asset map voor snelle lookup
    const symToAsset = new Map(
      FINNHUB_ASSETS.map((a) => [a.finnhubSymbol!, a])
    );

    function connect() {
      if (destroyed) return;
      const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
      finnhubWsRef.current = ws;

      ws.onopen = () => {
        // Subscribe op alle finnhub symbolen in 1 connectie
        for (const a of FINNHUB_ASSETS) {
          ws.send(JSON.stringify({ type: "subscribe", symbol: a.finnhubSymbol }));
        }
        backoffMs = 1000;
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          // Trade events: { type: "trade", data: [{ s, p, t, v }, ...] }
          if (msg.type !== "trade" || !msg.data?.length) return;

          // Groepeer per symbool — neem de meest recente trade
          const bySymbol = new Map<string, number>();
          for (const trade of msg.data) {
            if (Number.isFinite(trade.p) && trade.p > 0) {
              bySymbol.set(trade.s, trade.p);
            }
          }

          setPrices((prev) => {
            const next = new Map(prev);
            for (const [finnhubSym, price] of bySymbol) {
              const asset = symToAsset.get(finnhubSym);
              if (!asset) continue;
              const existing = prev.get(asset.symbol);
              const change24h = existing?.change24h ?? 0;
              next.set(asset.symbol, { price, change24h, live: true });
            }
            return next;
          });
        } catch { /* ignore */ }
      };

      ws.onerror = () => { /* reconnect via onclose */ };
      ws.onclose = () => {
        if (destroyed) return;
        // Niet meteen reconnecten — markt kan dicht zijn (weekend)
        timer = setTimeout(connect, backoffMs);
        backoffMs = Math.min(backoffMs * 2, 60_000); // max 60s voor stocks (markt kan dicht zijn)
      };
    }

    connect();
    return () => {
      destroyed = true;
      if (timer) clearTimeout(timer);
      // Unsubscribe netjes
      if (finnhubWsRef.current?.readyState === WebSocket.OPEN) {
        for (const a of FINNHUB_ASSETS) {
          finnhubWsRef.current.send(JSON.stringify({ type: "unsubscribe", symbol: a.finnhubSymbol }));
        }
      }
      finnhubWsRef.current?.close();
    };
  }, []);

  return prices;
}
