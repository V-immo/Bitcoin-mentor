"use client";

import { useEffect, useState } from "react";

type MexcBalance = { symbol: string; available: string; locked: string };

type OrderResult = {
  orderId?: string;
  symbol?: string;
  side?: string;
  type?: string;
  origQty?: string;
  executedQty?: string;
  cummulativeQuoteQty?: string;
  price?: string;
  status?: string;
};

type Props = { currentPrice: number; asset: string };

export default function MEXCPanel({ currentPrice, asset }: Props) {
  const [connected, setConnected]   = useState<boolean | null>(null);
  const [balances, setBalances]     = useState<MexcBalance[]>([]);
  const [loading, setLoading]       = useState(true);
  const [side, setSide]             = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount]         = useState("50");
  const [placing, setPlacing]       = useState(false);
  const [lastOrder, setLastOrder]   = useState<OrderResult | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [confirm, setConfirm]       = useState(false);
  const [polling, setPolling]       = useState(false);

  const symbol = asset.endsWith("USDT") ? asset : null;
  const ticker = asset.replace("USDT", "").replace("EUR", "");

  const usdtBalance = parseFloat(balances.find(b => b.symbol === "USDT")?.available ?? "0");
  const coinBalance = parseFloat(balances.find(b => b.symbol === ticker)?.available ?? "0");

  async function fetchBalance() {
    setLoading(true);
    const res  = await fetch("/api/mexc/balance");
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
      setOrderError("Dit asset is niet beschikbaar op MEXC Spot");
      setPlacing(false);
      return;
    }

    const res = await fetch("/api/mexc/order", {
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
      // Poll status tot FILLED/CANCELED
      if (data.orderId && data.status !== "FILLED" && data.status !== "CANCELED") {
        setPolling(true);
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await fetch(
              `/api/mexc/order/status?orderId=${data.orderId}&symbol=${encodeURIComponent(symbol)}`
            );
            const statusData = await statusRes.json();
            if (statusData && !statusData.error) {
              setLastOrder(statusData);
              if (statusData.status === "FILLED" || statusData.status === "CANCELED" || attempts >= 8) {
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
    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton" style={{ height: 18, width: "40%" }} />
        <div className="skeleton" style={{ height: 14 }} />
        <div className="skeleton" style={{ height: 14, width: "70%" }} />
      </div>
    );
  }

  if (!connected) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 10, fontWeight: 600, color: "var(--text)" }}>MEXC Live Trading</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>
          Koppel je MEXC API key in{" "}
          <a href="/instellingen" style={{ color: "var(--accent)", textDecoration: "none" }}>Instellingen</a>{" "}
          om live te handelen via MEXC.
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--surface-2)", borderRadius: 8, padding: "10px 12px", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--text-secondary)" }}>Hoe werkt het?</strong><br />
          1. Ga naar <strong>mexc.com</strong> → Account → API Management<br />
          2. Maak een API key aan met Spot Trading rechten<br />
          3. Vul de key in bij Instellingen → MEXC<br />
          4. MEXC heeft 0% maker fees — de goedkoopste exchange
        </div>
      </div>
    );
  }

  if (!symbol) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>MEXC Live Trading</div>
        <div style={{ fontSize: 13, color: "var(--orange)", background: "color-mix(in srgb, var(--orange) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--orange) 25%, transparent)", borderRadius: 8, padding: "10px 12px" }}>
          <strong>{asset}</strong> is niet beschikbaar als USDT-paar op MEXC Spot.<br />
          Kies een crypto asset (BTC, ETH, SOL…) voor live trading.
        </div>
      </div>
    );
  }

  const isFilled   = lastOrder?.status === "FILLED";
  const isCanceled = lastOrder?.status === "CANCELED";

  // Berekend gemiddelde uitvoerprijs
  const avgPrice = lastOrder?.executedQty && lastOrder?.cummulativeQuoteQty && parseFloat(lastOrder.executedQty) > 0
    ? parseFloat(lastOrder.cummulativeQuoteQty) / parseFloat(lastOrder.executedQty)
    : 0;

  return (
    <div style={{ padding: "12px 0" }}>

      {/* Waarschuwing echte USDT */}
      <div style={{ background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "var(--red)" }}>
        <strong>ECHTE USDT</strong> — dit zijn geen testorders. Handel verantwoord.
      </div>

      {/* 0% fee badge */}
      <div style={{ background: "color-mix(in srgb, var(--green) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 20%, transparent)", borderRadius: 8, padding: "6px 12px", marginBottom: 14, fontSize: 12, color: "var(--green)", display: "flex", alignItems: "center", gap: 6 }}>
        <strong>0% maker fee</strong> — MEXC heeft de laagste fees ter wereld
      </div>

      {/* Balances */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "8px 14px", flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>USDT</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>${usdtBalance.toFixed(2)}</div>
        </div>
        <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "8px 14px", flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{ticker}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{coinBalance.toFixed(6)}</div>
        </div>
        <button
          style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "0 12px", cursor: "pointer", color: "var(--text-secondary)", fontSize: 14 }}
          onClick={fetchBalance}
          title="Verversen"
        >↻</button>
      </div>

      {/* BUY / SELL toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["BUY", "SELL"] as const).map(s => (
          <button
            key={s}
            onClick={() => { setSide(s); setLastOrder(null); setOrderError(null); setConfirm(false); }}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 700, fontSize: 13,
              border: "none", cursor: "pointer",
              background: side === s
                ? (s === "BUY" ? "var(--green)" : "var(--red)")
                : "var(--surface-2)",
              color: side === s ? "var(--text)" : "var(--text-secondary)",
            }}
          >
            {s === "BUY" ? "KOOP" : "VERKOOP"}
          </button>
        ))}
      </div>

      {/* Bedrag */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
          {side === "BUY" ? "Bedrag in USDT" : `Hoeveelheid ${ticker}`}
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="number"
            value={amount}
            onChange={e => { setAmount(e.target.value); setConfirm(false); }}
            style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14 }}
          />
          {side === "BUY" && usdtBalance > 0 && (
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
          {side === "SELL" && coinBalance > 0 && (
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
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
          {side === "BUY"
            ? `≈ ${(parseFloat(amount) / currentPrice).toFixed(6)} ${ticker}`
            : `≈ $${(parseFloat(amount) * currentPrice).toFixed(2)} USDT`
          }
          <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>(indicatief · marktorder)</span>
        </div>
      )}

      {/* Bevestigingsstap */}
      {!confirm ? (
        <button
          className="terminal-btn terminal-btn-primary"
          style={{ width: "100%", marginBottom: 10, background: side === "BUY" ? "var(--green)" : "var(--red)", color: "var(--text)" }}
          onClick={() => setConfirm(true)}
          disabled={!parseFloat(amount) || parseFloat(amount) <= 0}
        >
          {side === "BUY"
            ? `Koop ${ticker} voor $${amount} USDT`
            : `Verkoop ${amount} ${ticker}`
          }
        </button>
      ) : (
        <div style={{ background: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ fontWeight: 700, color: "var(--red)", fontSize: 13, marginBottom: 8 }}>
            Bevestig — ECHTE USDT
          </div>
          <div style={{ fontSize: 12, color: "var(--text)", marginBottom: 10 }}>
            {side === "BUY"
              ? `Je staat op het punt $${amount} USDT te gebruiken om ${ticker} te kopen op MEXC.`
              : `Je staat op het punt ${amount} ${ticker} te verkopen op MEXC.`
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
              style={{ flex: 1, background: side === "BUY" ? "var(--green)" : "var(--red)", color: "var(--text)" }}
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
        <div style={{ background: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--red)" }}>
          {orderError}
        </div>
      )}

      {/* Succesbericht + live status */}
      {lastOrder && (
        <div style={{
          background: isFilled
            ? "color-mix(in srgb, var(--green) 10%, transparent)"
            : isCanceled
              ? "color-mix(in srgb, var(--red) 8%, transparent)"
              : "color-mix(in srgb, var(--orange) 8%, transparent)",
          border: `1px solid ${isFilled ? "color-mix(in srgb, var(--green) 25%, transparent)" : isCanceled ? "color-mix(in srgb, var(--red) 25%, transparent)" : "color-mix(in srgb, var(--orange) 25%, transparent)"}`,
          borderRadius: 8, padding: "10px 14px", fontSize: 13
        }}>
          <div style={{
            color: isFilled ? "var(--green)" : isCanceled ? "var(--red)" : "var(--orange)",
            fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6
          }}>
            {isFilled ? "Order uitgevoerd!" : isCanceled ? "Order geannuleerd" : polling ? "Wacht op uitvoering…" : "Order geplaatst"}
            {polling && <span style={{ fontSize: 11, fontWeight: 400, color: "var(--orange)" }}>live update…</span>}
          </div>
          <div style={{ color: isFilled ? "var(--green)" : "var(--text)" }}>
            {lastOrder.side} {lastOrder.executedQty ?? lastOrder.origQty ?? "?"} {ticker}
            {lastOrder.cummulativeQuoteQty && parseFloat(lastOrder.cummulativeQuoteQty) > 0
              ? ` voor $${parseFloat(lastOrder.cummulativeQuoteQty).toFixed(2)}`
              : ""
            }
            {avgPrice > 0 && (
              <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>@ ${avgPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
            )}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
            Order {lastOrder.orderId?.slice(0, 8)}… — status: <strong style={{ color: "var(--text-secondary)" }}>{lastOrder.status}</strong>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10, textAlign: "center" }}>
        Live trading via MEXC Spot · {symbol} · 0% maker fee
      </div>
    </div>
  );
}
