"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type Balance = { asset: string; free: string; locked: string };

type OrderResult = {
  orderId?: number;
  symbol?: string;
  side?: string;
  executedQty?: string;
  cummulativeQuoteQty?: string;
  status?: string;
};

type Props = { currentPrice: number; asset: string };

export default function TestnetPanel({ currentPrice, asset }: Props) {
  const { t } = useLanguage();
  const [connected, setConnected]   = useState<boolean | null>(null);
  const [balances, setBalances]     = useState<Balance[]>([]);
  const [loading, setLoading]       = useState(true);
  const [side, setSide]             = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount]         = useState("100");
  const [placing, setPlacing]       = useState(false);
  const [lastOrder, setLastOrder]   = useState<OrderResult | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const symbol = asset.endsWith("USDT") ? asset : "BTCUSDT";
  const ticker  = symbol.replace("USDT", "");

  const usdtBalance = parseFloat(balances.find(b => b.asset === "USDT")?.free ?? "0");
  const coinBalance = parseFloat(balances.find(b => b.asset === ticker)?.free ?? "0");

  async function fetchBalance() {
    setLoading(true);
    const res = await fetch("/api/testnet/balance");
    const data = await res.json();
    setConnected(!!data.connected);
    if (data.connected) setBalances(data.balances ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchBalance(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function placeOrder() {
    setPlacing(true); setOrderError(null); setLastOrder(null);
    const amtNum = parseFloat(amount);
    if (!amtNum || amtNum <= 0) { setOrderError("Ongeldig bedrag"); setPlacing(false); return; }

    const body = side === "BUY"
      ? { symbol, side, quoteQty: amtNum }
      : { symbol, side, qty: amtNum };

    const res = await fetch("/api/testnet/order", {
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
    }
  }

  if (loading) {
    return <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}><div className="skeleton" style={{ height: 18, width: "40%" }} /><div className="skeleton" style={{ height: 14 }} /><div className="skeleton" style={{ height: 14, width: "70%" }} /></div>;
  }

  if (!connected) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 10, fontWeight: 600, color: "var(--text)" }}>🔬 Binance Testnet</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>
          Koppel je Binance Testnet API keys in{" "}
          <a href="/instellingen" style={{ color: "var(--primary)", textDecoration: "none" }}>Instellingen</a>{" "}
          om echte orders te oefenen met gratis testgeld.
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--surface)", borderRadius: 8, padding: "10px 12px", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--text-secondary)" }}>Hoe werkt het?</strong><br />
          1. Ga naar <strong>testnet.binance.vision</strong><br />
          2. Log in met GitHub → maak API keys<br />
          3. Vul de keys in bij Instellingen → Binance Testnet<br />
          4. Kom terug en trade met gratis 10.000 USDT testgeld
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 0" }}>
      {/* Balances */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ background: "var(--surface)", borderRadius: 8, padding: "8px 14px", flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>USDT</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>${usdtBalance.toFixed(2)}</div>
        </div>
        <div style={{ background: "var(--surface)", borderRadius: 8, padding: "8px 14px", flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{ticker}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{coinBalance.toFixed(6)}</div>
        </div>
        <button
          style={{ background: "none", border: "1px solid #3d2a3b", borderRadius: 8, padding: "0 12px", cursor: "pointer", color: "var(--text-secondary)", fontSize: 14 }}
          onClick={fetchBalance}
        >↻</button>
      </div>

      {/* BUY / SELL toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["BUY", "SELL"] as const).map(s => (
          <button
            key={s}
            onClick={() => { setSide(s); setLastOrder(null); setOrderError(null); }}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 700, fontSize: 13,
              border: "none", cursor: "pointer",
              background: side === s
                ? (s === "BUY" ? "var(--green)" : "var(--red)")
                : "var(--surface-1)",
              color: side === s ? "#fff" : "var(--text-secondary)",
            }}
          >
            {s === "BUY" ? "🟢 KOOP" : "🔴 VERKOOP"}
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
            onChange={e => setAmount(e.target.value)}
            style={{ flex: 1, background: "var(--surface)", border: "1px solid #3d2a3b", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 14 }}
          />
          {side === "BUY" && (
            <div style={{ display: "flex", gap: 4 }}>
              {[25, 50, 100].map(pct => (
                <button
                  key={pct}
                  onClick={() => setAmount((usdtBalance * pct / 100).toFixed(2))}
                  style={{ background: "var(--surface-1)", border: "1px solid #3d2a3b", borderRadius: 6, padding: "0 8px", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Koers preview */}
      {currentPrice > 0 && side === "BUY" && parseFloat(amount) > 0 && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
          ≈ {(parseFloat(amount) / currentPrice).toFixed(6)} {ticker} @ ${currentPrice.toLocaleString("en-US")}
        </div>
      )}

      {/* Order button */}
      <button
        className="terminal-btn terminal-btn-primary"
        style={{ width: "100%", marginBottom: 10 }}
        onClick={placeOrder}
        disabled={placing}
      >
        {placing ? "Bestelling plaatsen…" : `${side === "BUY" ? "Koop" : "Verkoop"} ${ticker} — Testnet`}
      </button>

      {/* Fout */}
      {orderError && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--red)" }}>
          ❌ {orderError}
        </div>
      )}

      {/* Succesbericht */}
      {lastOrder && (
        <div style={{ background: "rgba(38,197,124,0.1)", border: "1px solid rgba(38,197,124,0.25)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
          <div style={{ color: "var(--green)", fontWeight: 600, marginBottom: 4 }}>✅ Order geplaatst!</div>
          <div style={{ color: "var(--green)" }}>
            {lastOrder.side} {parseFloat(lastOrder.executedQty ?? "0").toFixed(6)} {ticker}
            {" "}voor ${parseFloat(lastOrder.cummulativeQuoteQty ?? "0").toFixed(2)}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>Order #{lastOrder.orderId} — {lastOrder.status}</div>
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--surface-1)", marginTop: 10, textAlign: "center" }}>
        🔬 Dit zijn testnet orders — geen echt geld
      </div>
    </div>
  );
}
