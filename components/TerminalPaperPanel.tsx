"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type PaperTrade = {
    id: string;
    side: "buy" | "sell";
    amountEur: number;
    price: number;
    btcAmount: number;
    time: string;
    timestamp?: number;
    asset?: string;
    pnl?: number;
    note?: string;
    orderType?: "market" | "limit";
};

type PaperState = {
    startCapital: number;
    cash: number;
    openBtc: number;
    avgEntry: number;
    realizedPnl: number;
    trades: PaperTrade[];
};

type ApiPosition = {
    openBtc: number;
    avgEntry: number;
    realizedPnl: number;
} | null;

type Props = {
    currentPrice: number;
    status: string;
    action: string;
    entryZoneText: string;
    entryZoneLow: number;
    entryZoneHigh: number;
    stopLoss: number;
    resistanceZoneLow: number;
    resistanceZoneHigh: number;
    riskRewardEstimate: string | number;
    asset: string;
    autoExecuteAmount?: number | null;
};

type OrderType = "market" | "limit";

function eur(value: number) {
    return value.toLocaleString("nl-BE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
    });
}

function nowLabel() {
    return new Date().toLocaleTimeString("nl-BE");
}

function stateToApiPayload(state: PaperState) {
    const position: ApiPosition = state.openBtc > 0
        ? { openBtc: state.openBtc, avgEntry: state.avgEntry, realizedPnl: state.realizedPnl }
        : null;
    return {
        startingBalance: state.startCapital,
        cash: state.cash,
        position,
        history: state.trades,
    };
}

function apiResponseToState(data: {
    startingBalance: number;
    cash: number;
    position: ApiPosition;
    history: PaperTrade[];
}): PaperState {
    const pos = data.position as ApiPosition;
    return {
        startCapital: data.startingBalance,
        cash: data.cash,
        openBtc: pos?.openBtc ?? 0,
        avgEntry: pos?.avgEntry ?? 0,
        realizedPnl: pos?.realizedPnl ?? 0,
        trades: data.history ?? [],
    };
}

export default function TerminalPaperPanel({
    currentPrice,
    entryZoneLow,
    entryZoneHigh,
    stopLoss,
    resistanceZoneLow,
    resistanceZoneHigh,
    riskRewardEstimate,
    asset,
    autoExecuteAmount,
}: Props) {
    const { t } = useLanguage();
    const [loaded, setLoaded] = useState(false);
    const [buyAmount, setBuyAmount] = useState("1000");
    const [orderType, setOrderType] = useState<OrderType>("market");
    const [limitPrice, setLimitPrice] = useState("");
    const [pendingLimitOrder, setPendingLimitOrder] = useState<{ amount: number; price: number } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmAction, setConfirmAction] = useState<"buy" | "sell" | null>(null);
    const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);
    const [noteInput, setNoteInput] = useState("");
    const [zoneWarning, setZoneWarning] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [goal, setGoal] = useState<number | null>(null);
    const [goalInput, setGoalInput] = useState("");
    const [showGoalInput, setShowGoalInput] = useState(false);
    const [state, setState] = useState<PaperState>({
        startCapital: 10000,
        cash: 10000,
        openBtc: 0,
        avgEntry: 0,
        realizedPnl: 0,
        trades: [],
    });
    const [confirmReset, setConfirmReset] = useState(false);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const saveToApi = useCallback(
        (s: PaperState) => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                fetch(`/api/me/paper?asset=${asset}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(stateToApiPayload(s)),
                }).catch(() => {});
            }, 300);
        },
        [asset]
    );

    useEffect(() => {
        setLoaded(false);
        fetch(`/api/me/paper?asset=${asset}`)
            .then((res) => res.json())
            .then((data) => {
                if (typeof data.startingBalance === "number" && typeof data.cash === "number") {
                    const s = apiResponseToState(data);
                    setState(s);
                    setBuyAmount(String(Math.round(s.startCapital / 10)));
                }
            })
            .catch(() => {})
            .finally(() => setLoaded(true));
    }, [asset]);

    useEffect(() => {
        if (!loaded) return;
        saveToApi(state);
    }, [state, loaded, saveToApi]);

    useEffect(() => {
        if (!autoExecuteAmount || autoExecuteAmount <= 0 || !loaded) return;
        const amount = autoExecuteAmount;
        setState((prev) => {
            if (amount > prev.cash) return prev;
            const btcAmt = amount / currentPrice;
            const totalCostAfter = prev.openBtc * prev.avgEntry + amount;
            const totalBtcAfter = prev.openBtc + btcAmt;
            const newAvg = totalBtcAfter > 0 ? totalCostAfter / totalBtcAfter : 0;
            return {
                ...prev,
                cash: prev.cash - amount,
                openBtc: prev.openBtc + btcAmt,
                avgEntry: newAvg,
                trades: [{
                    id: crypto.randomUUID(), side: "buy",
                    amountEur: amount, price: currentPrice,
                    btcAmount: btcAmt, time: nowLabel(),
                    timestamp: Date.now(), asset, orderType: "market",
                }, ...prev.trades],
            };
        });
        setBuyAmount(String(amount));
        setZoneWarning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoExecuteAmount]);

    // Controleer of pending limit order uitgevoerd moet worden
    useEffect(() => {
        if (!pendingLimitOrder || currentPrice <= 0) return;
        if (currentPrice <= pendingLimitOrder.price) {
            executeBuy(pendingLimitOrder.amount, pendingLimitOrder.price, "limit");
            setPendingLimitOrder(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPrice, pendingLimitOrder]);

    const openValue = state.openBtc * currentPrice;
    const unrealized = state.openBtc > 0 ? (currentPrice - state.avgEntry) * state.openBtc : 0;
    const totalBalance = state.cash + openValue;
    const totalPnl = totalBalance - state.startCapital;
    const totalPnlPct = state.startCapital > 0 ? (totalPnl / state.startCapital) * 100 : 0;
    const breakEvenPrice = state.openBtc > 0 ? state.avgEntry : null;

    const winCount = state.trades.filter(trade => trade.side === "sell" && (trade.pnl || 0) > 0).length;
    const lossCount = state.trades.filter(trade => trade.side === "sell" && (trade.pnl || 0) <= 0).length;
    const closedCount = winCount + lossCount;
    const winrate = closedCount > 0 ? (winCount / closedCount) * 100 : 0;

    const { avgWin, avgLoss, currentStreak, streakType } = useMemo(() => {
        const sells = state.trades.filter(trade => trade.side === "sell" && typeof trade.pnl === "number");
        const wins = sells.filter(trade => (trade.pnl || 0) > 0);
        const losses = sells.filter(trade => (trade.pnl || 0) <= 0);
        const avgWin = wins.length > 0 ? wins.reduce((s, trade) => s + (trade.pnl || 0), 0) / wins.length : 0;
        const avgLoss = losses.length > 0 ? losses.reduce((s, trade) => s + (trade.pnl || 0), 0) / losses.length : 0;
        let currentStreak = 0;
        let streakType: "win" | "loss" | null = null;
        for (const trade of sells) {
            const isWin = (trade.pnl || 0) > 0;
            if (streakType === null) { streakType = isWin ? "win" : "loss"; currentStreak = 1; }
            else if ((streakType === "win") === isWin) currentStreak++;
            else break;
        }
        return { avgWin, avgLoss, currentStreak, streakType };
    }, [state.trades]);

    const bestTrade = useMemo(() => {
        const sells = state.trades.filter(trade => trade.side === "sell" && typeof trade.pnl === "number");
        return sells.length === 0 ? null : sells.reduce((a, b) => ((a.pnl || 0) > (b.pnl || 0) ? a : b));
    }, [state.trades]);

    const worstTrade = useMemo(() => {
        const sells = state.trades.filter(trade => trade.side === "sell" && typeof trade.pnl === "number");
        return sells.length === 0 ? null : sells.reduce((a, b) => ((a.pnl || 0) < (b.pnl || 0) ? a : b));
    }, [state.trades]);

    function resetAccount() {
        const capital = state.startCapital;
        setState({ startCapital: capital, cash: capital, openBtc: 0, avgEntry: 0, realizedPnl: 0, trades: [] });
        setBuyAmount(String(Math.round(capital / 10)));
        setPendingLimitOrder(null);
        setConfirmReset(false);
    }

    function executeBuy(amount: number, execPrice: number, type: OrderType = "market") {
        const btcAmount = amount / execPrice;
        const totalCostBefore = state.openBtc * state.avgEntry;
        const totalCostAfter = totalCostBefore + amount;
        const totalBtcAfter = state.openBtc + btcAmount;
        const newAvg = totalBtcAfter > 0 ? totalCostAfter / totalBtcAfter : 0;
        setState((prev) => ({
            ...prev,
            cash: prev.cash - amount,
            openBtc: prev.openBtc + btcAmount,
            avgEntry: newAvg,
            trades: [{
                id: crypto.randomUUID(), side: "buy",
                amountEur: amount, price: execPrice,
                btcAmount, time: nowLabel(),
                timestamp: Date.now(), asset, orderType: type,
            }, ...prev.trades],
        }));
    }

    function requestBuy(force = false) {
        const amount = Number(buyAmount);
        if (!Number.isFinite(amount) || amount <= 0 || amount > state.cash || currentPrice <= 0) return;

        if (orderType === "limit") {
            const lp = Number(limitPrice);
            if (!Number.isFinite(lp) || lp <= 0) return;
            if (currentPrice <= lp) {
                // Prijs al op of onder limiet → direct uitvoeren
                setConfirmAction("buy");
                setShowConfirm(true);
            } else {
                // Sla op als pending limit order
                setPendingLimitOrder({ amount, price: lp });
            }
            return;
        }

        const inZone = entryZoneHigh > 0 && currentPrice >= entryZoneLow && currentPrice <= entryZoneHigh;
        if (!inZone && !force) { setZoneWarning(true); return; }
        setZoneWarning(false);
        setConfirmAction("buy");
        setShowConfirm(true);
    }

    function confirmOrder() {
        setShowConfirm(false);
        const amount = Number(buyAmount);
        if (confirmAction === "buy") {
            const execPrice = orderType === "limit" ? Number(limitPrice) : currentPrice;
            executeBuy(amount, execPrice, orderType);
            setZoneWarning(false);
        } else if (confirmAction === "sell") {
            executeClose();
        }
        setConfirmAction(null);
    }

    function executeClose() {
        if (state.openBtc <= 0 || currentPrice <= 0) return;
        const valueNow = state.openBtc * currentPrice;
        const pnl = (currentPrice - state.avgEntry) * state.openBtc;
        const newId = crypto.randomUUID();
        setState((prev) => ({
            ...prev,
            cash: prev.cash + valueNow,
            openBtc: 0,
            avgEntry: 0,
            realizedPnl: prev.realizedPnl + pnl,
            trades: [{
                id: newId, side: "sell",
                amountEur: valueNow, price: currentPrice,
                btcAmount: prev.openBtc, pnl,
                time: nowLabel(), timestamp: Date.now(), asset,
            }, ...prev.trades],
        }));
        setPendingNoteId(newId);
        setNoteInput("");
    }

    function requestSell() {
        if (state.openBtc <= 0 || currentPrice <= 0) return;
        setConfirmAction("sell");
        setShowConfirm(true);
    }

    function saveNote() {
        if (!pendingNoteId || !noteInput.trim()) { setPendingNoteId(null); return; }
        setState((prev) => ({
            ...prev,
            trades: prev.trades.map(trade => trade.id === pendingNoteId ? { ...trade, note: noteInput.trim() } : trade),
        }));
        setPendingNoteId(null);
        setNoteInput("");
    }

    // Quick amounts
    const quickAmounts = [
        Math.round(state.startCapital * 0.05),
        Math.round(state.startCapital * 0.10),
        Math.round(state.startCapital * 0.25),
        Math.round(state.cash),
    ];
    const quickLabels = ["5%", "10%", "25%", "Max"];

    if (!loaded) {
        return (
            <section className="terminal-side-card">
                <div className="terminal-label">{t("paper_label")}</div>
                <div className="terminal-side-title">{t("paper_loading_label")}</div>
            </section>
        );
    }

    const goalPct = goal && state.startCapital > 0
        ? Math.min(100, ((totalBalance - state.startCapital) / (goal - state.startCapital)) * 100)
        : null;

    const confirmExecPrice = orderType === "limit" ? Number(limitPrice) : currentPrice;
    const confirmBtcAmt = Number(buyAmount) > 0 && confirmExecPrice > 0
        ? (Number(buyAmount) / confirmExecPrice)
        : 0;

    return (
        <section className="terminal-side-card">

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                    <div className="terminal-label">{t("paper_label")}</div>
                    <div className="terminal-side-title" style={{ marginTop: 2 }}>{t("paper_subtitle")}</div>
                </div>
                <button
                    className="terminal-btn terminal-btn-muted"
                    onClick={() => setShowHelp(v => !v)}
                    style={{ fontSize: 11, padding: "3px 10px" }}
                >
                    {showHelp ? t("paper_help_toggle_hide") : t("paper_help_toggle_show")}
                </button>
            </div>

            {/* Uitleg */}
            {showHelp && (
                <div className="paper-help-box">
                    <div className="paper-help-title">{t("paper_help_title")}</div>
                    <p>{t("paper_help_intro")} <strong>{t("paper_help_fake_money")}</strong> {t("paper_help_intro2")}</p>
                    <ul>
                        <li><strong>{t("paper_help_capital")}</strong> — {t("paper_help_capital_desc")}</li>
                        <li><strong>{t("paper_help_buy")}</strong> — {t("paper_help_buy_desc")}</li>
                        <li><strong>{t("paper_help_sell")}</strong> — {t("paper_help_sell_desc")}</li>
                        <li><strong>{t("paper_help_zone")}</strong> — {t("paper_help_zone_desc")}</li>
                        <li><strong>{t("paper_help_pl")}</strong> — {t("paper_help_pl_desc")}</li>
                    </ul>
                    <div className="paper-help-title" style={{ marginTop: 10 }}>{t("paper_help_goal_title")}</div>
                    <p>{t("paper_help_goal_text")} <em>{t("paper_help_goal_quote")}</em>. {t("paper_help_goal_desc")}</p>
                    <p style={{ marginTop: 4, color: "var(--text-secondary)", fontSize: 12 }}>{t("paper_help_goal_tip")}</p>
                </div>
            )}

            {/* Balans samenvatting */}
            <div className="terminal-paper-stats">
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">{t("paper_stat_cash")}</span>
                    <span className="terminal-mini-value">{eur(state.cash)}</span>
                </div>
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">{t("paper_stat_position")}</span>
                    <span className="terminal-mini-value">{state.openBtc > 0 ? eur(openValue) : "—"}</span>
                </div>
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">{t("paper_stat_unrealized")}</span>
                    <span className="terminal-mini-value" style={{ color: unrealized >= 0 ? "#26c57c" : "#ef4444" }}>
                        {state.openBtc > 0 ? eur(unrealized) : "—"}
                    </span>
                </div>
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">{t("paper_stat_total")}</span>
                    <span className="terminal-mini-value" style={{ color: totalPnl >= 0 ? "#26c57c" : "#ef4444" }}>
                        {eur(totalBalance)}
                        <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.7 }}>
                            ({totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(1)}%)
                        </span>
                    </span>
                </div>
            </div>

            {/* Open positie info + break-even */}
            {state.openBtc > 0 && (
                <div className="paper-position-strip">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{t("paper_position_open")} ${Math.round(state.avgEntry).toLocaleString("en-US")}</span>
                        <span style={{ color: unrealized >= 0 ? "#26c57c" : "#ef4444" }}>
                            {unrealized >= 0 ? "▲" : "▼"} {eur(unrealized)}
                        </span>
                    </div>
                    {breakEvenPrice && (
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
                            {t("paper_break_even_hint")} <strong>${Math.round(breakEvenPrice).toLocaleString("en-US")}</strong>
                            {stopLoss > 0 && (
                                <span style={{ marginLeft: 8, color: "#ef4444" }}>
                                    · SL: ${Math.round(stopLoss).toLocaleString("en-US")}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Pending limit order melding */}
            {pendingLimitOrder && (
                <div className="terminal-zone-warning" style={{ marginBottom: 8, borderColor: "#f59e0b55" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12 }}>
                            {t("paper_limit_pending")} ${Math.round(pendingLimitOrder.price).toLocaleString("en-US")}
                            <span style={{ color: "var(--text-secondary)", marginLeft: 6 }}>({eur(pendingLimitOrder.amount)})</span>
                        </span>
                        <button
                            onClick={() => setPendingLimitOrder(null)}
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}
                        >
                            {t("paper_limit_cancel")} ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Doel tracker */}
            {goal !== null ? (
                <div className="paper-goal-strip">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("paper_goal_label")} {eur(goal)}</span>
                        <button onClick={() => { setGoal(null); setGoalInput(""); }} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 11 }}>✕</button>
                    </div>
                    <div className="paper-goal-bar">
                        <div className="paper-goal-fill" style={{ width: `${Math.max(0, goalPct ?? 0)}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
                        {goalPct !== null && goalPct >= 100
                            ? t("paper_goal_achieved")
                            : `${Math.max(0, goalPct ?? 0).toFixed(0)}${t("paper_goal_pct_suffix")}`}
                    </div>
                </div>
            ) : showGoalInput ? (
                <div className="paper-goal-strip">
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                        {t("paper_goal_set_hint")} €{(state.startCapital * 1.1).toFixed(0)} {t("paper_goal_growth")}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                        <input
                            className="terminal-terminal-input"
                            type="number"
                            placeholder={`${Math.round(state.startCapital * 1.1)}`}
                            value={goalInput}
                            onChange={e => setGoalInput(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button
                            className="terminal-btn terminal-btn-primary"
                            onClick={() => {
                                const g = Number(goalInput);
                                if (g > state.startCapital) { setGoal(g); setShowGoalInput(false); }
                            }}
                        >OK</button>
                        <button className="terminal-btn terminal-btn-muted" onClick={() => setShowGoalInput(false)}>✕</button>
                    </div>
                </div>
            ) : (
                <button
                    className="terminal-btn terminal-btn-muted"
                    style={{ fontSize: 12, width: "100%", marginBottom: 8 }}
                    onClick={() => setShowGoalInput(true)}
                >
                    {t("paper_goal_set_btn")}
                </button>
            )}

            {/* Trade plan */}
            <div className="paper-tradeplan">
                <div className="paper-tradeplan-title">{t("paper_tradeplan_title")}</div>
                <div className="paper-tradeplan-grid">
                    <div className="paper-tradeplan-row">
                        <span className="paper-tradeplan-label">{t("paper_tradeplan_entry")}</span>
                        <span className="paper-tradeplan-value" style={{ color: "#26c57c" }}>
                            ${Math.round(entryZoneLow).toLocaleString("en-US")} – ${Math.round(entryZoneHigh).toLocaleString("en-US")}
                        </span>
                    </div>
                    {resistanceZoneLow > 0 && (
                        <div className="paper-tradeplan-row">
                            <span className="paper-tradeplan-label">{t("paper_tradeplan_profit")}</span>
                            <span className="paper-tradeplan-value" style={{ color: "#f59e0b" }}>
                                ${Math.round(resistanceZoneLow).toLocaleString("en-US")} – ${Math.round(resistanceZoneHigh).toLocaleString("en-US")}
                            </span>
                        </div>
                    )}
                    {stopLoss > 0 && (
                        <div className="paper-tradeplan-row">
                            <span className="paper-tradeplan-label">{t("paper_tradeplan_stop")}</span>
                            <span className="paper-tradeplan-value" style={{ color: "#ef4444" }}>
                                ${Math.round(stopLoss).toLocaleString("en-US")}
                                <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 6 }}>
                                    ({currentPrice > 0 ? ((currentPrice - stopLoss) / currentPrice * 100).toFixed(1) : "—"}{t("paper_tradeplan_stop_below")}
                                </span>
                            </span>
                        </div>
                    )}
                    <div className="paper-tradeplan-row">
                        <span className="paper-tradeplan-label">{t("paper_tradeplan_rr")}</span>
                        <span className="paper-tradeplan-value">{riskRewardEstimate}</span>
                    </div>
                    {Number(buyAmount) > 0 && stopLoss > 0 && currentPrice > 0 && (
                        <div className="paper-tradeplan-row">
                            <span className="paper-tradeplan-label">{t("paper_tradeplan_maxloss")}</span>
                            <span className="paper-tradeplan-value" style={{ color: "#ef4444" }}>
                                {eur(Number(buyAmount) * (currentPrice - stopLoss) / currentPrice)}
                            </span>
                        </div>
                    )}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
                    {t("paper_tradeplan_hint_prefix")} <strong>{t("paper_tradeplan_stoploss")}</strong> {t("paper_tradeplan_hint_middle")} <strong>{t("paper_tradeplan_takeprofit")}</strong> {t("paper_tradeplan_hint_suffix")}
                </div>
            </div>

            {/* Order type toggle */}
            <div style={{ marginBottom: 10 }}>
                <div className="terminal-mini-label" style={{ marginBottom: 6 }}>{t("paper_order_type_label")}</div>
                <div style={{ display: "flex", gap: 6 }}>
                    <button
                        className={`terminal-btn${orderType === "market" ? " terminal-btn-primary" : " terminal-btn-muted"}`}
                        style={{ flex: 1, fontSize: 12 }}
                        onClick={() => setOrderType("market")}
                    >
                        {t("paper_order_market")}
                    </button>
                    <button
                        className={`terminal-btn${orderType === "limit" ? " terminal-btn-primary" : " terminal-btn-muted"}`}
                        style={{ flex: 1, fontSize: 12 }}
                        onClick={() => setOrderType("limit")}
                    >
                        {t("paper_order_limit")}
                    </button>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                    {orderType === "market" ? t("paper_order_market_desc") : t("paper_order_limit_desc")}
                </div>
            </div>

            {/* Limietprijs input (alleen bij limit order) */}
            {orderType === "limit" && (
                <div style={{ marginBottom: 10 }}>
                    <label className="terminal-mini-label" style={{ display: "block", marginBottom: 4 }}>
                        {t("paper_limit_price_label")}
                    </label>
                    <input
                        className="terminal-terminal-input"
                        type="number"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        placeholder={t("paper_limit_price_placeholder")}
                    />
                    {Number(limitPrice) > 0 && currentPrice > 0 && Number(limitPrice) > currentPrice && (
                        <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4 }}>
                            {t("paper_limit_above_market")}
                        </div>
                    )}
                    {Number(limitPrice) > 0 && currentPrice > 0 && Number(limitPrice) <= currentPrice && (
                        <div style={{ fontSize: 11, color: "#26c57c", marginTop: 4 }}>
                            ✓ ${Math.round(Number(limitPrice)).toLocaleString("en-US")} ≤ ${Math.round(currentPrice).toLocaleString("en-US")} — direct uitvoerbaar
                        </div>
                    )}
                </div>
            )}

            {/* Koop sectie */}
            <div className="paper-buy-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label className="terminal-mini-label">{t("paper_buy_label")}</label>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        {t("paper_buy_available")} {eur(state.cash)}
                    </span>
                </div>

                {/* Quick amount knoppen */}
                <div className="paper-quick-amounts">
                    {quickAmounts.map((amt, i) => (
                        <button
                            key={i}
                            className={`paper-quick-btn${Number(buyAmount) === amt ? " active" : ""}`}
                            onClick={() => setBuyAmount(String(amt))}
                        >
                            {quickLabels[i]}<br />
                            <span style={{ fontSize: 11, opacity: 0.7 }}>{eur(amt)}</span>
                        </button>
                    ))}
                </div>

                <input
                    className="terminal-terminal-input"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder={t("paper_buy_placeholder")}
                    style={{ marginTop: 8 }}
                />
            </div>

            {/* Actie knoppen */}
            <div className="terminal-paper-actions" style={{ marginTop: 10 }}>
                {confirmReset ? (
                    <>
                        <span style={{ fontSize: 12, color: "#ef4444", alignSelf: "center" }}>{t("paper_confirm_reset")}</span>
                        <button className="terminal-btn terminal-btn-danger" onClick={resetAccount}>{t("paper_reset_confirm_btn")}</button>
                        <button className="terminal-btn terminal-btn-muted" onClick={() => setConfirmReset(false)}>{t("paper_reset_cancel")}</button>
                    </>
                ) : (
                    <>
                        <button
                            className="terminal-btn terminal-btn-primary"
                            onClick={() => requestBuy()}
                            style={{ flex: 2, fontSize: 14, fontWeight: 700 }}
                            disabled={
                                Number(buyAmount) > state.cash ||
                                Number(buyAmount) <= 0 ||
                                currentPrice <= 0 ||
                                (orderType === "limit" && (!Number(limitPrice) || Number(limitPrice) <= 0)) ||
                                !!pendingLimitOrder
                            }
                        >
                            {currentPrice <= 0 ? t("loading") : orderType === "limit" ? `${t("paper_order_limit")} →` : t("paper_btn_buy")}
                        </button>
                        <button
                            className="terminal-btn"
                            onClick={requestSell}
                            style={{ flex: 2, fontSize: 14, fontWeight: 700, borderColor: "#ef444455", color: state.openBtc > 0 ? "#ef4444" : undefined }}
                            disabled={state.openBtc <= 0 || currentPrice <= 0}
                        >
                            {t("paper_btn_sell")}
                        </button>
                        <button
                            className="terminal-btn terminal-btn-muted"
                            onClick={() => setConfirmReset(true)}
                            style={{ fontSize: 11 }}
                            title={t("paper_reset_confirm_btn")}
                        >
                            ↺
                        </button>
                    </>
                )}
            </div>

            {/* Uitleg knoppen */}
            <div className="paper-btn-hints">
                <span>{t("paper_btn_hints_buy")} <strong>{t("paper_btn_hints_buy_label")}</strong> {t("paper_btn_hints_buy_desc")}</span>
                <span>{t("paper_btn_hints_sell")} <strong>{t("paper_btn_hints_sell_label")}</strong> {t("paper_btn_hints_sell_desc")}</span>
            </div>

            {/* Zone waarschuwing */}
            {zoneWarning && (
                <div className="terminal-zone-warning" style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div className="terminal-zone-warning-title">{t("paper_zone_warning_title")}</div>
                        <button onClick={() => setZoneWarning(false)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
                    </div>
                    <div className="terminal-zone-warning-body">
                        {t("paper_zone_warning_body_prefix")} <strong>${Math.round(entryZoneLow).toLocaleString("en-US")}–${Math.round(entryZoneHigh).toLocaleString("en-US")}</strong>.
                        {" "}{t("paper_zone_warning_body_suffix")}
                    </div>
                    <button className="terminal-btn terminal-btn-danger" style={{ width: "100%", marginTop: 6 }} onClick={() => { setZoneWarning(false); requestBuy(true); }}>
                        {t("paper_zone_buy_anyway")}
                    </button>
                </div>
            )}

            {/* Bevestigingsdialoog */}
            {showConfirm && confirmAction && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
                }}>
                    <div style={{
                        background: "var(--bg-card, #1a1f2e)", border: "1px solid var(--border, #2a3040)",
                        borderRadius: 12, padding: 24, width: "min(380px, 90vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                    }}>
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                            {t("paper_confirm_title")}
                        </div>

                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <tbody>
                                <tr>
                                    <td style={{ color: "var(--text-secondary)", padding: "4px 0" }}>{t("paper_confirm_type")}</td>
                                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                                        {confirmAction === "buy"
                                            ? (orderType === "limit" ? "🔵 Limit BUY" : "🟢 Market BUY")
                                            : "🔴 Market SELL"}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ color: "var(--text-secondary)", padding: "4px 0" }}>{t("paper_confirm_asset")}</td>
                                    <td style={{ textAlign: "right", fontWeight: 600 }}>{asset}</td>
                                </tr>
                                {confirmAction === "buy" && (
                                    <>
                                        <tr>
                                            <td style={{ color: "var(--text-secondary)", padding: "4px 0" }}>{t("paper_confirm_amount")}</td>
                                            <td style={{ textAlign: "right", fontWeight: 600 }}>{eur(Number(buyAmount))}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ color: "var(--text-secondary)", padding: "4px 0" }}>{t("paper_confirm_price")}</td>
                                            <td style={{ textAlign: "right", fontWeight: 600 }}>
                                                ${Math.round(confirmExecPrice).toLocaleString("en-US")}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ color: "var(--text-secondary)", padding: "4px 0" }}>{t("paper_confirm_asset_amount")}</td>
                                            <td style={{ textAlign: "right", fontWeight: 600 }}>
                                                {confirmBtcAmt.toFixed(6)} {asset.replace("USDT", "")}
                                            </td>
                                        </tr>
                                    </>
                                )}
                                {confirmAction === "sell" && state.openBtc > 0 && (
                                    <>
                                        <tr>
                                            <td style={{ color: "var(--text-secondary)", padding: "4px 0" }}>{t("paper_confirm_asset_amount")}</td>
                                            <td style={{ textAlign: "right", fontWeight: 600 }}>
                                                {state.openBtc.toFixed(6)} {asset.replace("USDT", "")}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ color: "var(--text-secondary)", padding: "4px 0" }}>{t("paper_confirm_price")}</td>
                                            <td style={{ textAlign: "right", fontWeight: 600 }}>
                                                ${Math.round(currentPrice).toLocaleString("en-US")}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ color: "var(--text-secondary)", padding: "4px 0" }}>P/L</td>
                                            <td style={{ textAlign: "right", fontWeight: 700, color: unrealized >= 0 ? "#26c57c" : "#ef4444" }}>
                                                {unrealized >= 0 ? "+" : ""}{eur(unrealized)}
                                            </td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>

                        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                            <button
                                className="terminal-btn terminal-btn-muted"
                                style={{ flex: 1 }}
                                onClick={() => { setShowConfirm(false); setConfirmAction(null); }}
                            >
                                {t("paper_confirm_cancel")}
                            </button>
                            <button
                                className={`terminal-btn ${confirmAction === "sell" ? "terminal-btn-danger" : "terminal-btn-primary"}`}
                                style={{ flex: 2, fontWeight: 700 }}
                                onClick={confirmOrder}
                            >
                                {t("paper_confirm_execute")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dagboek prompt na verkoop */}
            {pendingNoteId && (
                <div className="terminal-journal-prompt">
                    <div className="terminal-mini-label" style={{ marginBottom: 6 }}>
                        {t("paper_journal_prompt")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                        {t("paper_journal_desc")}
                    </div>
                    <textarea
                        className="terminal-journal-textarea"
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder={t("paper_journal_placeholder")}
                        rows={3}
                        autoFocus
                    />
                    <div className="terminal-paper-actions" style={{ marginTop: 6 }}>
                        <button className="terminal-btn terminal-btn-muted" onClick={() => setPendingNoteId(null)}>{t("paper_journal_skip")}</button>
                        <button className="terminal-btn terminal-btn-primary" onClick={saveNote}>{t("paper_journal_save")}</button>
                    </div>
                </div>
            )}

            {/* Stats */}
            {closedCount > 0 && (
                <div className="terminal-progress-grid" style={{ marginTop: 12 }}>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">{t("paper_stats_winrate")}</span>
                        <span className="terminal-progress-value" style={{ color: winrate >= 50 ? "#26c57c" : "#ef4444" }}>
                            {winrate.toFixed(0)}%
                        </span>
                        <span className="terminal-progress-sub">{winCount}W / {lossCount}L</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">{t("paper_stats_total_pl")}</span>
                        <span className="terminal-progress-value" style={{ color: state.realizedPnl >= 0 ? "#26c57c" : "#ef4444" }}>
                            {eur(state.realizedPnl)}
                        </span>
                        <span className="terminal-progress-sub">{t("paper_stats_closed")}</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">{t("paper_stats_avg_win")}</span>
                        <span className="terminal-progress-value" style={{ color: "#26c57c" }}>
                            {avgWin > 0 ? eur(avgWin) : "—"}
                        </span>
                        <span className="terminal-progress-sub">{t("paper_stats_per_win")}</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">{t("paper_stats_avg_loss")}</span>
                        <span className="terminal-progress-value" style={{ color: "#ef4444" }}>
                            {avgLoss < 0 ? eur(avgLoss) : "—"}
                        </span>
                        <span className="terminal-progress-sub">{t("paper_stats_per_loss")}</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">{t("paper_stats_streak")}</span>
                        <span className="terminal-progress-value" style={{ color: streakType === "win" ? "#26c57c" : streakType === "loss" ? "#ef4444" : "#8b95ad" }}>
                            {currentStreak > 0 ? `${currentStreak}× ${streakType === "win" ? "🔥" : "❄️"}` : "—"}
                        </span>
                        <span className="terminal-progress-sub">{t("paper_stats_streak_sub")}</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">{t("paper_stats_best")}</span>
                        <span className="terminal-progress-value" style={{ color: "#26c57c" }}>
                            {bestTrade ? eur(bestTrade.pnl || 0) : "—"}
                        </span>
                        <span className="terminal-progress-sub">{t("paper_stats_worst_prefix")} {worstTrade ? eur(worstTrade.pnl || 0) : "—"}</span>
                    </div>
                </div>
            )}

            {/* Trade geschiedenis */}
            <details className="terminal-history">
                <summary>
                    {t("paper_history_title")}
                    {state.trades.length > 0 && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-secondary)" }}>({state.trades.length} {t("paper_history_trades_suffix")}</span>}
                </summary>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: "6px 0", marginBottom: 4 }}>
                    {t("paper_history_desc")}
                </div>
                <div className="terminal-history-list">
                    {state.trades.length === 0 && (
                        <div className="terminal-history-item" style={{ color: "var(--text-secondary)" }}>
                            {t("paper_history_empty")}
                        </div>
                    )}
                    {state.trades.map((trade) => (
                        <div key={trade.id} className="terminal-history-item">
                            <strong style={{ color: trade.side === "buy" ? "#26c57c" : "#ef4444" }}>
                                {trade.side === "buy" ? t("paper_history_buy") : t("paper_history_sell")}
                            </strong>
                            {trade.orderType === "limit" && (
                                <span style={{ fontSize: 10, color: "#8b95ad", marginLeft: 4 }}>LIMIT</span>
                            )}
                            {" "}&bull;{" "}{trade.time} &bull; {eur(trade.amountEur)}
                            {" "}&bull; {t("paper_history_price")} ${trade.price.toFixed(0)}
                            {typeof trade.pnl === "number" && (
                                <span style={{ color: trade.pnl >= 0 ? "#26c57c" : "#ef4444", marginLeft: 4 }}>
                                    &bull; {trade.pnl >= 0 ? "+" : ""}{eur(trade.pnl)}
                                </span>
                            )}
                            {trade.note && <div className="terminal-journal-note">📓 {trade.note}</div>}
                        </div>
                    ))}
                </div>
            </details>
        </section>
    );
}
