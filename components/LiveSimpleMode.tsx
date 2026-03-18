"use client";

type Props = {
  currentPrice: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  resistanceZoneLow: number;
  resistanceZoneHigh: number;
  status: string;
  action: string;
  livePriceConnected: boolean;
  liveCandleConnected: boolean;
  lastTickLabel: string;
  tickKey: number;
};

function getColorClass(status: string) {
  if (status === "Goed moment") return "green";
  if (status === "Nog even wachten") return "orange";
  return "red";
}

export default function LiveSimpleMode({
  currentPrice,
  entryZoneLow,
  entryZoneHigh,
  stopLoss,
  resistanceZoneLow,
  resistanceZoneHigh,
  status,
  action,
  livePriceConnected,
  liveCandleConnected,
  lastTickLabel,
  tickKey,
}: Props) {
  const maxValue = Math.max(currentPrice, resistanceZoneHigh, entryZoneHigh);
  const minValue = Math.min(
    currentPrice,
    stopLoss,
    entryZoneLow,
    resistanceZoneLow
  );
  const range = Math.max(maxValue - minValue, 1);

  function getPosition(value: number) {
    const pct = ((maxValue - value) / range) * 100;
    return Math.min(100, Math.max(0, pct));
  }

  const currentTop = getPosition(currentPrice);
  const entryTop = getPosition(entryZoneHigh);
  const entryBottom = getPosition(entryZoneLow);
  const stopTop = getPosition(stopLoss);
  const resistanceTop = getPosition(resistanceZoneHigh);
  const resistanceBottom = getPosition(resistanceZoneLow);

  return (
    <section className="warm-hero-shell">
      <div className="warm-hero-left card">
        <div className="label">Bitcoin nu</div>
        <div className="big-live-price" key={tickKey}>
          ${currentPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </div>

        <div className="warm-status-badge-row">
          <div className={`warm-status-badge ${getColorClass(status)}`}>
            {status}
          </div>
          <div className="warm-action-chip">{action}</div>
        </div>

        <div className="live-status-row">
          <div className="live-pill">
            <span
              className={`live-dot ${livePriceConnected ? "live-on" : "live-off"}`}
            />
            Live prijs {livePriceConnected ? "verbonden" : "offline"}
          </div>

          <div className="live-pill">
            <span
              className={`live-dot ${liveCandleConnected ? "live-on" : "live-off"}`}
            />
            Live candles {liveCandleConnected ? "verbonden" : "offline"}
          </div>

          <div className="live-pill">Laatste tick: {lastTickLabel || "-"}</div>
        </div>
      </div>

      <div className="warm-hero-right card">
        <div className="label">Veilig leren</div>
        <div className="warm-safety-title">
          Je hoeft nu niets te forceren
        </div>

        <div className="warm-safety-list">
          <div className="warm-safety-item">
            Je gebruikt nu nepgeld om te leren zonder risico.
          </div>
          <div className="warm-safety-item">
            De groene zone is waar de app liever een koop zoekt.
          </div>
          <div className="warm-safety-item">
            De rode lijn is waar de trade fout wordt in deze versie.
          </div>
          <div className="warm-safety-item">
            Goed traden begint niet met snel klikken, maar met begrijpen waar je bent.
          </div>
        </div>
      </div>

      <div className="warm-zone-board card">
        <div className="label">Lees dit eerst</div>
        <div className="warm-zone-board-text">
          De witte lijn is de prijs nu. De groene zone is waar ik liever koop.
          De rode lijn is waar de trade fout wordt. De grijze zone is waar het
          moeilijker wordt om omhoog te gaan.
        </div>

        <div className="simple-mode-chart-wrap" style={{ marginTop: 14 }}>
          <div className="simple-mode-axis">
            <div
              className="simple-zone resistance-zone"
              style={{
                top: `${resistanceTop}%`,
                height: `${Math.max(10, resistanceBottom - resistanceTop)}%`,
              }}
            >
              <span>Moeilijk punt bovenaan</span>
              <strong>
                ${Math.round(resistanceZoneLow).toLocaleString("en-US")} - $
                {Math.round(resistanceZoneHigh).toLocaleString("en-US")}
              </strong>
            </div>

            <div
              className="simple-zone entry-zone"
              style={{
                top: `${entryTop}%`,
                height: `${Math.max(10, entryBottom - entryTop)}%`,
              }}
            >
              <span>Betere koopzone</span>
              <strong>
                ${Math.round(entryZoneLow).toLocaleString("en-US")} - $
                {Math.round(entryZoneHigh).toLocaleString("en-US")}
              </strong>
            </div>

            <div className="simple-line stop-line" style={{ top: `${stopTop}%` }}>
              <span>Stop-loss</span>
              <strong>${Math.round(stopLoss).toLocaleString("en-US")}</strong>
            </div>

            <div
              className="simple-line current-line"
              style={{ top: `${currentTop}%` }}
            >
              <span>NU</span>
              <strong>${Math.round(currentPrice).toLocaleString("en-US")}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
