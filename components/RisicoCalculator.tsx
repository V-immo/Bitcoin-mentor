"use client";

import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
    currentPrice: number;
    stopLoss: number;
};

function eur(value: number) {
    return value.toLocaleString("nl-BE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
    });
}

export default function RisicoCalculator({ currentPrice, stopLoss }: Props) {
    const { t } = useLanguage();
    const [accountSize, setAccountSize] = useState("10000");
    const [riskPct, setRiskPct] = useState("1");
    const [customStop, setCustomStop] = useState(String(Math.round(stopLoss)));

    // Update customStop when stopLoss prop changes (new signal loaded)
    useEffect(() => {
        setCustomStop(String(Math.round(stopLoss)));
    }, [stopLoss]);

    const result = useMemo(() => {
        const account = parseFloat(accountSize);
        const risk = parseFloat(riskPct);
        const stop = parseFloat(customStop);

        if (!Number.isFinite(account) || account <= 0) return null;
        if (!Number.isFinite(risk) || risk <= 0 || risk > 100) return null;
        if (!Number.isFinite(stop) || stop <= 0) return null;
        if (stop >= currentPrice) return null;

        const riskAmount = account * (risk / 100);
        const stopDistance = currentPrice - stop;
        const stopDistancePct = (stopDistance / currentPrice) * 100;
        const positionSize = riskAmount / (stopDistance / currentPrice);
        const maxUnits = positionSize / currentPrice;
        const rrTarget = currentPrice + stopDistance * 2; // 1:2 R/R

        return { riskAmount, stopDistancePct, positionSize, maxUnits, rrTarget };
    }, [accountSize, riskPct, customStop, currentPrice]);

    return (
        <section className="terminal-side-card">
            <div className="terminal-label">{t("calc_label")}</div>

            {/* Compact input on 1 row */}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 10 }}>
                <div style={{ flex: "1 1 90px", minWidth: 80 }}>
                    <div className="terminal-mini-label" style={{ marginBottom: 3 }}>{t("calc_capital")}</div>
                    <input className="terminal-terminal-input" style={{ width: "100%" }}
                        value={accountSize} onChange={(e) => setAccountSize(e.target.value)}
                        inputMode="decimal" placeholder="10000" />
                </div>
                <div style={{ flex: "0 0 auto" }}>
                    <div className="terminal-mini-label" style={{ marginBottom: 3 }}>{t("calc_risk_pct")}</div>
                    <div style={{ display: "flex", gap: 4 }}>
                        {["0.5","1","2"].map(v => (
                            <button key={v}
                                className={`terminal-chip-small${riskPct === v ? " active" : ""}`}
                                onClick={() => setRiskPct(v)}
                                style={{ padding: "4px 10px" }}
                            >{v}%</button>
                        ))}
                    </div>
                </div>
                <div style={{ flex: "1 1 90px", minWidth: 80 }}>
                    <div className="terminal-mini-label" style={{ marginBottom: 3 }}>{t("calc_stop")}</div>
                    <input className="terminal-terminal-input" style={{ width: "100%" }}
                        value={customStop} onChange={(e) => setCustomStop(e.target.value)}
                        inputMode="decimal" placeholder={String(Math.round(stopLoss))} />
                </div>
            </div>

            {/* Result on 1 row */}
            {result ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8, alignItems: "center" }}>
                    <div>
                        <div className="terminal-mini-label">{t("calc_max_position")}</div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--primary)" }}>{eur(result.positionSize)}</div>
                    </div>
                    <div className="terminal-mini-box">
                        <span className="terminal-mini-label">{t("calc_risk")}</span>
                        <span className="terminal-mini-value terminal-mini-value-red">{eur(result.riskAmount)}</span>
                    </div>
                    <div className="terminal-mini-box">
                        <span className="terminal-mini-label">{t("calc_stop_pct")}</span>
                        <span className="terminal-mini-value">{result.stopDistancePct.toFixed(1)}%</span>
                    </div>
                    <div className="terminal-mini-box">
                        <span className="terminal-mini-label">{t("calc_target")}</span>
                        <span className="terminal-mini-value">${Math.round(result.rrTarget).toLocaleString("en-US")}</span>
                    </div>
                </div>
            ) : (
                <div className="terminal-chat-empty" style={{ marginTop: 8, fontSize: 12 }}>
                    {t("calc_fill_hint")}
                </div>
            )}
        </section>
    );
}
