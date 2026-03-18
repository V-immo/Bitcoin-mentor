"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PaperPosition = {
  qty: number;
  entryPrice: number;
  investedAmount: number;
  openedAt: string;
};

type TradeHistoryItem = {
  type: "buy" | "sell";
  amount: number;
  price: number;
  qty: number;
  timestamp: string;
  pnl?: number;
};

type PaperState = {
  startingBalance: number;
  cash: number;
  position: PaperPosition | null;
  history: TradeHistoryItem[];
};

type Props = {
  currentPrice: number;
  entryZoneText: string;
  stopLoss: number;
  status: string;
  action: string;
  asset?: string;
};

function createInitialState(startingBalance = 10000): PaperState {
  return {
    startingBalance,
    cash: startingBalance,
    position: null,
    history: [],
  };
}

export default function PaperTradingPanel({
  currentPrice,
  entryZoneText,
  stopLoss,
  status,
  action,
  asset = "BTCUSDT",
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [paper, setPaper] = useState<PaperState>(createInitialState());
  const [startBalanceInput, setStartBalanceInput] = useState("10000");
  const [buyAmountInput, setBuyAmountInput] = useState("1000");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveToApi = useCallback(
    (state: PaperState) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        fetch(`/api/me/paper?asset=${asset}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startingBalance: state.startingBalance,
            cash: state.cash,
            position: state.position,
            history: state.history,
          }),
        }).catch(() => {});
      }, 300);
    },
    [asset]
  );

  // Fetch on mount and when asset changes
  useEffect(() => {
    setLoaded(false);
    fetch(`/api/me/paper?asset=${asset}`)
      .then((res) => res.json())
      .then((data) => {
        if (
          typeof data.startingBalance === "number" &&
          typeof data.cash === "number"
        ) {
          const parsed: PaperState = {
            startingBalance: data.startingBalance,
            cash: data.cash,
            position: data.position ?? null,
            history: data.history ?? [],
          };
          setPaper(parsed);
          setStartBalanceInput(String(data.startingBalance));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [asset]);

  // Save whenever paper state changes (after initial load)
  useEffect(() => {
    if (!loaded) return;
    saveToApi(paper);
  }, [paper, loaded, saveToApi]);

  const positionValue = useMemo(() => {
    if (!paper.position) return 0;
    return paper.position.qty * currentPrice;
  }, [paper.position, currentPrice]);

  const unrealizedPnl = useMemo(() => {
    if (!paper.position) return 0;
    return positionValue - paper.position.investedAmount;
  }, [paper.position, positionValue]);

  const totalBalance = useMemo(() => {
    return paper.cash + positionValue;
  }, [paper.cash, positionValue]);

  const closedTrades = useMemo(() => {
    return paper.history.filter(
      (item) => item.type === "sell" && typeof item.pnl === "number"
    );
  }, [paper.history]);

  const totalClosedPnl = useMemo(() => {
    return closedTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
  }, [closedTrades]);

  const wins = useMemo(() => {
    return closedTrades.filter((trade) => (trade.pnl ?? 0) > 0).length;
  }, [closedTrades]);

  const losses = useMemo(() => {
    return closedTrades.filter((trade) => (trade.pnl ?? 0) < 0).length;
  }, [closedTrades]);

  const winRate = useMemo(() => {
    if (closedTrades.length === 0) return 0;
    return (wins / closedTrades.length) * 100;
  }, [wins, closedTrades.length]);

  // Equity curve: startingBalance + cumulative pnl after each closed trade
  const equityCurve = useMemo(() => {
    const sells = [...paper.history].reverse().filter(
      (item) => item.type === "sell" && typeof item.pnl === "number"
    );
    const points: number[] = [paper.startingBalance];
    let running = paper.startingBalance;
    for (const trade of sells) {
      running += trade.pnl ?? 0;
      points.push(running);
    }
    return points;
  }, [paper.history, paper.startingBalance]);

  const bestTrade = useMemo(() => {
    if (closedTrades.length === 0) return null;
    return closedTrades.reduce((best, trade) =>
      (trade.pnl ?? 0) > (best.pnl ?? 0) ? trade : best
    );
  }, [closedTrades]);

  const worstTrade = useMemo(() => {
    if (closedTrades.length === 0) return null;
    return closedTrades.reduce((worst, trade) =>
      (trade.pnl ?? 0) < (worst.pnl ?? 0) ? trade : worst
    );
  }, [closedTrades]);

  const canOpenTrade =
    !paper.position &&
    Number.isFinite(Number(buyAmountInput)) &&
    Number(buyAmountInput) > 0 &&
    Number(buyAmountInput) <= paper.cash;

  const nearStopLoss = paper.position ? currentPrice <= stopLoss : false;

  function resetPaperAccount() {
    const nextStart = Number(startBalanceInput);
    const safeStart =
      Number.isFinite(nextStart) && nextStart > 0 ? nextStart : 10000;

    const resetState: PaperState = {
      startingBalance: safeStart,
      cash: safeStart,
      position: null,
      history: [],
    };
    setPaper(resetState);
  }

  function openVirtualBuy() {
    const amount = Number(buyAmountInput);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Vul een geldig bedrag in.");
      return;
    }

    if (paper.position) {
      alert("Je hebt al een open paper trade.");
      return;
    }

    if (amount > paper.cash) {
      alert("Je hebt niet genoeg paper cash.");
      return;
    }

    const qty = amount / currentPrice;

    setPaper({
      ...paper,
      cash: paper.cash - amount,
      position: {
        qty,
        entryPrice: currentPrice,
        investedAmount: amount,
        openedAt: new Date().toISOString(),
      },
      history: [
        {
          type: "buy",
          amount,
          price: currentPrice,
          qty,
          timestamp: new Date().toISOString(),
        },
        ...paper.history,
      ],
    });
  }

  function closeVirtualTrade() {
    if (!paper.position) {
      alert("Er is geen open paper trade.");
      return;
    }

    const sellValue = paper.position.qty * currentPrice;
    const pnl = sellValue - paper.position.investedAmount;

    setPaper({
      ...paper,
      cash: paper.cash + sellValue,
      position: null,
      history: [
        {
          type: "sell",
          amount: sellValue,
          price: currentPrice,
          qty: paper.position.qty,
          pnl,
          timestamp: new Date().toISOString(),
        },
        ...paper.history,
      ],
    });
  }

  function exportCSV() {
    const header = "timestamp,type,amount,price,qty,pnl";
    const rows = paper.history.map((item) => {
      const pnl = typeof item.pnl === "number" ? item.pnl.toFixed(2) : "";
      return [
        item.timestamp,
        item.type,
        item.amount.toFixed(2),
        item.price.toFixed(2),
        item.qty.toFixed(6),
        pnl,
      ].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paper-trades-${asset}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!loaded) {
    return (
      <div className="card focus-card">
        <div className="label">Paper trading</div>
        <div className="small-text muted">Laden...</div>
      </div>
    );
  }

  return (
    <div className="card focus-card">
      <div className="label">Paper trading met nepgeld</div>

      <div className="paper-main-status">
        <div className="paper-main-box">
          <span className="paper-main-label">Status</span>
          <span className="paper-main-value">{status}</span>
        </div>
        <div className="paper-main-box">
          <span className="paper-main-label">Actie</span>
          <span className="paper-main-value">{action}</span>
        </div>
        <div className="paper-main-box">
          <span className="paper-main-label">Koopzone</span>
          <span className="paper-main-value">{entryZoneText}</span>
        </div>
      </div>

      <div className="paper-grid" style={{ marginTop: 14 }}>
        <div className="paper-stat">
          <span className="paper-stat-label">Startkapitaal</span>
          <span className="paper-stat-value">
            €{paper.startingBalance.toFixed(2)}
          </span>
        </div>

        <div className="paper-stat">
          <span className="paper-stat-label">Cash</span>
          <span className="paper-stat-value">€{paper.cash.toFixed(2)}</span>
        </div>

        <div className="paper-stat">
          <span className="paper-stat-label">Open positie</span>
          <span className="paper-stat-value">€{positionValue.toFixed(2)}</span>
        </div>

        <div className="paper-stat">
          <span className="paper-stat-label">Totale balans</span>
          <span className="paper-stat-value">€{totalBalance.toFixed(2)}</span>
        </div>
      </div>

      <div className="paper-grid" style={{ marginTop: 12 }}>
        <div className="paper-stat">
          <span className="paper-stat-label">Open P/L</span>
          <span
            className={`paper-stat-value ${unrealizedPnl > 0 ? "green" : unrealizedPnl < 0 ? "red" : ""
              }`}
          >
            €{unrealizedPnl.toFixed(2)}
          </span>
        </div>

        <div className="paper-stat">
          <span className="paper-stat-label">Gesloten P/L</span>
          <span
            className={`paper-stat-value ${totalClosedPnl > 0 ? "green" : totalClosedPnl < 0 ? "red" : ""
              }`}
          >
            €{totalClosedPnl.toFixed(2)}
          </span>
        </div>

        <div className="paper-stat">
          <span className="paper-stat-label">Aantal gesloten trades</span>
          <span className="paper-stat-value">{closedTrades.length}</span>
        </div>

        <div className="paper-stat">
          <span className="paper-stat-label">Winrate</span>
          <span className="paper-stat-value">{winRate.toFixed(1)}%</span>
        </div>
      </div>

      <div className="paper-grid" style={{ marginTop: 12 }}>
        <div className="paper-stat">
          <span className="paper-stat-label">Wins</span>
          <span className="paper-stat-value">{wins}</span>
        </div>

        <div className="paper-stat">
          <span className="paper-stat-label">Losses</span>
          <span className="paper-stat-value">{losses}</span>
        </div>

        <div className="paper-stat">
          <span className="paper-stat-label">Beste trade</span>
          <span
            className={`paper-stat-value ${bestTrade && (bestTrade.pnl ?? 0) > 0 ? "green" : ""
              }`}
          >
            {bestTrade ? `€${(bestTrade.pnl ?? 0).toFixed(2)}` : "-"}
          </span>
        </div>

        <div className="paper-stat">
          <span className="paper-stat-label">Slechtste trade</span>
          <span
            className={`paper-stat-value ${worstTrade && (worstTrade.pnl ?? 0) < 0 ? "red" : ""
              }`}
          >
            {worstTrade ? `€${(worstTrade.pnl ?? 0).toFixed(2)}` : "-"}
          </span>
        </div>
      </div>

      {/* Equity curve */}
      {equityCurve.length > 1 && (() => {
        const W = 400;
        const H = 80;
        const min = Math.min(...equityCurve);
        const max = Math.max(...equityCurve);
        const range = max - min || 1;
        const pad = 4;
        const pts = equityCurve.map((v, i) => {
          const x = pad + (i / (equityCurve.length - 1)) * (W - pad * 2);
          const y = H - pad - ((v - min) / range) * (H - pad * 2);
          return `${x},${y}`;
        });
        const polyline = pts.join(" ");
        const lastVal = equityCurve[equityCurve.length - 1];
        const isGreen = lastVal >= paper.startingBalance;
        const lineColor = isGreen ? "#26c57c" : "#ef4444";
        const gradId = `eq-grad-${isGreen ? "g" : "r"}`;
        // Build closed fill path: line then back along bottom
        const firstPt = pts[0].split(",");
        const lastPt = pts[pts.length - 1].split(",");
        const fillPath = `M ${pts.join(" L ")} L ${lastPt[0]},${H - pad} L ${firstPt[0]},${H - pad} Z`;

        return (
          <div style={{ margin: "14px 0 4px 0" }}>
            <div className="small-text muted" style={{ marginBottom: 4 }}>Equity curve</div>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              height={H}
              style={{ display: "block", borderRadius: 8, background: "#1a0f18" }}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={lineColor} stopOpacity="0.03" />
                </linearGradient>
              </defs>
              <path d={fillPath} fill={`url(#${gradId})`} />
              <polyline
                points={polyline}
                fill="none"
                stroke={lineColor}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </div>
        );
      })()}

      <div className="paper-form">
        <div className="paper-field">
          <label className="label">Startkapitaal</label>
          <input
            className="input"
            type="number"
            value={startBalanceInput}
            onChange={(e) => setStartBalanceInput(e.target.value)}
            placeholder="10000"
          />
        </div>

        <div className="paper-field">
          <label className="label">Bedrag voor virtuele koop</label>
          <input
            className="input"
            type="number"
            value={buyAmountInput}
            onChange={(e) => setBuyAmountInput(e.target.value)}
            placeholder="1000"
          />
        </div>
      </div>

      <div className="button-row">
        <button className="btn-primary" onClick={resetPaperAccount}>
          Reset account
        </button>

        <button
          className="btn-secondary"
          onClick={openVirtualBuy}
          disabled={!canOpenTrade}
        >
          Open koop
        </button>

        <button
          className="btn-secondary"
          onClick={closeVirtualTrade}
          disabled={!paper.position}
        >
          Sluit trade
        </button>
      </div>

      {paper.position && (
        <div className="small-text muted" style={{ marginTop: 12 }}>
          Open trade sinds{" "}
          {new Date(paper.position.openedAt).toLocaleString("nl-BE")} {" • "}
          Entry: ${paper.position.entryPrice.toFixed(2)} {" • "}BTC qty:{" "}
          {paper.position.qty.toFixed(6)}
        </div>
      )}

      {nearStopLoss && (
        <div className="warning-box">
          Let op: de huidige prijs zit op of onder de stop-loss van $
          {Math.round(stopLoss).toLocaleString("en-US")}.
        </div>
      )}

      <details className="details-block" style={{ marginTop: 14 }}>
        <summary style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Trade geschiedenis</span>
          {paper.history.length > 0 && (
            <button
              className="btn-secondary"
              style={{ padding: "2px 10px", fontSize: 11, marginLeft: 10 }}
              onClick={(e) => { e.preventDefault(); exportCSV(); }}
            >
              📥 Export CSV
            </button>
          )}
        </summary>

        <div className="history-list">
          {paper.history.length === 0 && (
            <div className="small-text muted">Nog geen trades.</div>
          )}

          {paper.history.map((item, index) => (
            <div key={`${item.timestamp}-${index}`} className="history-item">
              <div className="history-main">
                <strong>{item.type === "buy" ? "BUY" : "SELL"}</strong>
                <span>{new Date(item.timestamp).toLocaleString("nl-BE")}</span>
              </div>

              <div className="small-text">
                Bedrag: €{item.amount.toFixed(2)} {" • "}Prijs: $
                {item.price.toFixed(2)} {" • "}Qty: {item.qty.toFixed(6)}
                {typeof item.pnl === "number" && (
                  <>
                    {" • "}P/L:{" "}
                    <span
                      className={
                        item.pnl > 0 ? "green" : item.pnl < 0 ? "red" : ""
                      }
                    >
                      €{item.pnl.toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
