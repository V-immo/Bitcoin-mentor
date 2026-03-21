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
            ? "The major trend is your friend. When it's going up, the market works for you."
            : trend1d === "neutral"
                ? "In a sideways market timing is crucial — better to wait for a clear breakout."
                : "Buying against a falling trend is like swimming upstream. Wait for recovery or choose a different asset.",
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
            ? "The 4H confirms the daily trend. This is the right time to look for an entry."
            : trend4h === "neutral"
                ? "You could enter too early if the 4H has no direction yet. Wait for a green 4H signal."
                : "If the 4H is falling while you're buying, you're immediately at a loss. Wait until the 4H turns.",
        priority: trend4h !== "bullish" ? 2 : 5,
    });

    // 3. Price vs buy zone
    checks.push({
        label: t("checklist_price_zone_label"),
        status: inZone ? "green" : aboveZone ? "orange" : "red",
        detail: inZone
            ? `$${currentPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })} in zone $${Math.round(entryZoneLow).toLocaleString("en-US")}–$${Math.round(entryZoneHigh).toLocaleString("en-US")} ✓`
            : aboveZone
                ? `${pct(currentPrice, entryZoneHigh).toFixed(1)}% above zone — too expensive`
                : `${toZonePct.toFixed(1)}% below zone — wait for price to rise to $${Math.round(entryZoneLow).toLocaleString("en-US")}`,
        why: inZone
            ? "You're buying at support — that's exactly the spot where the chance of price rising is highest."
            : aboveZone
                ? "You're buying too expensive now. Your stop-loss is too far away and your R/R becomes poor. Wait for a pullback."
                : "The price hasn't reached the buy zone yet. Patience — wait until that zone is reached for a better position.",
        priority: !inZone ? 1 : 6,
    });

    // 4. RSI — dynamic threshold based on value
    const rsiStatus: CheckStatus = rsi4h < 60 ? "green" : rsi4h < 72 ? "orange" : "red";
    checks.push({
        label: t("checklist_rsi_label"),
        status: rsiStatus,
        detail: rsi4h < 60
            ? `RSI ${rsi4h.toFixed(1)} — room to rise ✓`
            : rsi4h < 72
                ? `RSI ${rsi4h.toFixed(1)} — slightly overheated, reduce position`
                : `RSI ${rsi4h.toFixed(1)} — overbought, wait for cooldown`,
        why: rsi4h < 60
            ? `RSI ${rsi4h.toFixed(1)} indicates there's still enough buying power. No signs of exhaustion.`
            : rsi4h < 72
                ? `RSI ${rsi4h.toFixed(1)} is slightly overheated. Buying is possible, but build a smaller position for less risk.`
                : `RSI ${rsi4h.toFixed(1)} means buyers are almost exhausted. A correction is likely — wait.`,
        priority: rsi4h >= 72 ? 2 : rsi4h >= 60 ? 4 : 7,
    });

    // 5. Stop-loss quality — only if available
    if (stopLoss > 0 && stopPct > 0) {
        const stopStatus: CheckStatus = stopPct <= 5 ? "green" : stopPct <= 10 ? "orange" : "red";
        checks.push({
            label: t("checklist_stop_label"),
            status: stopStatus,
            detail: stopPct <= 5
                ? `Stop at $${Math.round(stopLoss).toLocaleString("en-US")} — ${stopPct.toFixed(1)}% risk ✓`
                : stopPct <= 10
                    ? `Stop at $${Math.round(stopLoss).toLocaleString("en-US")} — ${stopPct.toFixed(1)}% risk, a bit wide`
                    : `Stop at $${Math.round(stopLoss).toLocaleString("en-US")} — ${stopPct.toFixed(1)}% risk, too far`,
            why: stopPct <= 5
                ? `With ${stopPct.toFixed(1)}% risk you keep your loss limited if things go wrong.`
                : stopPct <= 10
                    ? `${stopPct.toFixed(1)}% to your stop is acceptable but adjust your position size — trade smaller.`
                    : `With ${stopPct.toFixed(1)}% risk to your stop you lose too much if the trade goes against you. Find a better entry or don't trade this.`,
            priority: stopPct > 10 ? 2 : stopPct > 5 ? 5 : 7,
        });
    }

    // 6. Risk/reward
    const rrStatus: CheckStatus = rrVal >= 2 ? "green" : rrVal >= 1.5 ? "orange" : "red";
    checks.push({
        label: t("checklist_rr_label"),
        status: rrStatus,
        detail: rrVal >= 2
            ? `R/R 1:${rrVal.toFixed(1)} — excellent ✓`
            : rrVal >= 1.5
                ? `R/R 1:${rrVal.toFixed(1)} — acceptable`
                : rrVal > 0
                    ? `R/R 1:${rrVal.toFixed(1)} — too low`
                    : `R/R unknown`,
        why: rrVal >= 2
            ? `You can earn ${rrVal.toFixed(1)}x your risk. Even losing 40% of your trades you stay profitable.`
            : rrVal >= 1.5
                ? `Minimum acceptable. You need to win more than 40% of your trades to stay profitable.`
                : `With an R/R below 1.5 you need to win more than 60% of your trades to break even. Structurally losing.`,
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
            ? "No technical red flags. The system sees no direct reason NOT to enter."
            : blockers.length === 1
                ? `"${blockers[0]}" is a warning. You can enter but be extra alert.`
                : `Multiple blockers at the same time means: don't do it. Wait until they're resolved.`,
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
