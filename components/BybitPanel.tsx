"use client";

import { useEffect, useState } from "react";

type BybitBalance = { symbol: string; available: string; walletBalance: string };

type OrderResult = {
  orderId?: string;
  symbol?: string;
  side?: string;
  orderType?: string;
  qty?: string;
  cumExecQty?: string;
  cumExecValue?: string;
  avgPrice?: string;
  orderStatus?: string;
};

type Props = { currentPrice: number; asset: string };

export default function BybitPanel({ currentPrice, asset }: Props) {
  const [connected, setConnected]   = useState<boolean | null>(null);
  const [balances, setBalances]     = useState<BybitBalance[]>([]);
  const [loading, setLoading]       = useState(true);
  const [side, setSide]             = useState<"Buy" | "Sell">("Buy");
  const [amount, setAmount]         = useState("50");
  const [placing, setPlacing]       = useState(false);
  const [lastOrder, setLastOrder]   = useState<OrderResult | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [confirm, setConfirm]       = useState(false);
  const [polling, setPolling]       = useState(false);

  // Bybit gebruikt BTCUSDT natively — geen conversie nodig
  const symbol = asset.endsWith("USDT") ? asset : null;
  const ticker = asset.replace("USDT", "").replace("EUR", "");

  const usdtBalance = parseFloat(balances.find(b => b.symbol === "USDT")?.available ?? "0");
  const coinBalance = parseFloat(balances.find(b => b.symbol === ticker)?.available ?? "0");

  async function fetchBalance() {
    setLoading(true);
    const res  = await fetch("/api/bybit/balance");
    const data = await res.json();
    setConnected(!!data.connected);
    if (data.connected) setBalances(data.balance ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchBalance(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function placeOrder() {
    setPlacing(true);
    setOrderError(null);
    setLastOrder(null);
    setConfirm(false);

    const amtNum = parseFloat(amount);
    if (!amtNum || amtNum <= 0) {
      setOrderError("Ongeldig bedrag");
      setPlacing(false);
      return;
    }
    if (!symbol) {
      setOrderError("Dit asset is niet beschikbaar op Bybit Spot");
      setPlacing(false);
      return;
    }

    // Buy: qty in USDT (quoteCoin), Sell: qty in baseCoin (bijv BTC)
    const res = await fetch("/api/bybit/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, side, qty: String(amtNum) }),
    });
    const data = await res.json();
    setPlacing(false);

    if (data.error) {
      setOrderError(data.error);
    } else {
      setLastOrder(data);
      fetchBalance();
      // Poll order status tot filled/cancelled (max 8x, elke 1.5s)
      if (data.orderId && data.orderStatus !== "Filled" && data.orderStatus !== "Cancelled") {
        setPolling(true);
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await fetch(
              `/api/bybit/order/status?orderId=${data.orderId}&symbol=${encodeURIComponent(symbol)}`
            );
            const statusData = await statusRes.json();
            if (statusData && !statusData.error) {
              setLastOrder(statusData);
              if (statusData.orderStatus === "Filled" || statusData.orderStatus === "Cancelled" || attempts >= 8) {
                clearInterval(pollInterval);
                setPolling(false);
                fetchBalance();
              }
            } else if (attempts >= 8) {
              clearInterval(pollInterval);
              setPolling(false);
            }
          } catch {
            if (attempts >= 8) { clearInterval(pollInterval); setPolling(false); }
          }
        }, 1500);
      }
    }
  }

  if (loading) {
    return <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}><div className="skeleton" style={{ height: 18, width: "40%" }} /><div className="skeleton" style={{ height: 14 }} /><div className="skeleton" style={{ height: 14, width: "70%" }} /></div>;
  }

  if (!connected) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 10, fontWeight: 600, color: "#e5d4e7" }}>💛 Bybit Live Trading</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>
          Koppel je Bybit API key in{" "}
          <a href="/instellingen" style={{ color: "var(--accent)", textDecoration: "none" }}>Instellingen</a>{" "}
          om live te handelen via Bybit.
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", background: "var(--surface-2)", borderRadius: 8, padding: "10px 12px", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--text-secondary)" }}>Hoe werkt het?</strong><br />
          1. Ga naar <strong>bybit.com</strong> → Account → API Management<br />
          2. Maak een API key aan met alleen Spot Trading<br />
          3. Vul de key in bij Instellingen → Bybit<br />
          4. Kom terug en trade live in USDT
        </div>
      </div>
    );
  }

  if (!symbol) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 600, color: "#e5d4e7", marginBottom: 8 }}>💛 Bybit Live Trading</div>
        <div style={{ fontSize: 13, color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: "10px 12px" }}>
          ⚠️ <strong>{asset}</strong> is niet beschikbaar als USDT-paar op Bybit Spot.<br />
          Kies een crypto asset (BTC, ETH, SOL…) voor live trading.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 0" }}>

      {/* Waarschuwing echte USDT */}
      <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#fca5a5" }}>
        ⚠️ <strong>ECHTE USDT</strong> — dit zijn geen testorders. Handel verantwoord.
      </div>

      {/* Balances */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "8px 14px", flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>USDT</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#e5d4e7" }}>${usdtBalance.toFixed(2)}</div>
        </div>
        <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "8px 14px", flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>{ticker}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#e5d4e7" }}>{coinBalance.toFixed(6)}</div>
        </div>
        <button
          style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "0 12px", cursor: "pointer", color: "var(--text-secondary)", fontSize: 14 }}
          onClick={fetchBalance}
          title="Verversen"
        >↻</button>
      </div>

      {/* BUY / SELL toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["Buy", "Sell"] as const).map(s => (
          <button
            key={s}
            onClick={() => { setSide(s); setLastOrder(null); setOrderError(null); setConfirm(false); }}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 700, fontSize: 13,
              border: "none", cursor: "pointer",
              background: side === s
                ? (s === "Buy" ? "#26c57c" : "#ef4444")
                : "var(--surface-2)",
              color: side === s ? "#fff" : "var(--text-secondary)",
            }}
          >
            {s === "Buy" ? "🟢 KOOP" : "🔴 VERKOOP"}
          </button>
        ))}
      </div>

      {/* Bedrag */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
          {side === "Buy" ? "Bedrag in USDT" : `Hoeveelheid ${ticker}`}
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="number"
            value={amount}
            onChange={e => { setAmount(e.target.value); setConfirm(false); }}
            style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14 }}
          />
          {side === "Buy" && usdtBalance > 0 && (
            <div style={{ display: "flex", gap: 4 }}>
              {[25, 50, 100].map(pct => (
                <button
                  key={pct}
                  onClick={() => { setAmount((usdtBalance * pct / 100).toFixed(2)); setConfirm(false); }}
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 8px", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
          {side === "Sell" && coinBalance > 0 && (
            <div style={{ display: "flex", gap: 4 }}>
              {[25, 50, 100].map(pct => (
                <button
                  key={pct}
                  onClick={() => { setAmount((coinBalance * pct / 100).toFixed(6)); setConfirm(false); }}
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "0 8px", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Koers preview */}
      {currentPrice > 0 && parseFloat(amount) > 0 && (
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
          {side === "Buy"
            ? `≈ ${(parseFloat(amount) / currentPrice).toFixed(6)} ${ticker}`
            : `≈ $${(parseFloat(amount) * currentPrice).toFixed(2)} USDT`
          }
          <span style={{ color: "#4b5563", marginLeft: 4 }}>(indicatief · marktorder)</span>
        </div>
      )}

      {/* Bevestigingsstap */}
      {!confirm ? (
        <button
          className="terminal-btn terminal-btn-primary"
          style={{ width: "100%", marginBottom: 10, background: side === "Buy" ? "#26c57c" : "#ef4444", color: "#fff" }}
          onClick={() => setConfirm(true)}
          disabled={!parseFloat(amount) || parseFloat(amount) <= 0}
        >
          {side === "Buy"
            ? `Koop ${ticker} voor $${amount} USDT`
            : `Verkoop ${amount} ${ticker}`
          }
        </button>
      ) : (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ fontWeight: 700, color: "#fca5a5", fontSize: 13, marginBottom: 8 }}>
            ⚠️ Bevestig — ECHTE USDT
          </div>
          <div style={{ fontSize: 12, color: "#e5d4e7", marginBottom: 10 }}>
            {side === "Buy"
              ? `Je staat op het punt $${amount} USDT te gebruiken om ${ticker} te kopen op Bybit.`
              : `Je staat op het punt ${amount} ${ticker} te verkopen op Bybit.`
            }
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{ flex: 1, padding: "8px 0", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}
              onClick={() => setConfirm(false)}
            >
              Annuleer
            </button>
            <button
              className="terminal-btn terminal-btn-primary"
              style={{ flex: 1, background: side === "Buy" ? "#26c57c" : "#ef4444", color: "#fff" }}
              onClick={placeOrder}
              disabled={placing}
            >
              {placing ? "Bezig…" : "✓ Bevestig"}
            </button>
          </div>
        </div>
      )}

      {/* Fout */}
      {orderError && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#ef4444" }}>
          ❌ {orderError}
        </div>
      )}

      {/* Succesbericht + live status */}
      {lastOrder && (
        <div style={{
          background: lastOrder.orderStatus === "Filled"
            ? "rgba(38,197,124,0.1)"
            : lastOrder.orderStatus === "Cancelled"
              ? "rgba(239,68,68,0.08)"
              : "rgba(245,158,11,0.08)",
          border: `1px solid ${lastOrder.orderStatus === "Filled" ? "rgba(38,197,124,0.25)" : lastOrder.orderStatus === "Cancelled" ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
          borderRadius: 8, padding: "10px 14px", fontSize: 13
        }}>
          <div style={{
            color: lastOrder.orderStatus === "Filled" ? "#26c57c" : lastOrder.orderStatus === "Cancelled" ? "#ef4444" : "#f59e0b",
            fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6
          }}>
            {lastOrder.orderStatus === "Filled"
              ? "✅ Order uitgevoerd!"
              : lastOrder.orderStatus === "Cancelled"
                ? "❌ Order geannuleerd"
                : polling ? "⏳ Wacht op uitvoering…" : "🕐 Order geplaatst"}
            {polling && <span style={{ fontSize: 11, fontWeight: 400, color: "#f59e0b" }}>live update…</span>}
          </div>
          <div style={{ color: lastOrder.orderStatus === "Filled" ? "#86efac" : "#e5d4e7" }}>
            {lastOrder.side?.toUpperCase()} {lastOrder.cumExecQty ?? lastOrder.qty ?? "?"} {ticker}
            {lastOrder.cumExecValue && parseFloat(lastOrder.cumExecValue) > 0
              ? ` voor $${parseFloat(lastOrder.cumExecValue).toFixed(2)}`
              : ""
            }
            {lastOrder.avgPrice && parseFloat(lastOrder.avgPrice) > 0 && (
              <span style={{ color: "#6b7280", marginLeft: 6 }}>@ ${parseFloat(lastOrder.avgPrice).toLocaleString("en-US")}</span>
            )}
          </div>
          <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>
            Order {lastOrder.orderId?.slice(0, 8)}… — status: <strong style={{ color: "var(--text-secondary)" }}>{lastOrder.orderStatus}</strong>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: "#4b5563", marginTop: 10, textAlign: "center" }}>
        💛 Live trading via Bybit Spot · {symbol}
      </div>
    </div>
  );
}
