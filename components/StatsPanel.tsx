"use client";

import { useEffect, useMemo, useState } from "react";
import { SCAN_ASSETS } from "@/lib/assets";

type PaperTrade = {
    id: string;
    side: "buy" | "sell";
    pnl?: number;
    timestamp?: number;
    asset?: string;
};

const DAYS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

export default function StatsPanel() {
    const [trades, setTrades] = useState<PaperTrade[]>([]);

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
        () => trades.filter((t) => t.side === "sell" && typeof t.pnl === "number"),
        [trades]
    );

    const byDay = useMemo(() => {
        const map: Record<number, { pnl: number; count: number }> = {};
        for (const t of sells) {
            if (!t.timestamp) continue;
            const day = new Date(t.timestamp).getDay();
            if (!map[day]) map[day] = { pnl: 0, count: 0 };
            map[day].pnl += t.pnl || 0;
            map[day].count++;
        }
        return map;
    }, [sells]);

    const byAsset = useMemo(() => {
        const map: Record<string, { pnl: number; count: number; wins: number }> = {};
        for (const t of sells) {
            const key = (t.asset || "?").replace("USDT", "");
            if (!map[key]) map[key] = { pnl: 0, count: 0, wins: 0 };
            map[key].pnl += t.pnl || 0;
            map[key].count++;
            if ((t.pnl || 0) > 0) map[key].wins++;
        }
        return map;
    }, [sells]);

    const hasDayData = sells.some((t) => t.timestamp);
    const hasAssetData = sells.some((t) => t.asset);

    if (sells.length === 0) {
        return (
            <section className="terminal-side-card">
                <div className="terminal-label">Dagboek statistieken</div>
                <div className="terminal-stats-empty">
                    Sluit je eerste trade — dan zie je hier welke dag en welk asset het beste voor jou werkt.
                </div>
            </section>
        );
    }

    return (
        <section className="terminal-side-card">
            <div className="terminal-label">Dagboek statistieken</div>

            {hasDayData && (
                <>
                    <div className="terminal-stats-subtitle">P/L per weekdag</div>
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
                    <div className="terminal-stats-subtitle" style={{ marginTop: 12 }}>Per asset</div>
                    <div className="terminal-stats-assets">
                        {Object.entries(byAsset).map(([assetName, data]) => {
                            const winrate = data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0;
                            const isPos = data.pnl >= 0;
                            return (
                                <div key={assetName} className="terminal-stats-asset-row">
                                    <span className="terminal-stats-asset-name">{assetName}</span>
                                    <span className="terminal-stats-asset-wr">{winrate}% winrate</span>
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
