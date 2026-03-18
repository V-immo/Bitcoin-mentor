"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
    riskRewardEstimate: string | number;
    asset: string;
    autoExecuteAmount?: number | null;
};

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
    riskRewardEstimate,
    asset,
    autoExecuteAmount,
}: Props) {
    const [loaded, setLoaded] = useState(false);
    const [buyAmount, setBuyAmount] = useState("1000");
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
                    timestamp: Date.now(), asset,
                }, ...prev.trades],
            };
        });
        setBuyAmount(String(amount));
        setZoneWarning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoExecuteAmount]);

    const openValue = state.openBtc * currentPrice;
    const unrealized = state.openBtc > 0 ? (currentPrice - state.avgEntry) * state.openBtc : 0;
    const totalBalance = state.cash + openValue;
    const totalPnl = totalBalance - state.startCapital;
    const totalPnlPct = state.startCapital > 0 ? (totalPnl / state.startCapital) * 100 : 0;

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

    function resetAccount() {
        const capital = state.startCapital;
        setState({ startCapital: capital, cash: capital, openBtc: 0, avgEntry: 0, realizedPnl: 0, trades: [] });
        setBuyAmount(String(Math.round(capital / 10)));
        setConfirmReset(false);
    }

    function openBuy(force = false) {
        const amount = Number(buyAmount);
        if (!Number.isFinite(amount) || amount <= 0) return;
        if (amount > state.cash) return;
        const inZone = currentPrice >= entryZoneLow && currentPrice <= entryZoneHigh;
        if (!inZone && !force) { setZoneWarning(true); return; }
        setZoneWarning(false);
        const btcAmount = amount / currentPrice;
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
                amountEur: amount, price: currentPrice,
                btcAmount, time: nowLabel(),
                timestamp: Date.now(), asset,
            }, ...prev.trades],
        }));
    }

    function closeTrade() {
        if (state.openBtc <= 0) return;
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

    function saveNote() {
        if (!pendingNoteId || !noteInput.trim()) { setPendingNoteId(null); return; }
        setState((prev) => ({
            ...prev,
            trades: prev.trades.map(t => t.id === pendingNoteId ? { ...t, note: noteInput.trim() } : t),
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
                <div className="terminal-label">Nep geld traden</div>
                <div className="terminal-side-title">Laden...</div>
            </section>
        );
    }

    const goalPct = goal && state.startCapital > 0
        ? Math.min(100, ((totalBalance - state.startCapital) / (goal - state.startCapital)) * 100)
        : null;

    return (
        <section className="terminal-side-card">

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                    <div className="terminal-label">Nep geld traden</div>
                    <div className="terminal-side-title" style={{ marginTop: 2 }}>Oefen zonder echt geld</div>
                </div>
                <button
                    className="terminal-btn terminal-btn-muted"
                    onClick={() => setShowHelp(v => !v)}
                    style={{ fontSize: 11, padding: "3px 10px" }}
                >
                    {showHelp ? "Verberg uitleg" : "? Hoe werkt dit"}
                </button>
            </div>

            {/* Uitleg */}
            {showHelp && (
                <div className="paper-help-box">
                    <div className="paper-help-title">Wat is Paper Trading? 💡</div>
                    <p>Je traint hier met <strong>nep geld</strong> — precies zoals een echte trade, maar zonder dat je iets kunt verliezen. Perfect om te leren zonder risico.</p>
                    <ul>
                        <li><strong>Startkapitaal</strong> — het bedrag waarmee je begint, ingesteld door de admin</li>
                        <li><strong>Kopen</strong> — je &quot;koopt&quot; een stuk van de coin met nep geld. Kies een bedrag en klik op Kopen.</li>
                        <li><strong>Verkopen</strong> — je sluit de trade. Het verschil tussen jouw aankoopprijs en de huidige prijs = winst of verlies.</li>
                        <li><strong>Koopzone</strong> — de groene zone op de grafiek is het beste moment om te kopen. Als de prijs daarin staat, heb je meer kans op winst.</li>
                        <li><strong>P/L</strong> — Profit &amp; Loss = winst of verlies op je open positie</li>
                    </ul>
                    <div className="paper-help-title" style={{ marginTop: 10 }}>Hoe stel je een doel in? 🎯</div>
                    <p>Een doel helpt je te focussen. Stel jezelf een vraag: <em>&quot;Ik wil mijn startkapitaal laten groeien naar €X&quot;</em>. Stel het doel in via de knop hieronder. Als je doel haalt, zet je het hoger!</p>
                    <p style={{ marginTop: 4, color: "var(--text-secondary)", fontSize: 12 }}>Tip: begin realistisch. Met €10.000 starten en doel €11.000 = 10% groei. Dat is al heel goed!</p>
                </div>
            )}

            {/* Balans samenvatting */}
            <div className="terminal-paper-stats">
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">Cash beschikbaar</span>
                    <span className="terminal-mini-value">{eur(state.cash)}</span>
                </div>
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">Open positie</span>
                    <span className="terminal-mini-value">{state.openBtc > 0 ? eur(openValue) : "—"}</span>
                </div>
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">Winst/verlies open</span>
                    <span className="terminal-mini-value" style={{ color: unrealized >= 0 ? "#26c57c" : "#ef4444" }}>
                        {state.openBtc > 0 ? eur(unrealized) : "—"}
                    </span>
                </div>
                <div className="terminal-mini-box">
                    <span className="terminal-mini-label">Totaal balans</span>
                    <span className="terminal-mini-value" style={{ color: totalPnl >= 0 ? "#26c57c" : "#ef4444" }}>
                        {eur(totalBalance)}
                        <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.7 }}>
                            ({totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(1)}%)
                        </span>
                    </span>
                </div>
            </div>

            {/* Open positie info */}
            {state.openBtc > 0 && (
                <div className="paper-position-strip">
                    <span>📌 Open @ {state.avgEntry > 0 ? `$${Math.round(state.avgEntry).toLocaleString("en-US")}` : "—"}</span>
                    <span style={{ color: unrealized >= 0 ? "#26c57c" : "#ef4444" }}>
                        {unrealized >= 0 ? "▲" : "▼"} {eur(unrealized)}
                    </span>
                </div>
            )}

            {/* Doel tracker */}
            {goal !== null ? (
                <div className="paper-goal-strip">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>🎯 Doel: {eur(goal)}</span>
                        <button onClick={() => { setGoal(null); setGoalInput(""); }} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 11 }}>✕</button>
                    </div>
                    <div className="paper-goal-bar">
                        <div className="paper-goal-fill" style={{ width: `${Math.max(0, goalPct ?? 0)}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
                        {goalPct !== null && goalPct >= 100
                            ? "🎉 Doel behaald! Zet het hoger."
                            : `${Math.max(0, goalPct ?? 0).toFixed(0)}% naar doel`}
                    </div>
                </div>
            ) : showGoalInput ? (
                <div className="paper-goal-strip">
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                        Stel een doel in — bijv. €{(state.startCapital * 1.1).toFixed(0)} (10% groei)
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                        <input
                            className="terminal-terminal-input"
                            type="number"
                            placeholder={`bijv. ${Math.round(state.startCapital * 1.1)}`}
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
                    🎯 Stel een doel in
                </button>
            )}

            {/* Stop-loss info */}
            {stopLoss > 0 && (
                <div className="paper-stoploss-strip">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>🛑 Stop-loss niveau</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
                            ${Math.round(stopLoss).toLocaleString("en-US")}
                        </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span>Afstand: {currentPrice > 0 ? ((currentPrice - stopLoss) / currentPrice * 100).toFixed(1) : "—"}% onder huidige prijs</span>
                        <span>R/R verhouding: {riskRewardEstimate}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>
                        Als de prijs daalt naar <strong style={{ color: "#ef4444" }}>${Math.round(stopLoss).toLocaleString("en-US")}</strong>, sluit je de trade handmatig om verlies te beperken.
                        {Number(buyAmount) > 0 && stopLoss > 0 && currentPrice > 0 && (
                            <> Verlies bij stop: <strong style={{ color: "#ef4444" }}>
                                {eur(Number(buyAmount) * (currentPrice - stopLoss) / currentPrice)}
                            </strong></>
                        )}
                    </div>
                </div>
            )}

            {/* Koop sectie */}
            <div className="paper-buy-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label className="terminal-mini-label">Hoeveel wil je kopen? (€)</label>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        Beschikbaar: {eur(state.cash)}
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
                    placeholder="Bedrag in euro's"
                    style={{ marginTop: 8 }}
                />
            </div>

            {/* Actie knoppen */}
            <div className="terminal-paper-actions" style={{ marginTop: 10 }}>
                {confirmReset ? (
                    <>
                        <span style={{ fontSize: 12, color: "#ef4444", alignSelf: "center" }}>Alles wissen. Zeker?</span>
                        <button className="terminal-btn terminal-btn-danger" onClick={resetAccount}>Ja, opnieuw starten</button>
                        <button className="terminal-btn terminal-btn-muted" onClick={() => setConfirmReset(false)}>Annuleer</button>
                    </>
                ) : (
                    <>
                        <button
                            className="terminal-btn terminal-btn-primary"
                            onClick={() => openBuy()}
                            style={{ flex: 2, fontSize: 14, fontWeight: 700 }}
                            disabled={Number(buyAmount) > state.cash || Number(buyAmount) <= 0}
                        >
                            💰 Kopen
                        </button>
                        <button
                            className="terminal-btn"
                            onClick={closeTrade}
                            style={{ flex: 2, fontSize: 14, fontWeight: 700, borderColor: "#ef444455", color: state.openBtc > 0 ? "#ef4444" : undefined }}
                            disabled={state.openBtc <= 0}
                        >
                            📤 Verkopen
                        </button>
                        <button
                            className="terminal-btn terminal-btn-muted"
                            onClick={() => setConfirmReset(true)}
                            style={{ fontSize: 11 }}
                            title="Start opnieuw met je startkapitaal"
                        >
                            ↺
                        </button>
                    </>
                )}
            </div>

            {/* Uitleg knoppen */}
            <div className="paper-btn-hints">
                <span>💰 <strong>Kopen</strong> = je zet nep geld in de coin</span>
                <span>📤 <strong>Verkopen</strong> = sluit de trade, zie je winst/verlies</span>
            </div>

            {/* Zone waarschuwing */}
            {zoneWarning && (
                <div className="terminal-zone-warning">
                    <div className="terminal-zone-warning-title">⚠️ Prijs staat buiten de aanbevolen koopzone</div>
                    <div className="terminal-zone-warning-body">
                        De beste koopzone is <strong>${Math.round(entryZoneLow).toLocaleString("en-US")}–${Math.round(entryZoneHigh).toLocaleString("en-US")}</strong>.
                        Professionele traders kopen alleen op de juiste plek. Buiten de zone = meer risico.
                    </div>
                    <div className="terminal-paper-actions" style={{ marginTop: 8 }}>
                        <button className="terminal-btn terminal-btn-muted" onClick={() => setZoneWarning(false)}>Wachten</button>
                        <button className="terminal-btn terminal-btn-danger" onClick={() => openBuy(true)}>Toch kopen (meer risico)</button>
                    </div>
                </div>
            )}

            {/* Dagboek prompt na verkoop */}
            {pendingNoteId && (
                <div className="terminal-journal-prompt">
                    <div className="terminal-mini-label" style={{ marginBottom: 6 }}>
                        📓 Wat leerde je van deze trade? (optioneel)
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                        Schrijf op waarom je kocht, wat goed ging, en wat je de volgende keer anders doet. Dit maakt je sneller beter.
                    </div>
                    <textarea
                        className="terminal-journal-textarea"
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Bijv: 'Kocht te vroeg buiten de zone. Volgende keer wachten op bevestiging.'"
                        rows={3}
                        autoFocus
                    />
                    <div className="terminal-paper-actions" style={{ marginTop: 6 }}>
                        <button className="terminal-btn terminal-btn-muted" onClick={() => setPendingNoteId(null)}>Overslaan</button>
                        <button className="terminal-btn terminal-btn-primary" onClick={saveNote}>Opslaan 📓</button>
                    </div>
                </div>
            )}

            {/* Stats */}
            {closedCount > 0 && (
                <div className="terminal-progress-grid" style={{ marginTop: 12 }}>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">Winrate</span>
                        <span className="terminal-progress-value" style={{ color: winrate >= 50 ? "#26c57c" : "#ef4444" }}>
                            {winrate.toFixed(0)}%
                        </span>
                        <span className="terminal-progress-sub">{winCount}W / {lossCount}L</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">Totaal P/L</span>
                        <span className="terminal-progress-value" style={{ color: state.realizedPnl >= 0 ? "#26c57c" : "#ef4444" }}>
                            {eur(state.realizedPnl)}
                        </span>
                        <span className="terminal-progress-sub">gesloten trades</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">Gem. winst</span>
                        <span className="terminal-progress-value" style={{ color: "#26c57c" }}>
                            {avgWin > 0 ? eur(avgWin) : "—"}
                        </span>
                        <span className="terminal-progress-sub">per winst</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">Gem. verlies</span>
                        <span className="terminal-progress-value" style={{ color: "#ef4444" }}>
                            {avgLoss < 0 ? eur(avgLoss) : "—"}
                        </span>
                        <span className="terminal-progress-sub">per verlies</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">Reeks</span>
                        <span className="terminal-progress-value" style={{ color: streakType === "win" ? "#26c57c" : streakType === "loss" ? "#ef4444" : "#8b95ad" }}>
                            {currentStreak > 0 ? `${currentStreak}× ${streakType === "win" ? "🔥" : "❄️"}` : "—"}
                        </span>
                        <span className="terminal-progress-sub">op rij</span>
                    </div>
                    <div className="terminal-progress-box">
                        <span className="terminal-progress-label">Beste trade</span>
                        <span className="terminal-progress-value" style={{ color: "#26c57c" }}>
                            {bestTrade ? eur(bestTrade.pnl || 0) : "—"}
                        </span>
                        <span className="terminal-progress-sub">slechtste: {worstTrade ? eur(worstTrade.pnl || 0) : "—"}</span>
                    </div>
                </div>
            )}

            {/* Trade geschiedenis */}
            <details className="terminal-history">
                <summary>
                    Trade geschiedenis
                    {state.trades.length > 0 && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-secondary)" }}>({state.trades.length} trades)</span>}
                </summary>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: "6px 0", marginBottom: 4 }}>
                    Elke aankoop en verkoop staat hier. Groene P/L = winst, rode P/L = verlies.
                </div>
                <div className="terminal-history-list">
                    {state.trades.length === 0 && (
                        <div className="terminal-history-item" style={{ color: "var(--text-secondary)" }}>
                            Nog geen trades. Klik op &quot;Kopen&quot; om je eerste trade te doen!
                        </div>
                    )}
                    {state.trades.map((trade) => (
                        <div key={trade.id} className="terminal-history-item">
                            <strong style={{ color: trade.side === "buy" ? "#26c57c" : "#ef4444" }}>
                                {trade.side === "buy" ? "✅ Koop" : "📤 Verkoop"}
                            </strong>
                            {" "}&bull;{" "}{trade.time} &bull; {eur(trade.amountEur)}
                            {" "}&bull; prijs ${trade.price.toFixed(0)}
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
