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
};

function getColorClass(status: string) {
    if (status === "Goed moment") return "green";
    if (status === "Nog even wachten") return "orange";
    return "red";
}

export default function SimpleModeChart({
    currentPrice,
    entryZoneLow,
    entryZoneHigh,
    stopLoss,
    resistanceZoneLow,
    resistanceZoneHigh,
    status,
    action,
}: Props) {
    const maxValue = Math.max(
        currentPrice,
        resistanceZoneHigh,
        entryZoneHigh
    );
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
        <div className="simple-mode-card">
            <div className="simple-mode-header">
                <div>
                    <div className="label">Simple mode</div>
                    <div className={`simple-mode-status ${getColorClass(status)}`}>
                        {status}
                    </div>
                </div>

                <div className="simple-mode-action-box">
                    <div className="label">Wat doe ik nu</div>
                    <div className="simple-mode-action">{action}</div>
                </div>
            </div>

            <div className="simple-mode-chart-wrap">
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

                    <div
                        className="simple-line stop-line"
                        style={{ top: `${stopTop}%` }}
                    >
                        <span>Stop-loss</span>
                        <strong>${Math.round(stopLoss).toLocaleString("en-US")}</strong>
                    </div>

                    <div
                        className="simple-line current-line"
                        style={{ top: `${currentTop}%` }}
                    >
                        <span>Prijs nu</span>
                        <strong>${Math.round(currentPrice).toLocaleString("en-US")}</strong>
                    </div>
                </div>
            </div>

            <div className="simple-mode-explainer">
                <div className="simple-explainer-box">
                    <strong>Groene zone</strong>
                    <span>Hier zoekt de app liever een koop.</span>
                </div>

                <div className="simple-explainer-box">
                    <strong>Rode lijn</strong>
                    <span>Hier wordt de trade ongeldig in deze versie.</span>
                </div>

                <div className="simple-explainer-box">
                    <strong>Grijze zone</strong>
                    <span>Hier kan de prijs moeilijker doorheen gaan.</span>
                </div>

                <div className="simple-explainer-box">
                    <strong>Witte lijn</strong>
                    <span>Dit is de live prijs van dit moment.</span>
                </div>
            </div>
        </div>
    );
}
