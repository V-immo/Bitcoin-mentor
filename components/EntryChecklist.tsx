"use client";

type Props = {
    currentPrice: number;
    entryZoneLow: number;
    entryZoneHigh: number;
    rsi4h: number;
    trend4h: string;
    trend1d: string;
    blockers: string[];
    stopLoss: number;
    riskRewardEstimate: string | number;
};

type CheckStatus = "green" | "orange" | "red";

type Check = {
    label: string;
    status: CheckStatus;
    detail: string;
    why: string;
};

function icon(s: CheckStatus) {
    if (s === "green") return "✅";
    if (s === "orange") return "⚠️";
    return "❌";
}

function rrNumber(rr: unknown): number {
    const s = String(rr ?? "");
    const match = s.match(/1[:\s]?(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
}

export default function EntryChecklist({
    currentPrice,
    entryZoneLow,
    entryZoneHigh,
    rsi4h,
    trend4h,
    trend1d,
    blockers,
    stopLoss,
    riskRewardEstimate,
}: Props) {
    const inZone = currentPrice >= entryZoneLow && currentPrice <= entryZoneHigh;
    const aboveZone = currentPrice > entryZoneHigh;
    const rrVal = rrNumber(riskRewardEstimate);

    const checks: Check[] = [
        {
            label: "Trend dagelijks meegaand",
            status: trend1d === "bullish" ? "green" : trend1d === "neutral" ? "orange" : "red",
            detail: trend1d === "bullish" ? "Dagelijkse trend omhoog ✓" : trend1d === "neutral" ? "Zijwaarts — onduidelijk" : "Dagelijkse trend omlaag",
            why: "Pro's traden altijd mee met de grote trend. Tegen de stroom inzwemmen kost energie.",
        },
        {
            label: "4H trend ondersteunt entry",
            status: trend4h === "bullish" ? "green" : trend4h === "neutral" ? "orange" : "red",
            detail: trend4h === "bullish" ? "4H trend omhoog ✓" : trend4h === "neutral" ? "4H zijwaarts — timing lastig" : "4H trend omlaag — wacht",
            why: "De 4H chart bepaalt je instaptiming. Als die omlaag wijst, is te vroeg instappen een groot risico.",
        },
        {
            label: "Prijs in koopzone",
            status: inZone ? "green" : aboveZone ? "orange" : "red",
            detail: inZone
                ? `Prijs $${Math.round(currentPrice).toLocaleString("en-US")} zit in de zone ✓`
                : aboveZone
                    ? `Prijs te hoog — zone: $${Math.round(entryZoneLow).toLocaleString("en-US")}–$${Math.round(entryZoneHigh).toLocaleString("en-US")}`
                    : `Prijs onder zone — wacht op bevestiging`,
            why: "Waar je koopt bepaalt je winst evenveel als wat je koopt. Kopen buiten de zone = slechter R/R.",
        },
        {
            label: "RSI niet overbought",
            status: rsi4h < 65 ? "green" : rsi4h < 72 ? "orange" : "red",
            detail: rsi4h < 65
                ? `RSI 4H ${rsi4h.toFixed(1)} — prima ✓`
                : rsi4h < 72
                    ? `RSI 4H ${rsi4h.toFixed(1)} — licht verhit`
                    : `RSI 4H ${rsi4h.toFixed(1)} — overbought, risico`,
            why: "RSI boven 70 betekent dat de prijs al ver gestegen is. Kopen op een piek vergroot de kans op een correctie.",
        },
        {
            label: "Geen blockers aanwezig",
            status: blockers.length === 0 ? "green" : blockers.length === 1 ? "orange" : "red",
            detail: blockers.length === 0
                ? "Geen blokkades gevonden ✓"
                : `${blockers.length} blocker${blockers.length > 1 ? "s" : ""}: ${blockers.slice(0, 2).join(", ")}`,
            why: "Blockers zijn concrete redenen om NIET te kopen. Eén blocker = wacht. Twee blockers = definitely niet.",
        },
        {
            label: "Risk/reward minimaal 1:1.5",
            status: rrVal >= 2 ? "green" : rrVal >= 1.5 ? "orange" : "red",
            detail: rrVal >= 1.5
                ? `R/R ${riskRewardEstimate} — acceptabel ✓`
                : `R/R ${riskRewardEstimate} — te laag, risico niet de moeite`,
            why: "Als je 1 riskeert moet je minstens 1.5 kunnen winnen. Anders is de kans op winstgevendheid structureel te laag.",
        },
    ];

    const greenCount = checks.filter((c) => c.status === "green").length;
    const overallStatus: CheckStatus =
        greenCount >= 5 ? "green" : greenCount >= 3 ? "orange" : "red";

    const overallLabel =
        overallStatus === "green"
            ? "Goede setup — kan instappen"
            : overallStatus === "orange"
                ? "Gemengde setup — wees voorzichtig"
                : "Slechte setup — beter wachten";

    return (
        <section className="terminal-side-card">
            <div className="terminal-label">Entry-checklist</div>

            {/* Score — altijd zichtbaar */}
            <div className={`terminal-checklist-score terminal-checklist-score-${overallStatus}`}>
                <span className="terminal-checklist-score-icon">{icon(overallStatus)}</span>
                <div>
                    <div className="terminal-checklist-score-label">{overallLabel}</div>
                    <div className="terminal-checklist-score-sub">{greenCount}/6 checks groen</div>
                </div>
            </div>

            {/* Details — inklapbaar */}
            <details className="terminal-checklist-details">
                <summary className="terminal-checklist-summary">Bekijk alle checks</summary>
                <div className="terminal-checklist-items">
                    {checks.map((check) => (
                        <div key={check.label} className={`terminal-checklist-item terminal-checklist-item-${check.status}`}>
                            <div className="terminal-checklist-item-top">
                                <span className="terminal-checklist-icon">{icon(check.status)}</span>
                                <div className="terminal-checklist-content">
                                    <div className="terminal-checklist-name">{check.label}</div>
                                    <div className="terminal-checklist-detail">{check.detail}</div>
                                </div>
                            </div>
                            <div className="terminal-checklist-why">💡 {check.why}</div>
                        </div>
                    ))}
                </div>
            </details>
        </section>
    );
}
