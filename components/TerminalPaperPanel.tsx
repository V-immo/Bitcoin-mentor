"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const EMOTIONS = [
    { value: 1, emoji: "1", label: "Angstig" },
    { value: 2, emoji: "2", label: "Onzeker" },
    { value: 3, emoji: "3", label: "Neutraal" },
    { value: 4, emoji: "4", label: "Goed" },
    { value: 5, emoji: "5", label: "Top" },
];

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
    emotion?: number;
    orderType?: "market" | "limit";
    closePct?: number;
};

type PaperState = {
    startCapital: number;
    cash: number;
    openBtc: number;
    avgEntry: number;
    realizedPnl: number;
    trades: PaperTrade[];
    activeSL?: number;
    activeTP?: number;
};

type ApiPosition = {
    openBtc: number;
    avgEntry: number;
    realizedPnl: number;
    activeSL?: number;
    activeTP?: number;
} | null;

export type TradeCloseDetail = {
    pnl: number;
    entryPrice: number;
    exitPrice: number;
    asset: string;
    reason: "manual" | "sl" | "tp";
    btcAmount: number;
    stopLoss?: number;
    takeProfit?: number;
};

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
        ? {
            openBtc: state.openBtc,
            avgEntry: state.avgEntry,
            realizedPnl: state.realizedPnl,
            activeSL: state.activeSL,
            activeTP: state.activeTP,
        }
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
        activeSL: pos?.activeSL,
        activeTP: pos?.activeTP,
    };
}

// Equity sparkline from trade history
function buildSparkline(trades: PaperTrade[], startCapital: number, currentBalance: number): { x: number; y: number }[] {
    const sells = trades
        .filter(t => t.side === "sell" && typeof t.timestamp === "number")
        .slice()
        .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

    if (sells.length === 0) return [];

    let runningPnl = 0;
    const points: { x: number; y: number }[] = [{ x: 0, y: startCapital }];

    for (const trade of sells) {
        runningPnl += trade.pnl ?? 0;
        points.push({ x: trade.timestamp ?? 0, y: startCapital + runningPnl });
    }
    points.push({ x: Date.now(), y: currentBalance });

    // Normalize to 0-100 for SVG
    const minV = Math.min(...points.map(p => p.y));
    const maxV = Math.max(...points.map(p => p.y));
    const rangeV = maxV - minV || 1;
    const minT = points[0].x;
    const maxT = points[points.length - 1].x || minT + 1;
    const rangeT = maxT - minT || 1;

    return points.map(p => ({
        x: ((p.x - minT) / rangeT) * 100,
        y: 100 - ((p.y - minV) / rangeV) * 100,
    }));
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
    const [activeSide, setActiveSide] = useState<"buy" | "sell">("buy");
    const [buyAmount, setBuyAmount] = useState("1000");
    const [sellPct, setSellPct] = useState(100);
    const [orderType, setOrderType] = useState<OrderType>("market");
    const [limitPrice, setLimitPrice] = useState("");
    const [slInput, setSlInput] = useState("");
    const [tpInput, setTpInput] = useState("");
    const [pendingLimitOrder, setPendingLimitOrder] = useState<{ amount: number; price: number } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmAction, setConfirmAction] = useState<"buy" | "sell" | "partial" | null>(null);
    const [confirmPct, setConfirmPct] = useState(100);
    const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);
    const [noteInput, setNoteInput] = useState("");
    const [pendingEmotionId, setPendingEmotionId] = useState<string | null>(null);
    const [pendingEmotionSide, setPendingEmotionSide] = useState<"buy" | "sell">("buy");
    const [complianceMsg, setComplianceMsg] = useState<{ verdict: string; message: string } | null>(null);
    const [complianceLoading, setComplianceLoading] = useState(false);
    const [zoneWarning, setZoneWarning] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false); // SL/TP + limit verborgen
    const [goal, setGoal] = useState<number | null>(null);
    const [goalInput, setGoalInput] = useState("");
    const [showGoalInput, setShowGoalInput] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: "success" | "warning" | "danger" } | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [state, setState] = useState<PaperState>({
        startCapital: 10000,
        cash: 10000,
        openBtc: 0,
        avgEntry: 0,
        realizedPnl: 0,
        trades: [],
    });

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const slTpLockRef = useRef(false);

    function showNotif(msg: string, type: "success" | "warning" | "danger") {
        setNotification({ msg, type });
        if (notifTimer.current) clearTimeout(notifTimer.current);
        notifTimer.current = setTimeout(() => setNotification(null), 3200);
    }

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
            // Broadcast positie naar TradingChart voor live order lines
            window.dispatchEvent(new CustomEvent("paper-position-update", {
                detail: s.openBtc > 0
                    ? { entryPrice: s.avgEntry, btcAmount: s.openBtc, stopLoss: s.activeSL, takeProfit: s.activeTP }
                    : null,
            }));
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

    // Auto-execute from mentor
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

    // Pending limit order check
    useEffect(() => {
        if (!pendingLimitOrder || currentPrice <= 0) return;
        if (currentPrice <= pendingLimitOrder.price) {
            executeBuy(pendingLimitOrder.amount, pendingLimitOrder.price, "limit");
            setPendingLimitOrder(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPrice, pendingLimitOrder]);

    // SL/TP watcher
    useEffect(() => {
        if (!loaded || currentPrice <= 0 || state.openBtc <= 0) return;
        if (slTpLockRef.current) return;

        if (state.activeSL && currentPrice <= state.activeSL) {
            slTpLockRef.current = true;
            executeAutoClose("sl");
        } else if (state.activeTP && currentPrice >= state.activeTP) {
            slTpLockRef.current = true;
            executeAutoClose("tp");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPrice]);

    // Derived values
    const openValue = state.openBtc * currentPrice;
    const unrealized = state.openBtc > 0 ? (currentPrice - state.avgEntry) * state.openBtc : 0;
    const totalBalance = state.cash + openValue;
    const totalPnl = totalBalance - state.startCapital;
    const totalPnlPct = state.startCapital > 0 ? (totalPnl / state.startCapital) * 100 : 0;
    const roiPct = state.openBtc > 0 && state.avgEntry > 0
        ? ((currentPrice - state.avgEntry) / state.avgEntry) * 100
        : 0;

    const winCount = state.trades.filter(t => t.side === "sell" && (t.pnl || 0) > 0).length;
    const lossCount = state.trades.filter(t => t.side === "sell" && (t.pnl || 0) <= 0).length;
    const closedCount = winCount + lossCount;
    const winrate = closedCount > 0 ? (winCount / closedCount) * 100 : 0;

    const { avgWin, avgLoss, currentStreak, streakType } = useMemo(() => {
        const sells = state.trades.filter(t => t.side === "sell" && typeof t.pnl === "number");
        const wins = sells.filter(t => (t.pnl || 0) > 0);
        const losses = sells.filter(t => (t.pnl || 0) <= 0);
        const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0;
        const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length : 0;
        let currentStreak = 0;
        let streakType: "win" | "loss" | null = null;
        for (const t of sells) {
            const isWin = (t.pnl || 0) > 0;
            if (streakType === null) { streakType = isWin ? "win" : "loss"; currentStreak = 1; }
            else if ((streakType === "win") === isWin) currentStreak++;
            else break;
        }
        return { avgWin, avgLoss, currentStreak, streakType };
    }, [state.trades]);

    const bestTrade = useMemo(() => {
        const sells = state.trades.filter(t => t.side === "sell" && typeof t.pnl === "number");
        return sells.length === 0 ? null : sells.reduce((a, b) => ((a.pnl || 0) > (b.pnl || 0) ? a : b));
    }, [state.trades]);

    const worstTrade = useMemo(() => {
        const sells = state.trades.filter(t => t.side === "sell" && typeof t.pnl === "number");
        return sells.length === 0 ? null : sells.reduce((a, b) => ((a.pnl || 0) < (b.pnl || 0) ? a : b));
    }, [state.trades]);

    const sparkPoints = useMemo(
        () => buildSparkline(state.trades, state.startCapital, totalBalance),
        [state.trades, state.startCapital, totalBalance]
    );
    const sparkPath = sparkPoints.length > 1
        ? sparkPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
        : null;
    const sparkColor = totalPnl >= 0 ? "var(--green)" : "var(--red)";

    const goalPct = goal && state.startCapital > 0
        ? Math.min(100, ((totalBalance - state.startCapital) / (goal - state.startCapital)) * 100)
        : null;

    // Quick buy amounts
    const quickAmounts = [
        Math.round(state.startCapital * 0.05),
        Math.round(state.startCapital * 0.10),
        Math.round(state.startCapital * 0.25),
        Math.round(state.cash),
    ];
    const quickLabels = ["5%", "10%", "25%", "Max"];

    // Order preview
    const buyAmtNum = Number(buyAmount);
    const execPrice = orderType === "limit" ? Number(limitPrice) : currentPrice;
    const previewBtc = buyAmtNum > 0 && execPrice > 0 ? buyAmtNum / execPrice : 0;
    const assetTicker = asset.replace("USDT", "").replace("EUR", "");

    // Sell preview
    const sellBtc = state.openBtc * (sellPct / 100);
    const sellValue = sellBtc * currentPrice;
    const sellPnl = (currentPrice - state.avgEntry) * sellBtc;

    function resetAccount() {
        const capital = state.startCapital;
        setState({ startCapital: capital, cash: capital, openBtc: 0, avgEntry: 0, realizedPnl: 0, trades: [] });
        setBuyAmount(String(Math.round(capital / 10)));
        setPendingLimitOrder(null);
        setConfirmReset(false);
        slTpLockRef.current = false;
        setSlInput("");
        setTpInput("");
    }

    function exportCSV() {
        const header = ["Datum", "Tijd", "Side", "Asset", "Prijs (USD)", "Bedrag (EUR)", "BTC", "P&L (EUR)", "Type", "Notitie"];
        const rows = state.trades.map(t => [
            t.time.split(" ")[0] ?? t.time,
            t.time.split(" ")[1] ?? "",
            t.side.toUpperCase(),
            t.asset ?? asset,
            t.price.toFixed(2),
            t.amountEur.toFixed(2),
            t.btcAmount.toFixed(8),
            typeof t.pnl === "number" ? t.pnl.toFixed(2) : "",
            t.orderType ?? "market",
            `"${(t.note ?? "").replace(/"/g, '""')}"`,
        ]);
        const csv = [header, ...rows].map(r => r.join(";")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bitcoin-mentor-trades-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function checkCompliance(side: "buy" | "sell", amount: number, price: number) {
        setComplianceLoading(true);
        setComplianceMsg(null);
        const dailyTrades = state.trades.filter(t => {
            const d = new Date(t.timestamp ?? 0);
            const today = new Date();
            return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
        }).length;
        try {
            const res = await fetch("/api/me/compliance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ asset, side, amount, price, dailyTrades }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.message) setComplianceMsg({ verdict: data.verdict, message: data.message });
            }
        } catch { /* ignore */ }
        setComplianceLoading(false);
    }

    function executeBuy(amount: number, execP: number, type: OrderType = "market") {
        const btcAmount = amount / execP;
        const sl = Number(slInput) > 0 ? Number(slInput) : undefined;
        const tp = Number(tpInput) > 0 ? Number(tpInput) : undefined;
        const newId = crypto.randomUUID();
        setState((prev) => {
            const totalCostBefore = prev.openBtc * prev.avgEntry;
            const totalCostAfter = totalCostBefore + amount;
            const totalBtcAfter = prev.openBtc + btcAmount;
            const newAvg = totalBtcAfter > 0 ? totalCostAfter / totalBtcAfter : 0;
            return {
                ...prev,
                cash: prev.cash - amount,
                openBtc: prev.openBtc + btcAmount,
                avgEntry: newAvg,
                activeSL: sl ?? prev.activeSL,
                activeTP: tp ?? prev.activeTP,
                trades: [{
                    id: newId, side: "buy",
                    amountEur: amount, price: execP,
                    btcAmount, time: nowLabel(),
                    timestamp: Date.now(), asset, orderType: type,
                }, ...prev.trades],
            };
        });
        slTpLockRef.current = false;
        setPendingEmotionId(newId);
        setPendingEmotionSide("buy");
        checkCompliance("buy", amount, execP);
    }

    function executePartialClose(pct: number) {
        if (state.openBtc <= 0 || currentPrice <= 0) return;
        const closeBtc = state.openBtc * pct;
        const closeValue = closeBtc * currentPrice;
        const pnl = (currentPrice - state.avgEntry) * closeBtc;
        const newId = crypto.randomUUID();
        const isFull = pct >= 1 || (state.openBtc - closeBtc) < 0.000001;
        setState((prev) => ({
            ...prev,
            cash: prev.cash + closeValue,
            openBtc: isFull ? 0 : prev.openBtc - closeBtc,
            avgEntry: isFull ? 0 : prev.avgEntry,
            activeSL: isFull ? undefined : prev.activeSL,
            activeTP: isFull ? undefined : prev.activeTP,
            realizedPnl: prev.realizedPnl + pnl,
            trades: [{
                id: newId, side: "sell",
                amountEur: closeValue, price: currentPrice,
                btcAmount: closeBtc, pnl,
                time: nowLabel(), timestamp: Date.now(), asset,
                closePct: pct < 1 ? pct : undefined,
            }, ...prev.trades],
        }));
        if (isFull) {
            setPendingEmotionId(newId);
            setPendingEmotionSide("sell");
            setNoteInput("");
            checkCompliance("sell", closeValue, currentPrice);
            // Fire Marcus auto-debrief event
            window.dispatchEvent(new CustomEvent("marcus-trade-debrief", {
                detail: { pnl, entryPrice: state.avgEntry, exitPrice: currentPrice, asset, reason: "manual", btcAmount: closeBtc, stopLoss: state.activeSL, takeProfit: state.activeTP } satisfies TradeCloseDetail,
            }));
        }
    }

    function executeAutoClose(reason: "sl" | "tp") {
        if (state.openBtc <= 0 || currentPrice <= 0) return;
        const valueNow = state.openBtc * currentPrice;
        const pnl = (currentPrice - state.avgEntry) * state.openBtc;
        const entrySnap = state.avgEntry;
        const btcSnap = state.openBtc;
        const newId = crypto.randomUUID();
        const noteText = reason === "sl" ? "Stop Loss triggered" : "Take Profit triggered";
        setState((prev) => ({
            ...prev,
            cash: prev.cash + valueNow,
            openBtc: 0,
            avgEntry: 0,
            activeSL: undefined,
            activeTP: undefined,
            realizedPnl: prev.realizedPnl + pnl,
            trades: [{
                id: newId, side: "sell",
                amountEur: valueNow, price: currentPrice,
                btcAmount: prev.openBtc, pnl,
                time: nowLabel(), timestamp: Date.now(), asset,
                note: noteText,
            }, ...prev.trades],
        }));
        showNotif(
            reason === "sl" ? t("paper_sltp_triggered_sl") : t("paper_sltp_triggered_tp"),
            reason === "sl" ? "danger" : "success"
        );
        // Fire Marcus auto-debrief event
        window.dispatchEvent(new CustomEvent("marcus-trade-debrief", {
            detail: { pnl, entryPrice: entrySnap, exitPrice: currentPrice, asset, reason, btcAmount: btcSnap, stopLoss: state.activeSL, takeProfit: state.activeTP } satisfies TradeCloseDetail,
        }));
    }

    function requestBuy(force = false) {
        const amount = Number(buyAmount);
        if (!Number.isFinite(amount) || amount <= 0 || amount > state.cash || currentPrice <= 0) return;

        if (orderType === "limit") {
            const lp = Number(limitPrice);
            if (!Number.isFinite(lp) || lp <= 0) return;
            if (currentPrice <= lp) {
                setConfirmAction("buy");
                setShowConfirm(true);
            } else {
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

    function requestPartialClose(pct: number) {
        if (state.openBtc <= 0 || currentPrice <= 0) return;
        setConfirmPct(pct);
        setConfirmAction(pct >= 1 ? "sell" : "partial");
        setShowConfirm(true);
    }

    function confirmOrder() {
        setShowConfirm(false);
        const amount = Number(buyAmount);
        if (confirmAction === "buy") {
            const ep = orderType === "limit" ? Number(limitPrice) : currentPrice;
            executeBuy(amount, ep, orderType);
            setZoneWarning(false);
        } else if (confirmAction === "sell") {
            executePartialClose(1);
        } else if (confirmAction === "partial") {
            executePartialClose(confirmPct);
        }
        setConfirmAction(null);
    }

    function saveNote() {
        if (!pendingNoteId || !noteInput.trim()) { setPendingNoteId(null); return; }
        const noteTrade = state.trades.find(t => t.id === pendingNoteId);
        setState((prev) => ({
            ...prev,
            trades: prev.trades.map(t => t.id === pendingNoteId ? { ...t, note: noteInput.trim() } : t),
        }));
        // Auto-save naar trade journal
        const today = new Date().toISOString().slice(0, 10);
        fetch("/api/me/journal", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                date: today,
                note: noteInput.trim(),
                emotion: noteTrade?.emotion ?? 3,
            }),
        }).catch(() => {});
        setPendingNoteId(null);
        setNoteInput("");
    }

    function saveEmotion(id: string, emotion: number) {
        setState((prev) => ({
            ...prev,
            trades: prev.trades.map(t => t.id === id ? { ...t, emotion } : t),
        }));
        if (pendingEmotionSide === "sell") {
            // Na emotie bij sell → toon note prompt
            setPendingNoteId(id);
        }
        setPendingEmotionId(null);
    }

    function skipEmotion() {
        if (pendingEmotionSide === "sell" && pendingEmotionId) {
            setPendingNoteId(pendingEmotionId);
        }
        setPendingEmotionId(null);
    }

    if (!loaded) {
        return (
            <section className="terminal-side-card">
                <div className="terminal-label">{t("paper_label")}</div>
                <div className="terminal-side-title">{t("paper_loading_label")}</div>
            </section>
        );
    }

    const confirmExecPrice = orderType === "limit" ? Number(limitPrice) : currentPrice;
    const confirmBtcAmt = Number(buyAmount) > 0 && confirmExecPrice > 0
        ? (Number(buyAmount) / confirmExecPrice)
        : 0;

    return (
        <section className="terminal-side-card" style={{ position: "relative" }}>

            {/* Notification toast */}
            {notification && (
                <div className={`paper-notification paper-notification-${notification.type}`}>
                    {notification.msg}
                </div>
            )}

            {/* Marcus plan compliance verdict */}
            {(complianceLoading || complianceMsg) && (
                <div style={{
                    margin: "8px 0 0",
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: complianceLoading ? "color-mix(in srgb, var(--primary) 6%, transparent)" :
                        complianceMsg?.verdict === "ok" ? "color-mix(in srgb, var(--green) 8%, transparent)" :
                        complianceMsg?.verdict === "bad" ? "color-mix(in srgb, var(--red) 8%, transparent)" :
                        "color-mix(in srgb, var(--orange) 8%, transparent)",
                    border: complianceLoading ? "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" :
                        complianceMsg?.verdict === "ok" ? "1px solid color-mix(in srgb, var(--green) 20%, transparent)" :
                        complianceMsg?.verdict === "bad" ? "1px solid color-mix(in srgb, var(--red) 20%, transparent)" :
                        "1px solid color-mix(in srgb, var(--orange) 20%, transparent)",
                    fontSize: 12,
                    color: "var(--text)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                }}>
                    <span style={{ lineHeight: 1.5 }}>
                        {complianceLoading ? "Marcus controleert je handelsplan…" : complianceMsg?.message}
                    </span>
                    {!complianceLoading && complianceMsg && (
                        <button onClick={() => setComplianceMsg(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 0, marginLeft: "auto", flexShrink: 0 }}>✕</button>
                    )}
                </div>
            )}

            {/* === HEADER (compact — balance + cash + help) === */}
            <div className="paper-header">
                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="terminal-label">{t("paper_label")}</span>
                        <span className="paper-balance-display" style={{ color: totalPnl >= 0 ? "var(--green)" : "var(--red)" }}>
                            {eur(totalBalance)}
                        </span>
                        <span className={`paper-pnl-badge ${totalPnl >= 0 ? "pos" : "neg"}`}>
                            {totalPnl >= 0 ? "+" : ""}{totalPnlPct.toFixed(1)}%
                        </span>
                        {sparkPath && (
                            <svg className="paper-sparkline" viewBox="0 0 100 40" preserveAspectRatio="none" style={{ marginLeft: 4 }}>
                                <path d={sparkPath} fill="none" stroke={sparkColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                            </svg>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 3, fontSize: 11, color: "var(--text-secondary)" }}>
                        <span>Cash: <strong style={{ color: "var(--text)" }}>{eur(state.cash)}</strong></span>
                        {state.openBtc > 0 && (
                            <span style={{ color: unrealized >= 0 ? "var(--green)" : "var(--red)" }}>
                                Open: {unrealized >= 0 ? "+" : ""}{eur(unrealized)}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    className="terminal-btn terminal-btn-muted"
                    onClick={() => setShowHelp(v => !v)}
                    style={{ fontSize: 11, padding: "3px 8px", alignSelf: "flex-start" }}
                    title="Uitleg"
                >?</button>
            </div>

            {/* === HELP === */}
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
                </div>
            )}

            {/* === ORDER PANEL (PRIMARY — always first) === */}
            <div className="paper-order-panel">

                {/* Buy / Sell tabs */}
                <div className="paper-side-tabs">
                    <button
                        className={`paper-side-tab buy${activeSide === "buy" ? " active" : ""}`}
                        onClick={() => setActiveSide("buy")}
                    >
                        {t("paper_tab_buy")}
                    </button>
                    <button
                        className={`paper-side-tab sell${activeSide === "sell" ? " active" : ""}`}
                        onClick={() => setActiveSide("sell")}
                    >
                        {t("paper_tab_sell")}
                    </button>
                </div>

                {/* === BUY PANEL === */}
                {activeSide === "buy" && (
                    <>
                        {/* Amount — compact met % knoppen */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                                {quickAmounts.map((amt, i) => (
                                    <button
                                        key={i}
                                        className={`paper-quick-btn${Number(buyAmount) === amt ? " active" : ""}`}
                                        onClick={() => setBuyAmount(String(amt))}
                                        style={{ flex: 1 }}
                                    >
                                        {quickLabels[i]}
                                    </button>
                                ))}
                            </div>
                            <input
                                className="terminal-terminal-input"
                                value={buyAmount}
                                onChange={(e) => setBuyAmount(e.target.value)}
                                inputMode="decimal"
                                placeholder={`Bedrag in EUR (max ${eur(state.cash)})`}
                            />
                        </div>

                        {/* Signal levels — compact inline hint */}
                        {entryZoneLow > 0 && (
                            <div className="paper-signal-hint">
                                <span className="paper-signal-hint-item green">
                                    ↗ ${Math.round(entryZoneLow).toLocaleString()}–${Math.round(entryZoneHigh).toLocaleString()}
                                </span>
                                {stopLoss > 0 && (
                                    <span className="paper-signal-hint-item red">
                                        SL ${Math.round(stopLoss).toLocaleString()}
                                    </span>
                                )}
                                {resistanceZoneLow > 0 && (
                                    <span className="paper-signal-hint-item amber">
                                        TP ${Math.round(resistanceZoneLow).toLocaleString()}
                                    </span>
                                )}
                                <span className="paper-signal-hint-item muted">R:R {riskRewardEstimate}</span>
                            </div>
                        )}

                        {/* Geavanceerd toggle */}
                        <button
                            className="terminal-btn terminal-btn-muted"
                            style={{ width: "100%", fontSize: 11, marginBottom: showAdvanced ? 10 : 0 }}
                            onClick={() => setShowAdvanced(v => !v)}
                        >
                            {showAdvanced ? "▲ Minder opties" : "▾ Geavanceerd (Limit · SL · TP)"}
                        </button>

                        {/* Geavanceerd: Limit + SL/TP */}
                        {showAdvanced && (
                            <div style={{ marginBottom: 10 }}>
                                {/* Order type */}
                                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
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
                                {/* Limit price */}
                                {orderType === "limit" && (
                                    <div style={{ marginBottom: 8 }}>
                                        <input
                                            className="terminal-terminal-input"
                                            type="number"
                                            value={limitPrice}
                                            onChange={(e) => setLimitPrice(e.target.value)}
                                            placeholder={t("paper_limit_price_placeholder")}
                                        />
                                        {Number(limitPrice) > 0 && currentPrice > 0 && Number(limitPrice) > currentPrice && (
                                            <div style={{ fontSize: 11, color: "var(--orange)", marginTop: 4 }}>
                                                {t("paper_limit_above_market")}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* SL / TP inputs */}
                                <div className="paper-sltp-inputs">
                                    <div className="paper-sltp-input-wrap sl">
                                        <label>{t("paper_sl_label")}</label>
                                        <input
                                            className="terminal-terminal-input"
                                            type="number"
                                            value={slInput}
                                            onChange={e => setSlInput(e.target.value)}
                                            placeholder={stopLoss > 0 ? `${Math.round(stopLoss)}` : "optioneel"}
                                        />
                                    </div>
                                    <div className="paper-sltp-input-wrap tp">
                                        <label>{t("paper_tp_label")}</label>
                                        <input
                                            className="terminal-terminal-input"
                                            type="number"
                                            value={tpInput}
                                            onChange={e => setTpInput(e.target.value)}
                                            placeholder={resistanceZoneLow > 0 ? `${Math.round(resistanceZoneLow)}` : "optioneel"}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Order preview */}
                        {previewBtc > 0 && (
                            <div className="paper-order-preview">
                                <span style={{ fontWeight: 600, color: "var(--text)" }}>
                                    {eur(buyAmtNum)}
                                </span>
                                {" → "}
                                <span style={{ fontWeight: 700, color: "var(--green)" }}>
                                    {previewBtc.toFixed(6)} {assetTicker}
                                </span>
                                {" @ "}
                                <span>${Math.round(execPrice > 0 ? execPrice : currentPrice).toLocaleString("en-US")}</span>
                                {Number(slInput) > 0 && (
                                    <span style={{ color: "var(--red)", marginLeft: 6 }}>
                                        · SL ${Math.round(Number(slInput)).toLocaleString("en-US")}
                                    </span>
                                )}
                                {Number(tpInput) > 0 && (
                                    <span style={{ color: "var(--green)", marginLeft: 6 }}>
                                        · TP ${Math.round(Number(tpInput)).toLocaleString("en-US")}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Zone warning */}
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

                        {/* Buy button */}
                        <button
                            className="paper-action-buy"
                            onClick={() => requestBuy()}
                            disabled={
                                buyAmtNum > state.cash ||
                                buyAmtNum <= 0 ||
                                currentPrice <= 0 ||
                                (orderType === "limit" && (!Number(limitPrice) || Number(limitPrice) <= 0)) ||
                                !!pendingLimitOrder
                            }
                        >
                            {currentPrice <= 0
                                ? t("loading")
                                : orderType === "limit"
                                    ? `Limit ${t("paper_tab_buy")} ${assetTicker} →`
                                    : `${t("paper_tab_buy")} ${assetTicker} →`}
                        </button>
                    </>
                )}

                {/* === SELL / CLOSE PANEL === */}
                {activeSide === "sell" && (
                    <>
                        {state.openBtc <= 0 ? (
                            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-secondary)" }}>
                                <div style={{ fontSize: 24, marginBottom: 8 }}>○</div>
                                <div style={{ fontWeight: 600 }}>{t("paper_no_position")}</div>
                                <div style={{ fontSize: 12, marginTop: 4 }}>{t("paper_no_position_hint")}</div>
                            </div>
                        ) : (
                            <>
                                {/* Sell percentage selector */}
                                <div style={{ marginBottom: 12 }}>
                                    <div className="terminal-mini-label" style={{ marginBottom: 6 }}>
                                        {t("paper_sell_amount_label")}
                                    </div>
                                    <div className="paper-close-btns" style={{ marginBottom: 8 }}>
                                        {[25, 50, 75, 100].map(pct => (
                                            <button
                                                key={pct}
                                                className={`paper-close-btn${sellPct === pct ? " full" : ""}${pct === 100 ? " full" : ""}`}
                                                onClick={() => setSellPct(pct)}
                                                style={sellPct === pct ? { borderColor: "var(--red)", background: "color-mix(in srgb, var(--red) 18%, transparent)" } : {}}
                                            >
                                                {pct}%
                                            </button>
                                        ))}
                                    </div>

                                    {/* Sell preview */}
                                    <div className="paper-order-preview">
                                        <span style={{ fontWeight: 600, color: "var(--text)" }}>
                                            {sellBtc.toFixed(6)} {assetTicker}
                                        </span>
                                        {" → "}
                                        <span style={{ fontWeight: 700, color: "var(--red)" }}>
                                            {eur(sellValue)}
                                        </span>
                                        {" · P&L: "}
                                        <span style={{ fontWeight: 700, color: sellPnl >= 0 ? "var(--green)" : "var(--red)" }}>
                                            {sellPnl >= 0 ? "+" : ""}{eur(sellPnl)}
                                        </span>
                                    </div>
                                </div>

                                {/* SL/TP update for open position */}
                                <div className="paper-sltp-inputs" style={{ marginBottom: 10 }}>
                                    <div className="paper-sltp-input-wrap sl">
                                        <label>{t("paper_sl_label")}</label>
                                        <input
                                            className="terminal-terminal-input"
                                            type="number"
                                            value={state.activeSL ? String(state.activeSL) : ""}
                                            onChange={e => {
                                                const v = Number(e.target.value);
                                                setState(prev => ({ ...prev, activeSL: v > 0 ? v : undefined }));
                                            }}
                                            placeholder={t("paper_sl_not_set")}
                                        />
                                    </div>
                                    <div className="paper-sltp-input-wrap tp">
                                        <label>{t("paper_tp_label")}</label>
                                        <input
                                            className="terminal-terminal-input"
                                            type="number"
                                            value={state.activeTP ? String(state.activeTP) : ""}
                                            onChange={e => {
                                                const v = Number(e.target.value);
                                                setState(prev => ({ ...prev, activeTP: v > 0 ? v : undefined }));
                                            }}
                                            placeholder={t("paper_tp_not_set")}
                                        />
                                    </div>
                                </div>

                                {/* Sell button */}
                                <button
                                    className="paper-action-sell"
                                    onClick={() => requestPartialClose(sellPct / 100)}
                                >
                                    {sellPct === 100
                                        ? `${t("paper_btn_sell")} (100%)`
                                        : `${t("paper_close_partial_title")} ${sellPct}% → ${eur(sellValue)}`}
                                </button>
                            </>
                        )}
                    </>
                )}

                {/* Reset button */}
                <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                    {confirmReset ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "var(--red)" }}>{t("paper_confirm_reset")}</span>
                            <button className="terminal-btn terminal-btn-danger" style={{ fontSize: 11 }} onClick={resetAccount}>{t("paper_reset_confirm_btn")}</button>
                            <button className="terminal-btn terminal-btn-muted" style={{ fontSize: 11 }} onClick={() => setConfirmReset(false)}>✕</button>
                        </div>
                    ) : (
                        <button
                            className="terminal-btn terminal-btn-muted"
                            onClick={() => setConfirmReset(true)}
                            style={{ fontSize: 11, padding: "3px 10px" }}
                        >
                            ↺ {t("paper_reset_confirm_btn")}
                        </button>
                    )}
                </div>
            </div>

            {/* === PENDING LIMIT ORDER === */}
            {pendingLimitOrder && (
                <div className="terminal-zone-warning" style={{ marginBottom: 8, borderColor: "color-mix(in srgb, var(--orange) 33%, transparent)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12 }}>
                            {t("paper_limit_pending")} ${Math.round(pendingLimitOrder.price).toLocaleString("en-US")}
                            <span style={{ color: "var(--text-secondary)", marginLeft: 6 }}>({eur(pendingLimitOrder.amount)})</span>
                        </span>
                        <button
                            onClick={() => setPendingLimitOrder(null)}
                            style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 12 }}
                        >
                            {t("paper_limit_cancel")} ✕
                        </button>
                    </div>
                </div>
            )}

            {/* === OPEN POSITION CARD === */}
            {state.openBtc > 0 && (
                <div className="paper-position-card">
                    <div className="paper-position-header">
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="paper-position-badge">LONG</span>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{assetTicker}</span>
                            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                {state.openBtc.toFixed(6)}
                            </span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: unrealized >= 0 ? "var(--green)" : "var(--red)" }}>
                            {unrealized >= 0 ? "+" : ""}{eur(unrealized)}
                        </span>
                    </div>

                    <div className="paper-position-metrics">
                        <div className="paper-position-metric">
                            <div className="paper-position-metric-label">{t("paper_position_entry")}</div>
                            <div className="paper-position-metric-value">
                                ${Math.round(state.avgEntry).toLocaleString("en-US")}
                            </div>
                        </div>
                        <div className="paper-position-metric">
                            <div className="paper-position-metric-label">{t("paper_position_current")}</div>
                            <div className="paper-position-metric-value">
                                ${Math.round(currentPrice).toLocaleString("en-US")}
                            </div>
                        </div>
                        <div className="paper-position-metric">
                            <div className="paper-position-metric-label">{t("paper_position_roi")}</div>
                            <div className="paper-position-metric-value" style={{ color: roiPct >= 0 ? "var(--green)" : "var(--red)" }}>
                                {roiPct >= 0 ? "+" : ""}{roiPct.toFixed(2)}%
                            </div>
                        </div>
                        <div className="paper-position-metric">
                            <div className="paper-position-metric-label">{t("paper_position_size")}</div>
                            <div className="paper-position-metric-value">{eur(openValue)}</div>
                        </div>
                    </div>

                    {/* SL/TP status pills */}
                    <div className="paper-sltp-row">
                        <div className={`paper-sltp-pill${state.activeSL ? " sl-active" : ""}`}>
                            <span style={{ color: "var(--red)", fontWeight: 700, fontSize: 10 }}>SL</span>
                            <span>
                                {state.activeSL
                                    ? `$${Math.round(state.activeSL).toLocaleString("en-US")}`
                                    : t("paper_sl_not_set")}
                            </span>
                        </div>
                        <div className={`paper-sltp-pill${state.activeTP ? " tp-active" : ""}`}>
                            <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 10 }}>TP</span>
                            <span>
                                {state.activeTP
                                    ? `$${Math.round(state.activeTP).toLocaleString("en-US")}`
                                    : t("paper_tp_not_set")}
                            </span>
                        </div>
                    </div>

                    {/* Partial close buttons */}
                    <div className="paper-close-btns">
                        {[25, 50, 75].map(pct => (
                            <button
                                key={pct}
                                className="paper-close-btn"
                                onClick={() => requestPartialClose(pct / 100)}
                            >
                                {pct}%
                            </button>
                        ))}
                        <button
                            className="paper-close-btn full"
                            onClick={() => requestPartialClose(1)}
                        >
                            {t("paper_close_all")}
                        </button>
                    </div>
                </div>
            )}

            {/* === GOAL TRACKER (compact — alleen tonen als actief) === */}
            {goal !== null && (
                <div className="paper-goal-strip">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("paper_goal_label")} {eur(goal)}</span>
                        <button onClick={() => { setGoal(null); setGoalInput(""); }} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 11 }}>✕</button>
                    </div>
                    <div className="paper-goal-bar">
                        <div className="paper-goal-fill" style={{ width: `${Math.max(0, goalPct ?? 0)}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                        {goalPct !== null && goalPct >= 100
                            ? t("paper_goal_achieved")
                            : `${Math.max(0, goalPct ?? 0).toFixed(0)}${t("paper_goal_pct_suffix")}`}
                    </div>
                </div>
            )}
            {showGoalInput && (
                <div className="paper-goal-strip">
                    <div style={{ display: "flex", gap: 6 }}>
                        <input
                            className="terminal-terminal-input"
                            type="number"
                            placeholder={`Doel b.v. €${Math.round(state.startCapital * 1.1)}`}
                            value={goalInput}
                            onChange={e => setGoalInput(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button className="terminal-btn terminal-btn-primary" onClick={() => { const g = Number(goalInput); if (g > state.startCapital) { setGoal(g); setShowGoalInput(false); } }}>OK</button>
                        <button className="terminal-btn terminal-btn-muted" onClick={() => setShowGoalInput(false)}>✕</button>
                    </div>
                </div>
            )}


            {/* === CONFIRMATION DIALOG === */}
            {showConfirm && confirmAction && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
                }}>
                    <div style={{
                        background: "var(--surface)", border: "1px solid var(--surface-1)",
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
                                            ? (orderType === "limit" ? "Limit BUY" : "Market BUY")
                                            : confirmAction === "partial"
                                                ? `Partial SELL (${Math.round(confirmPct * 100)}%)`
                                                : "Market SELL"}
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
                                                {confirmBtcAmt.toFixed(6)} {assetTicker}
                                            </td>
                                        </tr>
                                        {Number(slInput) > 0 && (
                                            <tr>
                                                <td style={{ color: "var(--text-secondary)", padding: "4px 0" }}>Stop Loss</td>
                                                <td style={{ textAlign: "right", fontWeight: 600, color: "var(--red)" }}>
                                                    ${Math.round(Number(slInput)).toLocaleString("en-US")}
                                                </td>
                                            </tr>
                                        )}
                                        {Number(tpInput) > 0 && (
                                            <tr>
                                                <td style={{ color: "var(--text-secondary)", padding: "4px 0" }}>Take Profit</td>
                                                <td style={{ textAlign: "right", fontWeight: 600, color: "var(--green)" }}>
                                                    ${Math.round(Number(tpInput)).toLocaleString("en-US")}
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )}
                                {(confirmAction === "sell" || confirmAction === "partial") && state.openBtc > 0 && (
                                    <>
                                        <tr>
                                            <td style={{ color: "var(--text-secondary)", padding: "4px 0" }}>{t("paper_confirm_asset_amount")}</td>
                                            <td style={{ textAlign: "right", fontWeight: 600 }}>
                                                {(state.openBtc * confirmPct).toFixed(6)} {assetTicker}
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
                                            <td style={{ textAlign: "right", fontWeight: 700, color: unrealized * confirmPct >= 0 ? "var(--green)" : "var(--red)" }}>
                                                {(unrealized * confirmPct) >= 0 ? "+" : ""}{eur(unrealized * confirmPct)}
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
                                className={`terminal-btn ${confirmAction === "sell" || confirmAction === "partial" ? "terminal-btn-danger" : "terminal-btn-primary"}`}
                                style={{ flex: 2, fontWeight: 700 }}
                                onClick={confirmOrder}
                            >
                                {t("paper_confirm_execute")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === EMOTIE PICKER === */}
            {pendingEmotionId && (
                <div className="terminal-journal-prompt">
                    <div className="terminal-mini-label" style={{ marginBottom: 4 }}>
                        {pendingEmotionSide === "buy" ? "Hoe voel je je bij deze aankoop?" : "Hoe voel je je bij het sluiten?"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
                        Emotie-tracking helpt je patronen ontdekken in je tradinggedrag.
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 10 }}>
                        {EMOTIONS.map(e => (
                            <button
                                key={e.value}
                                title={e.label}
                                onClick={() => saveEmotion(pendingEmotionId, e.value)}
                                style={{
                                    background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                                    border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                                    borderRadius: 10,
                                    width: 44, height: 44,
                                    fontSize: 22, cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    transition: "all 0.15s",
                                }}
                                onMouseEnter={e2 => { e2.currentTarget.style.background = "color-mix(in srgb, var(--primary) 20%, transparent)"; e2.currentTarget.style.transform = "scale(1.15)"; }}
                                onMouseLeave={e2 => { e2.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; e2.currentTarget.style.transform = "scale(1)"; }}
                            >
                                {e.emoji}
                            </button>
                        ))}
                    </div>
                    <button
                        className="terminal-btn terminal-btn-muted"
                        style={{ width: "100%", fontSize: 11 }}
                        onClick={skipEmotion}
                    >
                        Overslaan
                    </button>
                </div>
            )}

            {/* === JOURNAL === */}
            {pendingNoteId && (() => {
                const jTrade = state.trades.find(t => t.id === pendingNoteId);
                const pnl = jTrade?.pnl ?? 0;
                const marcusQ = pnl > 0
                    ? "Wat deed je goed hier? Welke setup werkte?"
                    : pnl < 0
                    ? "Wat leerde je van dit verlies? Wat doe je anders?"
                    : "Wat nam je mee uit deze positie?";
                return (
                    <div className="terminal-journal-prompt">
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                            <div style={{
                                width: 22, height: 22, borderRadius: "50%",
                                background: "color-mix(in srgb, var(--primary) 15%, transparent)",
                                border: "1px solid color-mix(in srgb, var(--primary) 40%, transparent)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 700, color: "var(--primary)", flexShrink: 0,
                            }}>M</div>
                            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>
                                {marcusQ}
                            </span>
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
                );
            })()}

            {/* === STATS === */}
            {closedCount > 0 && (
                <div className="terminal-progress-grid" style={{ marginTop: 12 }}>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">{t("paper_stats_winrate")}</span>
                        <span className="terminal-progress-value" style={{ color: winrate >= 50 ? "var(--green)" : "var(--red)" }}>
                            {winrate.toFixed(0)}%
                        </span>
                        <span className="terminal-progress-sub">{winCount}W / {lossCount}L</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">{t("paper_stats_total_pl")}</span>
                        <span className="terminal-progress-value" style={{ color: state.realizedPnl >= 0 ? "var(--green)" : "var(--red)" }}>
                            {eur(state.realizedPnl)}
                        </span>
                        <span className="terminal-progress-sub">{t("paper_stats_closed")}</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">{t("paper_stats_avg_win")}</span>
                        <span className="terminal-progress-value" style={{ color: "var(--green)" }}>
                            {avgWin > 0 ? eur(avgWin) : "—"}
                        </span>
                        <span className="terminal-progress-sub">{t("paper_stats_per_win")}</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">{t("paper_stats_avg_loss")}</span>
                        <span className="terminal-progress-value" style={{ color: "var(--red)" }}>
                            {avgLoss < 0 ? eur(avgLoss) : "—"}
                        </span>
                        <span className="terminal-progress-sub">{t("paper_stats_per_loss")}</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">{t("paper_stats_streak")}</span>
                        <span className="terminal-progress-value" style={{ color: streakType === "win" ? "var(--green)" : streakType === "loss" ? "var(--red)" : "var(--text-muted)" }}>
                            {currentStreak > 0 ? `${currentStreak}× ${streakType === "win" ? "+" : "-"}` : "—"}
                        </span>
                        <span className="terminal-progress-sub">{t("paper_stats_streak_sub")}</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">{t("paper_stats_best")}</span>
                        <span className="terminal-progress-value" style={{ color: "var(--green)" }}>
                            {bestTrade ? eur(bestTrade.pnl || 0) : "—"}
                        </span>
                        <span className="terminal-progress-sub">{t("paper_stats_worst_prefix")} {worstTrade ? eur(worstTrade.pnl || 0) : "—"}</span>
                    </div>
                </div>
            )}

            {/* === TRADE HISTORY === */}
            <details className="terminal-history" style={{ marginTop: 12 }}>
                <summary style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>
                        {t("paper_history_title")}
                        {state.trades.length > 0 && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-secondary)" }}>
                                ({state.trades.length} {t("paper_history_trades_suffix")}
                            </span>
                        )}
                    </span>
                    {state.trades.length > 0 && (
                        <button
                            className="terminal-btn terminal-btn-muted"
                            style={{ fontSize: 11, padding: "2px 8px", marginLeft: 8 }}
                            onClick={e => { e.preventDefault(); exportCSV(); }}
                        >
                            {t("paper_history_export")}
                        </button>
                    )}
                </summary>
                <div className="paper-history-scroll">
                    {state.trades.length === 0 ? (
                        <div style={{ color: "var(--text-secondary)", fontSize: 12, padding: "8px 0" }}>
                            {t("paper_history_empty")}
                        </div>
                    ) : (
                        <table className="paper-history-table">
                            <thead>
                                <tr>
                                    <th>Tijd</th>
                                    <th>Side</th>
                                    <th style={{ textAlign: "right" }}>Prijs</th>
                                    <th style={{ textAlign: "right" }}>Bedrag</th>
                                    <th style={{ textAlign: "right" }}>P&L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {state.trades.map((trade) => (
                                    <>
                                        <tr key={trade.id}>
                                            <td style={{ color: "var(--text-secondary)" }}>{trade.time}</td>
                                            <td>
                                                <span style={{
                                                    color: trade.side === "buy" ? "var(--green)" : "var(--red)",
                                                    fontWeight: 700,
                                                    fontSize: 11,
                                                }}>
                                                    {trade.side === "buy" ? "BUY" : "SELL"}
                                                </span>
                                                {trade.orderType === "limit" && (
                                                    <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 3 }}>LMT</span>
                                                )}
                                                {trade.closePct && (
                                                    <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 3 }}>
                                                        {Math.round(trade.closePct * 100)}%
                                                    </span>
                                                )}
                                                {trade.emotion && (
                                                    <span style={{ marginLeft: 4, fontSize: 13 }} title={EMOTIONS.find(e => e.value === trade.emotion)?.label}>
                                                        {EMOTIONS.find(e => e.value === trade.emotion)?.emoji}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                ${trade.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                                            </td>
                                            <td style={{ textAlign: "right" }}>{eur(trade.amountEur)}</td>
                                            <td style={{ textAlign: "right" }}>
                                                {typeof trade.pnl === "number" ? (
                                                    <span style={{ color: trade.pnl >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                                                        {trade.pnl >= 0 ? "+" : ""}{eur(trade.pnl)}
                                                    </span>
                                                ) : "—"}
                                            </td>
                                        </tr>
                                        {trade.note && (
                                            <tr key={`${trade.id}-note`}>
                                                <td colSpan={5} style={{ paddingTop: 0 }}>
                                                    <div className="terminal-journal-note">{trade.note}</div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </details>
        </section>
    );
}
