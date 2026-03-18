"use client";

import { useMemo, useState } from "react";

type Props = {
  buyZoneLow: number;
  buyZoneHigh: number;
  stopLoss: number;
  trend: string;
  sentiment: string;
};

export default function TradeCheck({
  buyZoneLow,
  buyZoneHigh,
  stopLoss,
  trend,
  sentiment,
}: Props) {
  const [entry, setEntry] = useState<string>("");

  const result = useMemo(() => {
    const entryValue = Number(entry);

    if (!entryValue) {
      return null;
    }

    const inZone = entryValue >= buyZoneLow && entryValue <= buyZoneHigh;
    const nearZone =
      entryValue > buyZoneHigh && entryValue <= buyZoneHigh * 1.01;
    const belowStop = entryValue <= stopLoss;

    if (belowStop) {
      return {
        status: "Niet doen",
        color: "red",
        text: "Je entry zit te dicht op of onder de stop-loss.",
      };
    }

    if (trend === "Omlaag" || sentiment === "Negatief") {
      return {
        status: "Niet doen",
        color: "red",
        text: "Trend of sentiment is slecht. Laat deze trade staan.",
      };
    }

    if (inZone) {
      return {
        status: "Goed",
        color: "green",
        text: "Entry zit in de koopzone. Kleine positie mogelijk.",
      };
    }

    if (nearZone) {
      return {
        status: "Voorzichtig",
        color: "orange",
        text: "Entry zit net boven de koopzone. Beter wachten op dip.",
      };
    }

    return {
      status: "Niet doen",
      color: "red",
      text: "Entry zit niet op een mooie plek. Niet forceren.",
    };
  }, [entry, buyZoneLow, buyZoneHigh, stopLoss, trend, sentiment]);

  return (
    <div className="card">
      <div className="label">Trade check</div>

      <div style={{ marginTop: 14 }}>
        <input
          className="input"
          type="number"
          placeholder="Ik wil kopen op..."
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <div className={`value-sm ${result?.color ?? ""}`}>
          {result ? result.status : "Vul een entry in"}
        </div>

        <div className="small-text muted" style={{ marginTop: 8 }}>
          {result
            ? result.text
            : "Deze check kijkt in v2.1 alleen naar long entries."}
        </div>
      </div>
    </div>
  );
}
