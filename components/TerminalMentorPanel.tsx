"use client";

import { useLanguage } from "@/contexts/LanguageContext";

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
    const { t } = useLanguage();

    const inBuyZone =
        currentPrice >= entryZoneLow && currentPrice <= entryZoneHigh;
    const aboveBuyZone = currentPrice > entryZoneHigh;

    let title = "";
    let mainLine = "";
    let shortList: string[] = [];

    if (blockers.length > 0) {
        title = blockers.length === 1 ? t("mentor_blockers_single") : t("mentor_blockers_multi");
        const primary = blockers[0].toLowerCase();
        if (primary.includes("daily trend")) {
            mainLine = t("mentor_blocker_daily_trend");
        } else if (primary.includes("4h trend")) {
            mainLine = t("mentor_blocker_4h_trend");
        } else if (primary.includes("structure")) {
            mainLine = t("mentor_blocker_structure");
        } else if (primary.includes("rsi")) {
            mainLine = t("mentor_blocker_rsi");
        } else if (primary.includes("ruimte")) {
            mainLine = t("mentor_blocker_ruimte");
        } else if (primary.includes("risk")) {
            mainLine = t("mentor_blocker_risk");
        } else {
            mainLine = blockers[0];
        }
        shortList = blockers.slice(0, 3);
    } else if (inBuyZone && status === "Goed moment") {
        title = t("mentor_in_zone_title");
        mainLine = t("mentor_in_zone_main");
        shortList = [
            t("mentor_in_zone_item"),
            `4H: ${trend4h}`,
            `RSI 4H: ${rsi4h}`,
        ];
    } else if (aboveBuyZone) {
        title = t("mentor_above_zone_title");
        mainLine = t("mentor_above_zone_main");
        shortList = [
            t("mentor_above_zone_item"),
            `Resistance: ${fmt(resistanceZoneLow)} – ${fmt(resistanceZoneHigh)}`,
            `Stop-loss: ${fmt(stopLoss)}`,
        ];
    } else {
        title = t("mentor_watch_title");
        mainLine = t("mentor_watch_main");
        shortList = [
            `4H: ${trend4h}`,
            `1H: ${trend1h}`,
            `${t("mentor_in_zone_item").replace("In koopzone.", "").replace("In buy zone.", "").trim()} ${fmt(entryZoneLow)} – ${fmt(entryZoneHigh)}`,
        ];
    }

    const extra =
        warnings.length > 0
            ? warnings[0]
            : `${t("mentor_extra_prefix")} ${score}/100 • ${t("mentor_extra_grade")} ${setupGrade} • ${t("mentor_extra_action")} ${action}`;

    return (
        <section className="terminal-side-card">
            <div className="terminal-label">{t("mentor_label")}</div>
            <div className="terminal-side-title">{title}</div>
            <div className="terminal-side-live">{t("mentor_live")} · {lastTickLabel}</div>

            <div className="terminal-side-mainline">{mainLine}</div>

            <div className="terminal-side-mini-grid">
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">{t("mentor_status_label")}</span>
                    <span className="terminal-mini-value">{status}</span>
                </div>
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">{t("mentor_action_label")}</span>
                    <span className="terminal-mini-value">{action}</span>
                </div>
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">{t("mentor_score_label")}</span>
                    <span className="terminal-mini-value">{score}/100</span>
                </div>
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">{t("mentor_grade_label")}</span>
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
