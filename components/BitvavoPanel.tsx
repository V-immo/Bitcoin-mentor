"use client";

import { useEffect, useState } from "react";

type Balance = { symbol: string; available: string; inOrder: string };

type OrderResult = {
  orderId?: string;
  market?: string;
  side?: string;
  orderType?: string;
  amount?: string;
  amountQuote?: string;
  filledAmount?: string;
  filledAmountQuote?: string;
  price?: string;
  status?: string;
};

type Props = { currentPrice: number; asset: string };

// Converteer Binance-symbool (BTCUSDT) naar Bitvavo-markt (BTC-EUR)
function toBitvavoMarket(asset: string): string | null {
  if (!asset.endsWith("USDT") && !asset.endsWith("EUR")) return null;
  const ticker = asset.replace("USDT", "").replace("EUR", "");
  if (!ticker) return null;
  return `${ticker}-EUR`;
}

export default function BitvavoPanel({ currentPrice, asset }: Props) {
  const [connected, setConnected]   = useState<boolean | null>(null);
  const [balances, setBalances]     = useState<Balance[]>([]);
  const [loading, setLoading]       = useState(true);
  const [side, setSide]             = useState<"buy" | "sell">("buy");
  const [amount, setAmount]         = useState("50");
  const [placing, setPlacing]       = useState(false);
  const [lastOrder, setLastOrder]   = useState<OrderResult | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [confirm, setConfirm]       = useState(false);
  const [polling, setPolling]       = useState(false);

  const market = toBitvavoMarket(asset);
  const ticker = market ? market.split("-")[0] : asset.replace("USDT", "");

  const eurBalance  = parseFloat(balances.find(b => b.symbol === "EUR")?.available ?? "0");
  const coinBalance = parseFloat(balances.find(b => b.symbol === ticker)?.available ?? "0");

  async function fetchBalance() {
    setLoading(true);
    const res  = await fetch("/api/bitvavo/balance");
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
    if (!market) {
      setOrderError("Dit asset is niet beschikbaar op Bitvavo");
      setPlacing(false);
      return;
    }

    const body =
      side === "buy"
        ? { market, side, amountQuote: amtNum }
        : { market, side, amount: amtNum };

    const res  = await fetch("/api/bitvavo/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setPlacing(false);

    if (data.error) {
      setOrderError(data.error);
    } else {
      setLastOrder(data);
      fetchBalance();
      // Poll order status tot filled/cancelled (max 8x, elke 1.5s)
      if (data.orderId && data.status !== "filled" && data.status !== "cancelled") {
        setPolling(true);
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await fetch(
              `/api/bitvavo/order/status?orderId=${data.orderId}&market=${encodeURIComponent(data.market ?? market ?? "")}`
            );
            const statusData = await statusRes.json();
            if (!statusData.error) {
              setLastOrder(statusData);
              if (statusData.status === "filled" || statusData.status === "cancelled" || attempts >= 8) {
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

  // Laden
  if (loading) {
    return <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}><div className="skeleton" style={{ height: 18, width: "40%" }} /><div className="skeleton" style={{ height: 14 }} /><div className="skeleton" style={{ height: 14, width: "70%" }} /></div>;
  }

  // Niet gekoppeld
  if (!connected) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 10, fontWeight: 600, color: "var(--text)" }}>💶 Bitvavo Live Trading</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>
          Koppel je Bitvavo API key in{" "}
          <a href="/instellingen" style={{ color: "var(--primary)", textDecoration: "none" }}>Instellingen</a>{" "}
          om live te handelen met echte euro&apos;s.
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--surface)", borderRadius: 8, padding: "10px 12px", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--text-secondary)" }}>Hoe werkt het?</strong><br />
          1. Ga naar <strong>bitvavo.com</strong> → Account → API<br />
          2. Maak een API key aan met handelstoegang<br />
          3. Vul de key in bij Instellingen → Bitvavo<br />
          4. Kom terug en trade live met echte euro&apos;s
        </div>
      </div>
    );
  }

  // Asset niet beschikbaar op Bitvavo
  if (!market) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Bitvavo Live Trading</div>
        <div style={{ fontSize: 13, color: "var(--orange)", background: "color-mix(in srgb, var(--orange) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--orange) 25%, transparent)", borderRadius: 8, padding: "10px 12px" }}>
          <strong>{asset}</strong> is niet beschikbaar op Bitvavo.<br />
          Kies een crypto asset (BTC, ETH, XRP…) voor live trading.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 0" }}>

      {/* Waarschuwing echte euro's */}
      <div style={{ background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "var(--red)" }}>
        <strong>ECHTE EURO&apos;S</strong> — dit zijn geen testorders. Handel verantwoord.
      </div>

      {/* Balances */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ background: "var(--surface)", borderRadius: 8, padding: "8px 14px", flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>EUR</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>€{eurBalance.toFixed(2)}</div>
        </div>
        <div style={{ background: "var(--surface)", borderRadius: 8, padding: "8px 14px", flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{ticker}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{coinBalance.toFixed(6)}</div>
        </div>
        <button
          style={{ background: "none", border: "1px solid var(--surface-1)", borderRadius: 8, padding: "0 12px", cursor: "pointer", color: "var(--text-secondary)", fontSize: 14 }}
          onClick={fetchBalance}
          title="Verversen"
        >↻</button>
      </div>

      {/* BUY / SELL toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["buy", "sell"] as const).map(s => (
          <button
            key={s}
            onClick={() => { setSide(s); setLastOrder(null); setOrderError(null); setConfirm(false); }}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 700, fontSize: 13,
              border: "none", cursor: "pointer",
              background: side === s
                ? (s === "buy" ? "var(--green)" : "var(--red)")
                : "var(--surface-1)",
              color: side === s ? "var(--text)" : "var(--text-secondary)",
            }}
          >
            {s === "buy" ? "KOOP" : "VERKOOP"}
          </button>
        ))}
      </div>

      {/* Bedrag */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
          {side === "buy" ? "Bedrag in EUR" : `Hoeveelheid ${ticker}`}
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="number"
            value={amount}
            onChange={e => { setAmount(e.target.value); setConfirm(false); }}
            style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--surface-1)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14 }}
          />
          {side === "buy" && eurBalance > 0 && (
            <div style={{ display: "flex", gap: 4 }}>
              {[25, 50, 100].map(pct => (
                <button
                  key={pct}
                  onClick={() => { setAmount((eurBalance * pct / 100).toFixed(2)); setConfirm(false); }}
                  style={{ background: "var(--surface-1)", border: "1px solid var(--surface-1)", borderRadius: 6, padding: "0 8px", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
          {side === "sell" && coinBalance > 0 && (
            <div style={{ display: "flex", gap: 4 }}>
              {[25, 50, 100].map(pct => (
                <button
                  key={pct}
                  onClick={() => { setAmount((coinBalance * pct / 100).toFixed(6)); setConfirm(false); }}
                  style={{ background: "var(--surface-1)", border: "1px solid var(--surface-1)", borderRadius: 6, padding: "0 8px", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Koers preview — prijs is indicatief (USD koers van Binance, Bitvavo handelt in EUR) */}
      {currentPrice > 0 && parseFloat(amount) > 0 && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
          {side === "buy"
            ? `≈ ${(parseFloat(amount) / currentPrice).toFixed(6)} ${ticker}`
            : `≈ ${(parseFloat(amount) * currentPrice).toFixed(2)} EUR`
          }
          <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>(indicatief · Bitvavo voert uit in EUR)</span>
        </div>
      )}

      {/* Bevestigingsstap */}
      {!confirm ? (
        <button
          className="terminal-btn terminal-btn-primary"
          style={{ width: "100%", marginBottom: 10, background: side === "buy" ? "var(--green)" : "var(--red)", color: "var(--text)" }}
          onClick={() => setConfirm(true)}
          disabled={!parseFloat(amount) || parseFloat(amount) <= 0}
        >
          {side === "buy"
            ? `Koop ${ticker} voor €${amount}`
            : `Verkoop ${amount} ${ticker}`
          }
        </button>
      ) : (
        <div style={{ background: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ fontWeight: 700, color: "var(--red)", fontSize: 13, marginBottom: 8 }}>
            Bevestig — ECHTE EURO&apos;S
          </div>
          <div style={{ fontSize: 12, color: "var(--text)", marginBottom: 10 }}>
            {side === "buy"
              ? `Je staat op het punt €${amount} EUR te gebruiken om ${ticker} te kopen op Bitvavo.`
              : `Je staat op het punt ${amount} ${ticker} te verkopen op Bitvavo.`
            }
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{ flex: 1, padding: "8px 0", background: "var(--surface-1)", border: "1px solid var(--surface-1)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}
              onClick={() => setConfirm(false)}
            >
              Annuleer
            </button>
            <button
              className="terminal-btn terminal-btn-primary"
              style={{ flex: 1, background: side === "buy" ? "var(--green)" : "var(--red)", color: "var(--text)" }}
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
          background: lastOrder.status === "filled"
            ? "color-mix(in srgb, var(--green) 10%, transparent)"
            : lastOrder.status === "cancelled"
              ? "color-mix(in srgb, var(--red) 8%, transparent)"
              : "color-mix(in srgb, var(--orange) 8%, transparent)",
          border: `1px solid ${lastOrder.status === "filled" ? "color-mix(in srgb, var(--green) 25%, transparent)" : lastOrder.status === "cancelled" ? "color-mix(in srgb, var(--red) 25%, transparent)" : "color-mix(in srgb, var(--orange) 25%, transparent)"}`,
          borderRadius: 8, padding: "10px 14px", fontSize: 13
        }}>
          <div style={{
            color: lastOrder.status === "filled" ? "var(--green)" : lastOrder.status === "cancelled" ? "var(--red)" : "var(--orange)",
            fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6
          }}>
            {lastOrder.status === "filled" ? "Order uitgevoerd!" : lastOrder.status === "cancelled" ? "Order geannuleerd" : polling ? "Wacht op uitvoering…" : "Order geplaatst"}
            {polling && <span style={{ fontSize: 11, fontWeight: 400, color: "var(--orange)" }}>live update…</span>}
          </div>
          <div style={{ color: lastOrder.status === "filled" ? "var(--green)" : "var(--text)" }}>
            {lastOrder.side?.toUpperCase()} {lastOrder.filledAmount ?? lastOrder.amount ?? "?"} {ticker}
            {lastOrder.filledAmountQuote
              ? ` voor €${parseFloat(lastOrder.filledAmountQuote).toFixed(2)}`
              : lastOrder.amountQuote
                ? ` voor €${parseFloat(lastOrder.amountQuote).toFixed(2)}`
                : ""
            }
            {lastOrder.price && parseFloat(lastOrder.price) > 0 && (
              <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>@ €{parseFloat(lastOrder.price).toLocaleString("nl-NL")}</span>
            )}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
            Order {lastOrder.orderId?.slice(0, 8)}… — status: <strong style={{ color: "var(--text-secondary)" }}>{lastOrder.status}</strong>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--surface-1)", marginTop: 10, textAlign: "center" }}>
        💶 Live trading via Bitvavo · Markt: {market}
      </div>
    </div>
  );
}
