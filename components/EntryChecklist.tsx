"use client";

import { useLanguage } from "@/contexts/LanguageContext";

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
    priority: number; // lager = meer zichtbaar
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

function pct(a: number, b: number) {
    if (!b) return 0;
    return Math.abs(((a - b) / b) * 100);
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
    const { t } = useLanguage();

    const inZone = currentPrice >= entryZoneLow && currentPrice <= entryZoneHigh;
    const aboveZone = currentPrice > entryZoneHigh;
    const belowZone = currentPrice < entryZoneLow;
    const rrVal = rrNumber(riskRewardEstimate);
    const stopPct = stopLoss > 0 ? pct(currentPrice, stopLoss) : 0;
    const toZonePct = belowZone ? pct(entryZoneLow, currentPrice) : 0;

    // ── Dynamic checks ──────────────────────────────────────────────────

    const checks: Check[] = [];

    // 1. Daily trend — most decisive
    checks.push({
        label: t("checklist_trend_daily_label"),
        status: trend1d === "bullish" ? "green" : trend1d === "neutral" ? "orange" : "red",
        detail: trend1d === "bullish"
            ? t("checklist_trend_daily_up")
            : trend1d === "neutral"
                ? t("checklist_trend_daily_side")
                : t("checklist_trend_daily_down"),
        why: trend1d === "bullish"
            ? "De grote trend is je vriend. Als hij omhoog gaat, werkt de markt voor jou."
            : trend1d === "neutral"
                ? "In een zijwaartse markt is timing cruciaal — beter wachten op een duidelijke uitbraak."
                : "Kopen tegen een dalende trend is als zwemmen tegen de stroom in. Wacht op herstel of kies een ander asset.",
        priority: trend1d !== "bullish" ? 1 : 4,
    });

    // 2. 4H trend — timing
    checks.push({
        label: t("checklist_trend_4h_label"),
        status: trend4h === "bullish" ? "green" : trend4h === "neutral" ? "orange" : "red",
        detail: trend4h === "bullish"
            ? t("checklist_trend_4h_up")
            : trend4h === "neutral"
                ? t("checklist_trend_4h_side")
                : t("checklist_trend_4h_down"),
        why: trend4h === "bullish"
            ? "De 4H bevestigt de dagtrend. Dit is het juiste moment om een instap te zoeken."
            : trend4h === "neutral"
                ? "Je kunt te vroeg instappen als de 4H nog geen richting heeft. Wacht op een groen 4H signaal."
                : "Als de 4H daalt terwijl jij koopt, sta je direct op verlies. Wacht tot de 4H omdraait.",
        priority: trend4h !== "bullish" ? 2 : 5,
    });

    // 3. Price vs buy zone
    checks.push({
        label: t("checklist_price_zone_label"),
        status: inZone ? "green" : aboveZone ? "orange" : "red",
        detail: inZone
            ? `$${currentPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })} in zone $${Math.round(entryZoneLow).toLocaleString("en-US")}–$${Math.round(entryZoneHigh).toLocaleString("en-US")} ✓`
            : aboveZone
                ? `${pct(currentPrice, entryZoneHigh).toFixed(1)}% boven zone — te duur`
                : `${toZonePct.toFixed(1)}% onder zone — wacht tot prijs stijgt naar $${Math.round(entryZoneLow).toLocaleString("en-US")}`,
        why: inZone
            ? "Je koopt op support — dat is precies het punt waar de kans het grootst is dat de prijs stijgt."
            : aboveZone
                ? "Je koopt nu te duur. Je stop-loss is te ver weg en je R/R wordt slecht. Wacht op een pullback."
                : "De prijs heeft de koopzone nog niet bereikt. Geduld — wacht tot die zone bereikt is voor een betere positie.",
        priority: !inZone ? 1 : 6,
    });

    // 4. RSI — dynamic threshold based on value
    const rsiStatus: CheckStatus = rsi4h < 60 ? "green" : rsi4h < 72 ? "orange" : "red";
    checks.push({
        label: t("checklist_rsi_label"),
        status: rsiStatus,
        detail: rsi4h < 60
            ? `RSI ${rsi4h.toFixed(1)} — ruimte om te stijgen ✓`
            : rsi4h < 72
                ? `RSI ${rsi4h.toFixed(1)} — licht overkocht, verklein positie`
                : `RSI ${rsi4h.toFixed(1)} — overbought, wacht op afkoeling`,
        why: rsi4h < 60
            ? `RSI ${rsi4h.toFixed(1)} geeft aan dat er nog genoeg koopkracht is. Geen tekenen van uitputting.`
            : rsi4h < 72
                ? `RSI ${rsi4h.toFixed(1)} is licht overkocht. Kopen kan, maar bouw een kleinere positie voor minder risico.`
                : `RSI ${rsi4h.toFixed(1)} betekent dat kopers bijna uitgeput zijn. Een correctie is waarschijnlijk — wacht.`,
        priority: rsi4h >= 72 ? 2 : rsi4h >= 60 ? 4 : 7,
    });

    // 5. Stop-loss quality — only if available
    if (stopLoss > 0 && stopPct > 0) {
        const stopStatus: CheckStatus = stopPct <= 5 ? "green" : stopPct <= 10 ? "orange" : "red";
        checks.push({
            label: t("checklist_stop_label"),
            status: stopStatus,
            detail: stopPct <= 5
                ? `Stop op $${Math.round(stopLoss).toLocaleString("en-US")} — ${stopPct.toFixed(1)}% risico ✓`
                : stopPct <= 10
                    ? `Stop op $${Math.round(stopLoss).toLocaleString("en-US")} — ${stopPct.toFixed(1)}% risico, iets ruim`
                    : `Stop op $${Math.round(stopLoss).toLocaleString("en-US")} — ${stopPct.toFixed(1)}% risico, te ver`,
            why: stopPct <= 5
                ? `Met ${stopPct.toFixed(1)}% risico begrens je je verlies als het fout gaat.`
                : stopPct <= 10
                    ? `${stopPct.toFixed(1)}% naar je stop is acceptabel maar pas je positiegrootte aan — handel kleiner.`
                    : `Met ${stopPct.toFixed(1)}% risico naar je stop verlies je te veel als de trade tegen je ingaat. Zoek een betere instap of sla deze trade over.`,
            priority: stopPct > 10 ? 2 : stopPct > 5 ? 5 : 7,
        });
    }

    // 6. Risk/reward
    const rrStatus: CheckStatus = rrVal >= 2 ? "green" : rrVal >= 1.5 ? "orange" : "red";
    checks.push({
        label: t("checklist_rr_label"),
        status: rrStatus,
        detail: rrVal >= 2
            ? `R/R 1:${rrVal.toFixed(1)} — uitstekend ✓`
            : rrVal >= 1.5
                ? `R/R 1:${rrVal.toFixed(1)} — acceptabel`
                : rrVal > 0
                    ? `R/R 1:${rrVal.toFixed(1)} — te laag`
                    : `R/R onbekend`,
        why: rrVal >= 2
            ? `Je kunt ${rrVal.toFixed(1)}x je risico verdienen. Zelfs met 40% verliezende trades blijf je winstgevend.`
            : rrVal >= 1.5
                ? `Minimum acceptabel. Je moet meer dan 40% van je trades winnen om winstgevend te blijven.`
                : `Met een R/R onder 1.5 moet je meer dan 60% van je trades winnen om quitte te spelen. Structureel verliezend.`,
        priority: rrVal < 1.5 ? 3 : rrVal < 2 ? 5 : 8,
    });

    // 7. Blockers
    const blockerStatus: CheckStatus = blockers.length === 0 ? "green" : blockers.length <= 1 ? "orange" : "red";
    checks.push({
        label: t("checklist_blockers_label"),
        status: blockerStatus,
        detail: blockers.length === 0
            ? t("checklist_blockers_none")
            : `${blockers.length} blocker${blockers.length > 1 ? "s" : ""}: ${blockers.slice(0, 2).join(", ")}`,
        why: blockers.length === 0
            ? "Geen technische rode vlaggen. Het systeem ziet geen directe reden om NIET in te stappen."
            : blockers.length === 1
                ? `"${blockers[0]}" is een waarschuwing. Je kunt instappen maar wees extra alert.`
                : `Meerdere blockers tegelijk betekent: doe het niet. Wacht tot ze zijn opgelost.`,
        priority: blockers.length >= 2 ? 1 : blockers.length === 1 ? 4 : 8,
    });

    // Sort by priority (lower = shown first)
    const sorted = [...checks].sort((a, b) => a.priority - b.priority);
    const greenCount = checks.filter((c) => c.status === "green").length;
    const redCount = checks.filter((c) => c.status === "red").length;

    const overallStatus: CheckStatus =
        redCount >= 2 ? "red" :
        greenCount >= checks.length - 1 ? "green" : "orange";

    const overallLabel =
        overallStatus === "green"
            ? t("checklist_overall_good")
            : overallStatus === "orange"
                ? t("checklist_overall_mixed")
                : t("checklist_overall_bad");

    return (
        <section className="terminal-side-card">
            <div className="terminal-label">{t("checklist_label")}</div>

            <div className={`terminal-checklist-score terminal-checklist-score-${overallStatus}`}>
                <span className="terminal-checklist-score-icon">{icon(overallStatus)}</span>
                <div>
                    <div className="terminal-checklist-score-label">{overallLabel}</div>
                    <div className="terminal-checklist-score-sub">{greenCount}/{checks.length} {t("checklist_green_count")}</div>
                </div>
            </div>

            <details className="terminal-checklist-details">
                <summary className="terminal-checklist-summary">{t("checklist_view_all")}</summary>
                <div className="terminal-checklist-items">
                    {sorted.map((check) => (
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
