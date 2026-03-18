"use client";

import { useEffect, useState } from "react";
import { SCAN_ASSETS } from "@/lib/assets";

export default function GoalTracker() {
  const [goal, setGoal] = useState<number>(0);
  const [editGoal, setEditGoal] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [startCapital, setStartCapital] = useState<number>(10000);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [totalPnl, setTotalPnl] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Haal doel op uit settings API
    fetch("/api/me/settings")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.goal) setGoal(data.goal); })
      .catch(() => {});

    async function loadPaperData() {
      try {
        // Haal alle assets op en sommeer de balansen
        const results = await Promise.all(
          SCAN_ASSETS.map(a =>
            fetch(`/api/me/paper?asset=${encodeURIComponent(a.symbol)}`)
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          )
        );

        let totalCash = 0;
        let pnl = 0;
        let capital = 10000;
        let openPositionValue = 0;

        // Haal live prijzen op voor assets met open posities
        const priceCache: Record<string, number> = {};
        for (const [i, data] of results.entries()) {
          if (!data) continue;
          if (data.position?.openBtc && data.position.openBtc > 0) {
            const sym = SCAN_ASSETS[i]?.symbol;
            if (sym && !priceCache[sym]) {
              try {
                const pr = await fetch(`/api/price?symbol=${encodeURIComponent(sym)}`);
                if (pr.ok) {
                  const pd = await pr.json();
                  if (pd.price > 0) priceCache[sym] = pd.price;
                }
              } catch { /* ignore */ }
            }
          }
        }

        for (const [i, data] of results.entries()) {
          if (!data) continue;
          const startBal = data.startingBalance ?? 10000;
          capital = Math.max(capital, startBal);
          totalCash += data.cash ?? 0;
          if (data.position?.openBtc && data.position.openBtc > 0) {
            const sym = SCAN_ASSETS[i]?.symbol;
            const livePrice = sym ? (priceCache[sym] ?? 0) : 0;
            if (livePrice > 0) openPositionValue += data.position.openBtc * livePrice;
          }
          const history: { pnl?: number; side?: string }[] = data.history ?? [];
          for (const t of history) {
            if (t.side === "sell" && typeof t.pnl === "number") pnl += t.pnl;
          }
        }

        // Gebruik het eerste asset (BTCUSDT) als referentie voor startkapitaal
        const btcData = results[0];
        if (btcData) {
          capital = btcData.startingBalance ?? 10000;
          setStartCapital(capital);
          // Totaal saldo = cash van alle assets + waarde open posities
          setTotalBalance(totalCash + openPositionValue);
        }

        setTotalPnl(pnl);
      } catch { /* ignore */ }
      setLoading(false);
    }

    loadPaperData();
  }, []);

  function saveGoal() {
    const val = parseFloat(inputVal);
    if (!isNaN(val) && val > 0) {
      setGoal(val);
      fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: val }),
      }).catch(() => {});
    }
    setEditGoal(false);
  }

  const progress = goal > 0 && goal > startCapital
    ? Math.min(100, Math.max(0, ((totalBalance - startCapital) / (goal - startCapital)) * 100))
    : 0;
  const needed = goal > totalBalance ? goal - totalBalance : 0;
  const isComplete = goal > 0 && totalBalance >= goal;

  if (loading) {
    return (
      <section className="terminal-side-card goal-tracker">
        <div className="terminal-label">Mijn doel</div>
        <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 8 }}>Laden…</div>
      </section>
    );
  }

  return (
    <section className="terminal-side-card goal-tracker">
      <div className="terminal-label">🎯 Mijn doel</div>

      {!editGoal ? (
        <>
          {goal > 0 ? (
            <>
              <div className="goal-amounts">
                <div className="goal-current">
                  <div className="goal-amount-label">Huidig saldo (BTC)</div>
                  <div className={`goal-amount-value ${totalPnl >= 0 ? "pos" : "neg"}`}>
                    €{totalBalance.toFixed(0)}
                  </div>
                </div>
                <div className="goal-arrow">→</div>
                <div className="goal-target">
                  <div className="goal-amount-label">Doel</div>
                  <div className="goal-amount-value">€{goal.toFixed(0)}</div>
                </div>
              </div>

              <div className="goal-progress-wrap">
                <div className="goal-progress-bar">
                  <div
                    className={`goal-progress-fill ${isComplete ? "complete" : ""}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="goal-progress-pct">{Math.round(progress)}%</span>
              </div>

              {isComplete ? (
                <div className="goal-complete">🎉 Doel behaald! Zet een nieuw doel.</div>
              ) : (
                <div className="goal-needed">Nog €{needed.toFixed(0)} te gaan</div>
              )}

              <div className="goal-pnl">
                Totaal gerealiseerde winst/verlies:{" "}
                <span className={totalPnl >= 0 ? "pos" : "neg"}>
                  {totalPnl >= 0 ? "+" : ""}€{totalPnl.toFixed(2)}
                </span>
              </div>
            </>
          ) : (
            <div className="goal-empty">
              <p>Stel een doel in! Bijv: &ldquo;Ik wil mijn startkapitaal van €{startCapital.toLocaleString("nl-NL")} laten groeien naar €{(startCapital * 1.1).toFixed(0)}&rdquo;</p>
              <p style={{ fontSize: 12, opacity: 0.7 }}>10% groei is al een uitstekend resultaat.</p>
            </div>
          )}

          <button
            className="terminal-btn terminal-btn-muted goal-edit-btn"
            onClick={() => { setEditGoal(true); setInputVal(goal > 0 ? String(goal) : ""); }}
          >
            {goal > 0 ? "Doel aanpassen" : "Doel instellen"}
          </button>
        </>
      ) : (
        <div className="goal-edit-form">
          <label className="goal-edit-label">Doelbedrag in euro&apos;s</label>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
            Startkapitaal is €{startCapital.toLocaleString("nl-NL")}. Stel bijv. €{(startCapital * 1.1).toFixed(0)} in voor 10% groei.
          </div>
          <input
            className="terminal-terminal-input"
            type="number"
            placeholder={`bijv. ${(startCapital * 1.1).toFixed(0)}`}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveGoal()}
            autoFocus
          />
          <div className="goal-edit-actions">
            <button className="terminal-btn terminal-btn-primary" onClick={saveGoal}>Opslaan</button>
            <button className="terminal-btn terminal-btn-muted" onClick={() => setEditGoal(false)}>Annuleren</button>
          </div>
        </div>
      )}
    </section>
  );
}
