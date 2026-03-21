"use client";

import { useEffect, useMemo, useState } from "react";
import { SCAN_ASSETS } from "@/lib/assets";
import { useLanguage } from "@/contexts/LanguageContext";

type PaperTrade = {
    id: string;
    side: "buy" | "sell";
    pnl?: number;
    timestamp?: number;
    asset?: string;
};

export default function StatsPanel() {
    const { t } = useLanguage();
    const [trades, setTrades] = useState<PaperTrade[]>([]);

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
                for (const data of results) {
                    if (!data) continue;
                    const history: PaperTrade[] = data.history ?? [];
                    allTrades.push(...history);
                }
                setTrades(allTrades);
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

    const hasDayData = sells.some((trade) => trade.timestamp);
    const hasAssetData = sells.some((trade) => trade.asset);

    if (sells.length === 0) {
        return (
            <section className="terminal-side-card">
                <div className="terminal-label">{t("stats_panel_title")}</div>
                <div className="terminal-stats-empty">
                    {t("stats_panel_empty")}
                </div>
            </section>
        );
    }

    return (
        <section className="terminal-side-card">
            <div className="terminal-label">{t("stats_panel_title")}</div>

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
                                                background: isPos ? "#26c57c" : "#ef4444",
                                            }}
                                        />
                                    </div>
                                    <span className="terminal-stats-day-val" style={{ color: isPos ? "#26c57c" : "#ef4444" }}>
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
                                    <span className="terminal-stats-asset-pnl" style={{ color: isPos ? "#26c57c" : "#ef4444" }}>
                                        {isPos ? "+" : ""}€{data.pnl.toFixed(0)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </section>
    );
}
