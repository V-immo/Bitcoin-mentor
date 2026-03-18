"use client";

import { useEffect, useState } from "react";

type BalanceItem = {
  symbol: string;
  available: string;
  inOrder: string;
};

type BalanceResponse =
  | { connected: false; error?: string }
  | { connected: true; balance: BalanceItem[] };

type TradingTab = "paper" | "real";

export default function BitvavoPanel() {
  const [tab, setTab] = useState<TradingTab>("paper");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<BalanceItem[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAll, setSellAll] = useState(false);
  const [orderMsg, setOrderMsg] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);

  function getBtcBalance(): BalanceItem | undefined {
    return balance.find((b) => b.symbol === "BTC");
  }
  function getEurBalance(): BalanceItem | undefined {
    return balance.find((b) => b.symbol === "EUR");
  }

  async function loadBalance() {
    if (connected === false) return;
    setLoadingBalance(true);
    try {
      const res = await fetch("/api/bitvavo/balance");
      const data: BalanceResponse = await res.json();
      if (data.connected) {
        setConnected(true);
        setBalance(data.balance);
      } else {
        setConnected(false);
        setBalance([]);
      }
    } catch {
      setConnected(false);
    } finally {
      setLoadingBalance(false);
    }
  }

  useEffect(() => {
    loadBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveKeys() {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bitvavoApiKey: apiKey, bitvavoApiSecret: apiSecret }),
      });
      if (res.ok) {
        setSaveMsg("Opgeslagen! Verbinding wordt getest…");
        setApiKey("");
        setApiSecret("");
        await loadBalance();
        setSaveMsg(connected ? "Verbonden met Bitvavo!" : "Sleutels opgeslagen maar verbinding mislukt.");
      } else {
        const d = await res.json().catch(() => ({}));
        setSaveMsg(d.error ?? "Opslaan mislukt");
      }
    } catch {
      setSaveMsg("Netwerkfout");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 4000);
    }
  }

  async function placeOrder(side: "buy" | "sell") {
    setOrdering(true);
    setOrderMsg("");
    try {
      const amountQuote =
        side === "buy"
          ? parseFloat(buyAmount)
          : parseFloat(getBtcBalance()?.available ?? "0") * 1; // sell all: use full BTC amount as quote approximation

      if (isNaN(amountQuote) || amountQuote <= 0) {
        setOrderMsg("Ongeldig bedrag");
        setOrdering(false);
        return;
      }

      const body =
        side === "buy"
          ? { market: "BTC-EUR", side: "buy", amountQuote }
          : { market: "BTC-EUR", side: "sell", amountQuote };

      const res = await fetch("/api/bitvavo/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setOrderMsg(`Order geplaatst! Order ID: ${data.orderId ?? "—"}`);
        setBuyAmount("");
        setTimeout(loadBalance, 2000);
      } else {
        setOrderMsg(data.error ?? "Order mislukt");
      }
    } catch {
      setOrderMsg("Netwerkfout bij order");
    } finally {
      setOrdering(false);
      setTimeout(() => setOrderMsg(""), 6000);
    }
  }

  const btc = getBtcBalance();
  const eur = getEurBalance();

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Tab header */}
      <div style={{ display: "flex", borderBottom: "1px solid #2a1a28" }}>
        {(["paper", "real"] as TradingTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "10px 0",
              background: tab === t ? "#1a0f18" : "transparent",
              border: "none",
              color: tab === t ? "#e91e63" : "#bf7a99",
              fontWeight: tab === t ? 700 : 400,
              fontSize: 13,
              cursor: "pointer",
              borderBottom: tab === t ? "2px solid #e91e63" : "2px solid transparent",
            }}
          >
            {t === "paper" ? "Paper Trading" : "Echt Traden"}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px" }}>
        {tab === "paper" && (
          <div className="small-text muted" style={{ padding: "12px 0" }}>
            Paper trading gebruikt virtueel geld. Schakel over naar "Echt Traden" om te koppelen met Bitvavo.
          </div>
        )}

        {tab === "real" && (
          <>
            {/* Waarschuwingsbanner */}
            <div
              style={{
                background: "#3a1a10",
                border: "1px solid #e91e2060",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "#ff6b35",
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 16 }}>⚠️</span>
              Let op: dit zijn echte orders met echt geld!
            </div>

            {/* Verbindingsstatus */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: connected === true ? "#4caf50" : connected === false ? "#e91e63" : "#888",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span className="small-text" style={{ color: connected === true ? "#4caf50" : "#bf7a99" }}>
                {connected === null
                  ? "Verbinding controleren…"
                  : connected
                  ? "Verbonden met Bitvavo"
                  : "Niet verbonden"}
              </span>
              {connected === true && (
                <button
                  className="btn-secondary"
                  style={{ marginLeft: "auto", padding: "2px 10px", fontSize: 11 }}
                  onClick={loadBalance}
                  disabled={loadingBalance}
                >
                  ↻
                </button>
              )}
            </div>

            {/* Koppelen sectie */}
            <div style={{ marginBottom: 20 }}>
              <div className="label" style={{ marginBottom: 8 }}>
                {connected ? "API sleutels bijwerken" : "Verbinden met Bitvavo"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  className="admin-input"
                  type="password"
                  placeholder="API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
                <input
                  className="admin-input"
                  type="password"
                  placeholder="API Secret"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
                <button
                  className="btn-primary"
                  onClick={saveKeys}
                  disabled={saving || !apiKey || !apiSecret}
                  style={{ width: "100%" }}
                >
                  {saving ? "Opslaan…" : "Opslaan"}
                </button>
                {saveMsg && (
                  <div
                    className="small-text"
                    style={{ color: saveMsg.includes("erbonden") ? "#4caf50" : "#ff6b35" }}
                  >
                    {saveMsg}
                  </div>
                )}
              </div>
            </div>

            {/* Saldo weergave */}
            {connected === true && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      background: "#1a0f18",
                      borderRadius: 8,
                      padding: "12px",
                      textAlign: "center",
                    }}
                  >
                    <div className="label" style={{ fontSize: 11, marginBottom: 4 }}>
                      BTC beschikbaar
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#e8d5e0" }}>
                      {btc ? parseFloat(btc.available).toFixed(6) : "0.000000"}
                    </div>
                    {btc && parseFloat(btc.inOrder) > 0 && (
                      <div className="small-text muted">
                        In order: {parseFloat(btc.inOrder).toFixed(6)}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      background: "#1a0f18",
                      borderRadius: 8,
                      padding: "12px",
                      textAlign: "center",
                    }}
                  >
                    <div className="label" style={{ fontSize: 11, marginBottom: 4 }}>
                      EUR beschikbaar
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#e8d5e0" }}>
                      € {eur ? parseFloat(eur.available).toFixed(2) : "0.00"}
                    </div>
                    {eur && parseFloat(eur.inOrder) > 0 && (
                      <div className="small-text muted">
                        In order: € {parseFloat(eur.inOrder).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Koop BTC */}
                <div style={{ marginBottom: 16 }}>
                  <div className="label" style={{ marginBottom: 8 }}>
                    Koop BTC
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="admin-input"
                      type="number"
                      min="1"
                      placeholder="EUR bedrag"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn-primary"
                      style={{ background: "#1b5e20", borderColor: "#4caf50", flexShrink: 0 }}
                      onClick={() => placeOrder("buy")}
                      disabled={ordering || !buyAmount}
                    >
                      {ordering ? "…" : "Koop"}
                    </button>
                  </div>
                </div>

                {/* Verkoop BTC */}
                <div style={{ marginBottom: 16 }}>
                  <div className="label" style={{ marginBottom: 4 }}>
                    Verkoop BTC
                  </div>
                  <div className="small-text muted" style={{ marginBottom: 8 }}>
                    Beschikbaar: {btc ? parseFloat(btc.available).toFixed(6) : "0"} BTC
                  </div>
                  <button
                    className="btn-primary"
                    style={{
                      background: "#3a0010",
                      borderColor: "#e91e63",
                      width: "100%",
                      opacity: !btc || parseFloat(btc.available) === 0 ? 0.5 : 1,
                    }}
                    onClick={() => { setSellAll(true); placeOrder("sell"); }}
                    disabled={ordering || !btc || parseFloat(btc.available) === 0}
                  >
                    {ordering && sellAll ? "…" : "Verkoop alles"}
                  </button>
                </div>

                {orderMsg && (
                  <div
                    className="small-text"
                    style={{
                      color: orderMsg.includes("geplaatst") ? "#4caf50" : "#ff6b35",
                      marginBottom: 8,
                    }}
                  >
                    {orderMsg}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
