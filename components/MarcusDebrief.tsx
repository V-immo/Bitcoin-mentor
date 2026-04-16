"use client";

// MarcusDebrief — toont na elke paper trade een persoonlijke debrief van Marcus.
// Luistert naar "marcus-trade-debrief" events van TerminalPaperPanel.
// Dit bestaat nergens anders: TradingView heeft paper trading maar geeft nul feedback.
// Marcus analyseert entry, stop-loss, R/R en geeft één concreet verbeterpunt.

import { useEffect, useState } from "react";
import type { TradeCloseDetail } from "@/components/TerminalPaperPanel";

type State =
  | { phase: "idle" }
  | { phase: "loading"; detail: TradeCloseDetail }
  | { phase: "done"; detail: TradeCloseDetail; debrief: string };

export default function MarcusDebrief() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [savedToJournal, setSavedToJournal] = useState(false);

  useEffect(() => {
    async function onTradeClose(e: Event) {
      const detail = (e as CustomEvent<TradeCloseDetail>).detail;
      setState({ phase: "loading", detail });
      setSavedToJournal(false);

      try {
        const res = await fetch("/api/me/trade-debrief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entry: detail.entryPrice,
            exit: detail.exitPrice,
            side: "long",
            pnl: detail.pnl,
            asset: detail.asset.replace("USDT", ""),
            stopLoss: detail.stopLoss,
            takeProfit: detail.takeProfit,
            reason: detail.reason,
            btcAmount: detail.btcAmount,
          }),
        });

        if (!res.ok) throw new Error("API fout");
        const data = await res.json() as { debrief: string };
        setState({ phase: "done", detail, debrief: data.debrief });
      } catch {
        setState({
          phase: "done",
          detail,
          debrief: detail.pnl < 0
            ? "Analyseer deze trade eerlijk: was je entry correct? Was je stop-loss op de juiste plek?"
            : "Winst — maar controleer altijd of je R/R-verhouding klopte vóór je inging.",
        });
      }
    }

    window.addEventListener("marcus-trade-debrief", onTradeClose);
    return () => window.removeEventListener("marcus-trade-debrief", onTradeClose);
  }, []);

  async function saveToJournal() {
    if (state.phase !== "done") return;
    const { detail, debrief } = state;
    const today = new Date().toISOString().slice(0, 10);
    const pnlStr = detail.pnl >= 0
      ? `+€${detail.pnl.toFixed(2)}`
      : `-€${Math.abs(detail.pnl).toFixed(2)}`;

    try {
      await fetch("/api/me/journal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          tradeSummary: `${detail.asset} | Entry €${detail.entryPrice.toFixed(0)} → Exit €${detail.exitPrice.toFixed(0)} | ${pnlStr} | ${detail.reason}`,
          lessons: debrief,
        }),
      });
      setSavedToJournal(true);
    } catch { /* stilletjes falen */ }
  }

  function dismiss() {
    setState({ phase: "idle" });
    setSavedToJournal(false);
  }

  if (state.phase === "idle") return null;

  const { detail } = state;
  const isWin = detail.pnl >= 0;
  const pnlFormatted = isWin
    ? `+€${detail.pnl.toFixed(2)}`
    : `-€${Math.abs(detail.pnl).toFixed(2)}`;

  return (
    <div className="marcus-debrief-overlay" onClick={dismiss}>
      <div className="marcus-debrief-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="marcus-debrief-header">
          <div className="marcus-debrief-avatar">M</div>
          <div>
            <div className="marcus-debrief-title">Marcus analyseert</div>
            <div className="marcus-debrief-subtitle">
              {detail.asset.replace("USDT", "")} &nbsp;·&nbsp;
              <span className={isWin ? "debrief-win" : "debrief-loss"}>{pnlFormatted}</span>
              &nbsp;·&nbsp;
              {detail.reason === "sl" ? "Stop-loss" : detail.reason === "tp" ? "Take-profit" : "Manueel gesloten"}
            </div>
          </div>
          <button className="marcus-debrief-close" onClick={dismiss}>✕</button>
        </div>

        {/* Body */}
        <div className="marcus-debrief-body">
          {state.phase === "loading" ? (
            <div className="marcus-debrief-loading">
              <span className="marcus-debrief-dots" />
              Marcus analyseert je trade…
            </div>
          ) : (
            <p className="marcus-debrief-text">{state.debrief}</p>
          )}
        </div>

        {/* Footer */}
        {state.phase === "done" && (
          <div className="marcus-debrief-footer">
            {savedToJournal ? (
              <span className="debrief-saved">✓ Opgeslagen in journal</span>
            ) : (
              <button className="marcus-debrief-save-btn" onClick={saveToJournal}>
                📔 Sla op in journal
              </button>
            )}
            <button className="marcus-debrief-dismiss-btn" onClick={dismiss}>
              Begrepen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
