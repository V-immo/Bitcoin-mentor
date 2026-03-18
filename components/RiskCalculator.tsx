"use client";

import { useMemo, useState } from "react";

type Props = {
  stopLoss: number;
  entryEstimate: number;
};

export default function RiskCalculator({ stopLoss, entryEstimate }: Props) {
  const [accountSize, setAccountSize] = useState<string>("500");
  const [riskPercent, setRiskPercent] = useState<string>("1");

  const result = useMemo(() => {
    const account = Number(accountSize);
    const risk = Number(riskPercent);

    if (!account || !risk || !entryEstimate || !stopLoss) {
      return null;
    }

    const maxLoss = account * (risk / 100);
    const lossPerUnit = Math.max(entryEstimate - stopLoss, 1);
    const btcAmount = maxLoss / lossPerUnit;
    const positionValue = btcAmount * entryEstimate;

    return {
      maxLoss,
      positionValue,
    };
  }, [accountSize, riskPercent, entryEstimate, stopLoss]);

  return (
    <div className="card">
      <div className="label">Risk calculator</div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        <input
          className="input"
          type="number"
          placeholder="Account grootte"
          value={accountSize}
          onChange={(e) => setAccountSize(e.target.value)}
        />

        <input
          className="input"
          type="number"
          placeholder="Risico %"
          value={riskPercent}
          onChange={(e) => setRiskPercent(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
        <div className="small-text muted">
          Hou het klein. Begin met 1% risico.
        </div>

        <div className="small-text">
          <strong>Entry:</strong>{" "}
          {Math.round(entryEstimate).toLocaleString("en-US")}
        </div>

        <div className="small-text">
          <strong>Stop-loss:</strong>{" "}
          {Math.round(stopLoss).toLocaleString("en-US")}
        </div>

        <div className="small-text">
          <strong>Max verlies:</strong>{" "}
          {result ? `$${result.maxLoss.toFixed(2)}` : "-"}
        </div>

        <div className="small-text">
          <strong>Max positie:</strong>{" "}
          {result ? `$${result.positionValue.toFixed(2)}` : "-"}
        </div>

        <div className="small-text muted">
          Deze berekening gaat uit van een eenvoudige long setup zonder fees,
          slippage of leverage.
        </div>
      </div>
    </div>
  );
}
