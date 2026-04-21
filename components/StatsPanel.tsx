"use client";

import { useEffect, useMemo, useState } from "react";
import { SCAN_ASSETS } from "@/lib/assets";
import { useLanguage } from "@/contexts/LanguageContext";
import EquityCurve from "@/components/EquityCurve";
import { Brain } from "lucide-react";

type PaperTrade = {
    id: string;
    side: "buy" | "sell";
    pnl?: number;
    timestamp?: number;
    asset?: string;
    emotion?: number;
};

const EMOTION_DATA = [
    { value: 1, labelKey: "stats_emo_1" as const },
    { value: 2, labelKey: "stats_emo_2" as const },
    { value: 3, labelKey: "stats_emo_3" as const },
    { value: 4, labelKey: "stats_emo_4" as const },
    { value: 5, labelKey: "stats_emo_5" as const },
];

export default function StatsPanel() {
    const { t, lang } = useLanguage();
    const [trades, setTrades] = useState<PaperTrade[]>([]);
    const [startingBalance, setStartingBalance] = useState(10000);

    const DAYS = [
        t("stats_days_zo"),
        t("stats_days_ma"),
        t("stats_days_di"),
        t("stats_days_wo"),
        t("stats_days_do"),
        t("stats_days_vr"),
        t("stats_days_za"),
    ];

    useEffect(() => {
        async function loadTrades() {
            try {
                const results = await Promise.all(
                    SCAN_ASSETS.map(a =>
                        fetch(`/api/me/paper?asset=${encodeURIComponent(a.symbol)}`)
                            .then(r => r.ok ? r.json() : null)
                            .catch(() => null)
                    )
                );
                const allTrades: PaperTrade[] = [];
                let startBal = 10000;
                for (const data of results) {
                    if (!data) continue;
                    const history: PaperTrade[] = data.history ?? [];
                    allTrades.push(...history);
                    if (data.startingBalance) startBal = data.startingBalance;
                }
                setTrades(allTrades);
                setStartingBalance(startBal);
            } catch { /* ignore */ }
        }
        loadTrades();
    }, []);

    const sells = useMemo(
        () => trades.filter((trade) => trade.side === "sell" && typeof trade.pnl === "number"),
        [trades]
    );

    const byDay = useMemo(() => {
        const map: Record<number, { pnl: number; count: number }> = {};
        for (const trade of sells) {
            if (!trade.timestamp) continue;
            const day = new Date(trade.timestamp).getDay();
            if (!map[day]) map[day] = { pnl: 0, count: 0 };
            map[day].pnl += trade.pnl || 0;
            map[day].count++;
        }
        return map;
    }, [sells]);

    const byAsset = useMemo(() => {
        const map: Record<string, { pnl: number; count: number; wins: number }> = {};
        for (const trade of sells) {
            const key = (trade.asset || "?").replace("USDT", "");
            if (!map[key]) map[key] = { pnl: 0, count: 0, wins: 0 };
            map[key].pnl += trade.pnl || 0;
            map[key].count++;
            if ((trade.pnl || 0) > 0) map[key].wins++;
        }
        return map;
    }, [sells]);

    const byEmotion = useMemo(() => {
        const map: Record<number, { pnl: number; count: number; wins: number }> = {};
        for (const trade of sells) {
            if (!trade.emotion) continue;
            if (!map[trade.emotion]) map[trade.emotion] = { pnl: 0, count: 0, wins: 0 };
            map[trade.emotion].pnl += trade.pnl || 0;
            map[trade.emotion].count++;
            if ((trade.pnl || 0) > 0) map[trade.emotion].wins++;
        }
        return map;
    }, [sells]);

    // Marcus-inzicht: welke emotie levert de beste resultaten?
    const psychInsight = useMemo(() => {
        const entries = Object.entries(byEmotion)
            .filter(([, d]) => d.count >= 2)
            .map(([emo, d]) => ({ emo: Number(emo), avg: d.pnl / d.count, wr: Math.round((d.wins / d.count) * 100) }));
        if (entries.length < 2) return null;
        const best  = entries.reduce((a, b) => a.avg > b.avg ? a : b);
        const worst = entries.reduce((a, b) => a.avg < b.avg ? a : b);
        if (best.emo === worst.emo) return null;
        return { best, worst };
    }, [byEmotion]);

    const equityPoints = useMemo(() => {
        const timed = sells.filter(t => t.timestamp).sort((a, b) => a.timestamp! - b.timestamp!);
        if (timed.length < 2) return [];
        let equity = startingBalance;
        return timed.map(t => {
            equity += t.pnl ?? 0;
            return { time: t.timestamp!, value: equity };
        });
    }, [sells, startingBalance]);

    const hasDayData = sells.some((trade) => trade.timestamp);
    const hasAssetData = sells.some((trade) => trade.asset);
    const hasEmotionData = Object.keys(byEmotion).length > 0;

    if (sells.length === 0) {
        return (
            <section className="card">
                <div className="terminal-label">{t("stats_panel_title")}</div>
                <div className="terminal-stats-empty">
                    {t("stats_panel_empty")}
                </div>
            </section>
        );
    }

    return (
        <section className="card">
            <div className="terminal-label">{t("stats_panel_title")}</div>

            {equityPoints.length >= 2 && (
                <div style={{ marginTop: 10, marginBottom: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <span className="terminal-stats-subtitle" style={{ margin: 0 }}>Equity curve</span>
                        <span style={{
                            fontSize: 13, fontWeight: 700,
                            color: equityPoints[equityPoints.length - 1].value >= startingBalance ? "var(--green)" : "var(--red)",
                        }}>
                            {equityPoints[equityPoints.length - 1].value >= startingBalance ? "+" : ""}
                            €{(equityPoints[equityPoints.length - 1].value - startingBalance).toFixed(0)}
                        </span>
                    </div>
                    <EquityCurve points={equityPoints} startingBalance={startingBalance} height={110} />
                </div>
            )}

            {hasDayData && (
                <>
                    <div className="terminal-stats-subtitle">{t("stats_panel_by_day")}</div>
                    <div className="terminal-stats-days">
                        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                            const data = byDay[d];
                            if (!data) return <span key={d} />;
                            const isPos = data.pnl >= 0;
                            const maxAbs = Math.max(...Object.values(byDay).map(x => Math.abs(x.pnl)), 1);
                            return (
                                <div key={d} className="terminal-stats-day-row">
                                    <span className="terminal-stats-day-name">{DAYS[d]}</span>
                                    <div className="terminal-stats-day-bar-wrap">
                                        <div
                                            className="terminal-stats-day-bar"
                                            style={{
                                                width: `${Math.round((Math.abs(data.pnl) / maxAbs) * 100)}%`,
                                                background: isPos ? "var(--green)" : "var(--red)",
                                            }}
                                        />
                                    </div>
                                    <span className="terminal-stats-day-val" style={{ color: isPos ? "var(--green)" : "var(--red)" }}>
                                        {isPos ? "+" : ""}€{data.pnl.toFixed(0)}
                                    </span>
                                    <span className="terminal-stats-day-count">{data.count}×</span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {hasAssetData && Object.keys(byAsset).length >= 1 && (
                <>
                    <div className="terminal-stats-subtitle" style={{ marginTop: 12 }}>{t("stats_panel_by_asset")}</div>
                    <div className="terminal-stats-assets">
                        {Object.entries(byAsset).map(([assetName, data]) => {
                            const winrate = data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0;
                            const isPos = data.pnl >= 0;
                            return (
                                <div key={assetName} className="terminal-stats-asset-row">
                                    <span className="terminal-stats-asset-name">{assetName}</span>
                                    <span className="terminal-stats-asset-wr">{winrate}% {t("stats_panel_winrate")}</span>
                                    <span className="terminal-stats-asset-pnl" style={{ color: isPos ? "var(--green)" : "var(--red)" }}>
                                        {isPos ? "+" : ""}€{data.pnl.toFixed(0)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
            {hasEmotionData && (
                <>
                    <div className="terminal-stats-subtitle" style={{ marginTop: 14 }}>{t("stats_panel_psychology")}</div>

                    {psychInsight && (() => {
                        const bestEmo = EMOTION_DATA.find(e => e.value === psychInsight.best.emo);
                        const worstEmo = EMOTION_DATA.find(e => e.value === psychInsight.worst.emo);
                        return (
                            <div style={{
                                background: "rgba(233,30,99,0.07)", border: "1px solid rgba(233,30,99,0.2)",
                                borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 12, color: "var(--text)", lineHeight: 1.6,
                            }}>
                                <Brain size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />{lang === "en"
                                    ? <>Best: <strong>{bestEmo ? t(bestEmo.labelKey) : ""}</strong> (avg +€{Math.abs(psychInsight.best.avg).toFixed(0)}, {psychInsight.best.wr}% wr) — Worst: <strong>{worstEmo ? t(worstEmo.labelKey) : ""}</strong> (avg −€{Math.abs(psychInsight.worst.avg).toFixed(0)})</>
                                    : <>Best: <strong>{bestEmo ? t(bestEmo.labelKey) : ""}</strong> (gem. +€{Math.abs(psychInsight.best.avg).toFixed(0)}, {psychInsight.best.wr}% wr) — Slechtst: <strong>{worstEmo ? t(worstEmo.labelKey) : ""}</strong> (gem. −€{Math.abs(psychInsight.worst.avg).toFixed(0)})</>
                                }
                            </div>
                        );
                    })()}

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {EMOTION_DATA
                            .filter(e => byEmotion[e.value])
                            .map(e => {
                                const d = byEmotion[e.value];
                                const avg = d.pnl / d.count;
                                const wr = Math.round((d.wins / d.count) * 100);
                                const isPos = avg >= 0;
                                const maxAbs = Math.max(...Object.values(byEmotion).map(x => Math.abs(x.pnl / x.count)), 1);
                                const barW = Math.round((Math.abs(avg) / maxAbs) * 100);
                                return (
                                    <div key={e.value} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                                        <span style={{ fontSize: 11, flexShrink: 0, color: "var(--text-secondary)", fontWeight: 700 }}>{e.value}</span>
                                        <span style={{ width: 68, color: "var(--text-secondary)", flexShrink: 0 }}>{t(e.labelKey)}</span>
                                        <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 3, height: 6, overflow: "hidden" }}>
                                            <div style={{ width: `${barW}%`, height: "100%", background: isPos ? "var(--green)" : "var(--red)", borderRadius: 3 }} />
                                        </div>
                                        <span style={{ width: 52, textAlign: "right", fontWeight: 700, color: isPos ? "var(--green)" : "var(--red)", flexShrink: 0 }}>
                                            {isPos ? "+" : ""}€{avg.toFixed(0)}
                                        </span>
                                        <span style={{ width: 32, textAlign: "right", color: "var(--text-secondary)", fontSize: 11, flexShrink: 0 }}>
                                            {wr}%
                                        </span>
                                        <span style={{ color: "var(--text-secondary)", fontSize: 11, flexShrink: 0 }}>
                                            {d.count}×
                                        </span>
                                    </div>
                                );
                            })
                        }
                    </div>
                </>
            )}
        </section>
    );
}
