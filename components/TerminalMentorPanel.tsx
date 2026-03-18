"use client";

type Props = {
    status: string;
    action: string;
    currentPrice: number;
    entryZoneLow: number;
    entryZoneHigh: number;
    stopLoss: number;
    resistanceZoneLow: number;
    resistanceZoneHigh: number;
    score: number;
    setupGrade: string;
    riskRewardEstimate: number;
    trend4h: string;
    trend1h: string;
    rsi4h: number;
    blockers: string[];
    warnings: string[];
    lastTickLabel: string;
};

function fmt(value: number) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function TerminalMentorPanel({
    status,
    action,
    currentPrice,
    entryZoneLow,
    entryZoneHigh,
    stopLoss,
    resistanceZoneLow,
    resistanceZoneHigh,
    score,
    setupGrade,
    riskRewardEstimate,
    trend4h,
    trend1h,
    rsi4h,
    blockers,
    warnings,
    lastTickLabel,
}: Props) {
    const inBuyZone =
        currentPrice >= entryZoneLow && currentPrice <= entryZoneHigh;
    const aboveBuyZone = currentPrice > entryZoneHigh;

    let title = "";
    let mainLine = "";
    let shortList: string[] = [];

    if (blockers.length > 0) {
        title = blockers.length === 1 ? "Pas op" : "Meerdere risico's";
        const primary = blockers[0].toLowerCase();
        if (primary.includes("daily trend")) {
            mainLine = "Dagtrend is bearish — kopen gaat tegen de stroom in.";
        } else if (primary.includes("4h trend")) {
            mainLine = "4H trend is omlaag — wacht tot deze draait.";
        } else if (primary.includes("structure")) {
            mainLine = "Marktstructuur is verzwakt — hogere lows zijn gebroken.";
        } else if (primary.includes("rsi")) {
            mainLine = "RSI is overbought — kans op terugval is groter.";
        } else if (primary.includes("ruimte")) {
            mainLine = "Te dicht bij resistance — weinig winstpotentieel.";
        } else if (primary.includes("risk")) {
            mainLine = "Risk/reward is te laag — je riskeert meer dan je verdient.";
        } else {
            mainLine = blockers[0];
        }
        shortList = blockers.slice(0, 3);
    } else if (inBuyZone && status === "Goed moment") {
        title = "Koopzone bereikt";
        mainLine = "Prijs zit in de koopzone. Discipline > snelheid.";
        shortList = [
            "In koopzone.",
            `4H: ${trend4h}`,
            `RSI 4H: ${rsi4h}`,
        ];
    } else if (aboveBuyZone) {
        title = "Wacht — te hoog";
        mainLine = "Markt beweegt, maar je entry is nog niet mooi.";
        shortList = [
            "Boven koopzone.",
            `Resistance: ${fmt(resistanceZoneLow)} – ${fmt(resistanceZoneHigh)}`,
            `Stop-loss: ${fmt(stopLoss)}`,
        ];
    } else {
        title = "Kijk, niet klikken";
        mainLine = "Begrijp eerst waar je zit in de markt.";
        shortList = [
            `4H: ${trend4h}`,
            `1H: ${trend1h}`,
            `Koopzone: ${fmt(entryZoneLow)} – ${fmt(entryZoneHigh)}`,
        ];
    }

    const extra =
        warnings.length > 0
            ? warnings[0]
            : `Score ${score}/100 • Grade ${setupGrade} • Actie: ${action}`;

    return (
        <section className="terminal-side-card">
            <div className="terminal-label">Mentor</div>
            <div className="terminal-side-title">{title}</div>
            <div className="terminal-side-live">Live · {lastTickLabel}</div>

            <div className="terminal-side-mainline">{mainLine}</div>

            <div className="terminal-side-mini-grid">
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">Status</span>
                    <span className="terminal-mini-value">{status}</span>
                </div>
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">Actie</span>
                    <span className="terminal-mini-value">{action}</span>
                </div>
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">Score</span>
                    <span className="terminal-mini-value">{score}/100</span>
                </div>
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">Grade</span>
                    <span className="terminal-mini-value">{setupGrade}</span>
                </div>
            </div>

            <div className="terminal-side-reasons">
                {shortList.map((item) => (
                    <div key={item} className="terminal-side-reason">
                        {item}
                    </div>
                ))}
            </div>

            <div className="terminal-side-extra">{extra}</div>
        </section>
    );
}
