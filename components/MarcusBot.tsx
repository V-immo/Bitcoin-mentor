"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Play, Pause, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type BotConfig = {
  amount_eur?: number;
  interval_minutes?: number;
  buy_below?: number;
  sell_above?: number;
  resistance?: number;
};

type Bot = {
  id: number;
  name: string;
  strategy: string;
  config: BotConfig;
  exchange: string;
  symbol: string;
  active: boolean;
  created_at: string;
};

type BotRun = {
  id: number;
  action: string;
  symbol: string;
  side: string;
  amount: number;
  price: number;
  status: string;
  note: string;
  created_at: string;
};

type StrategyDef = {
  key: string;
  labelNL: string;
  labelEN: string;
  descNL: string;
  descEN: string;
  type: "longterm" | "swing" | "day";
  typeLabelNL: string;
  typeLabelEN: string;
};

const STRATEGIES: StrategyDef[] = [
  // ─── Lang termijn ───────────────────────────────────────────────────────────
  {
    key: "dca",
    labelNL: "DCA — Periodiek kopen",
    labelEN: "DCA — Periodic buying",
    descNL: "Koop automatisch een vast bedrag op vaste tijdstippen. Simpelste lange-termijn aanpak.",
    descEN: "Automatically buy a fixed amount at fixed intervals. Simplest long-term approach.",
    type: "longterm",
    typeLabelNL: "Lang termijn",
    typeLabelEN: "Long term",
  },
  {
    key: "ema200",
    labelNL: "EMA200 — Trend volgen",
    labelEN: "EMA200 — Trend following",
    descNL: "Koop als prijs boven EMA200 ligt (uptrend), verkoop als prijs eronder zakt.",
    descEN: "Buy when price is above EMA200 (uptrend), sell when it drops below.",
    type: "longterm",
    typeLabelNL: "Lang termijn",
    typeLabelEN: "Long term",
  },
  // ─── Swing trading ──────────────────────────────────────────────────────────
  {
    key: "rsi",
    labelNL: "RSI — Oversold/Overbought",
    labelEN: "RSI — Oversold/Overbought",
    descNL: "Koop als RSI < drempel (oversold), verkoop als RSI > drempel (overbought). 4H candles.",
    descEN: "Buy when RSI < threshold (oversold), sell when RSI > threshold (overbought). 4H candles.",
    type: "swing",
    typeLabelNL: "Swing trading",
    typeLabelEN: "Swing trading",
  },
  {
    key: "breakout",
    labelNL: "Breakout — Weerstand doorbreken",
    labelEN: "Breakout — Resistance break",
    descNL: "Koop zodra de prijs boven jouw weerstandsniveau uitkomt. Klassieke swing-entry.",
    descEN: "Buy when price breaks above your resistance level. Classic swing entry.",
    type: "swing",
    typeLabelNL: "Swing trading",
    typeLabelEN: "Swing trading",
  },
  {
    key: "pullback",
    labelNL: "Pullback — Terugval naar EMA50",
    labelEN: "Pullback — Retrace to EMA50",
    descNL: "Koop als prijs terugvalt naar de EMA50 in een bestaande uptrend.",
    descEN: "Buy when price pulls back to EMA50 in an existing uptrend.",
    type: "swing",
    typeLabelNL: "Swing trading",
    typeLabelEN: "Swing trading",
  },
  // ─── Day trading ────────────────────────────────────────────────────────────
  {
    key: "ema_cross",
    labelNL: "EMA Cross — 9/21 kruising",
    labelEN: "EMA Cross — 9/21 crossover",
    descNL: "Koop als EMA9 EMA21 omhoog kruist, verkoop als EMA9 omlaag kruist. 1H candles.",
    descEN: "Buy when EMA9 crosses EMA21 upward, sell when it crosses down. 1H candles.",
    type: "day",
    typeLabelNL: "Day trading",
    typeLabelEN: "Day trading",
  },
  {
    key: "macd",
    labelNL: "MACD — Signaal kruising",
    labelEN: "MACD — Signal crossover",
    descNL: "Koop als MACD lijn signaallijn kruist (bullish), verkoop bij bearish kruising. 1H.",
    descEN: "Buy when MACD line crosses signal line (bullish), sell on bearish cross. 1H.",
    type: "day",
    typeLabelNL: "Day trading",
    typeLabelEN: "Day trading",
  },
];

const SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "ADA", "BNB"];

function BotCard({ bot, onToggle, onDelete, isNL }: {
  bot: Bot;
  onToggle: (id: number, active: boolean) => void;
  onDelete: (id: number) => void;
  isNL: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [runs, setRuns] = useState<BotRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const strat = STRATEGIES.find(s => s.key === bot.strategy);

  async function loadRuns() {
    if (loadingRuns) return;
    setLoadingRuns(true);
    const res = await fetch(`/api/bots/${bot.id}/runs`);
    const data = await res.json() as BotRun[];
    setRuns(data);
    setLoadingRuns(false);
  }

  function toggle() {
    setOpen(v => {
      if (!v) loadRuns();
      return !v;
    });
  }

  const stratLabel = strat ? (isNL ? strat.labelNL : strat.labelEN) : bot.strategy;

  return (
    <div className={`bot-card ${bot.active ? "bot-card--active" : ""}`}>
      <div className="bot-card-header" onClick={toggle}>
        <div className="bot-card-info">
          <span className={`bot-status-dot ${bot.active ? "bot-status-dot--on" : ""}`} />
          <span className="bot-card-name">{bot.name}</span>
          <span className="bot-card-meta">{bot.symbol} · {stratLabel}</span>
        </div>
        <div className="bot-card-actions" onClick={e => e.stopPropagation()}>
          <button
            className={`bot-toggle-btn ${bot.active ? "bot-toggle-btn--pause" : "bot-toggle-btn--play"}`}
            onClick={() => onToggle(bot.id, !bot.active)}
            title={bot.active ? (isNL ? "Pauzeren" : "Pause") : (isNL ? "Starten" : "Start")}
          >
            {bot.active ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            className="bot-delete-btn"
            onClick={() => onDelete(bot.id)}
            title={isNL ? "Verwijderen" : "Delete"}
          >
            <Trash2 size={14} />
          </button>
          <button className="bot-expand-btn" onClick={toggle}>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="bot-card-body">
          <div className="bot-config-grid">
            {bot.config.amount_eur !== undefined && (
              <div className="bot-config-item">
                <span className="bot-config-label">{isNL ? "Bedrag" : "Amount"}</span>
                <span className="bot-config-value">€{bot.config.amount_eur}</span>
              </div>
            )}
            {bot.strategy === "dca" && bot.config.interval_minutes !== undefined && (
              <div className="bot-config-item">
                <span className="bot-config-label">{isNL ? "Interval" : "Interval"}</span>
                <span className="bot-config-value">
                  {bot.config.interval_minutes >= 1440
                    ? `${bot.config.interval_minutes / 1440} ${isNL ? "dag(en)" : "day(s)"}`
                    : `${bot.config.interval_minutes} min`}
                </span>
              </div>
            )}
            {bot.strategy === "rsi" && (
              <>
                <div className="bot-config-item">
                  <span className="bot-config-label">{isNL ? "Koop onder RSI" : "Buy below RSI"}</span>
                  <span className="bot-config-value">{bot.config.buy_below}</span>
                </div>
                <div className="bot-config-item">
                  <span className="bot-config-label">{isNL ? "Verkoop boven RSI" : "Sell above RSI"}</span>
                  <span className="bot-config-value">{bot.config.sell_above}</span>
                </div>
              </>
            )}
            {bot.strategy === "breakout" && bot.config.resistance !== undefined && (
              <div className="bot-config-item">
                <span className="bot-config-label">{isNL ? "Weerstand (EUR)" : "Resistance (EUR)"}</span>
                <span className="bot-config-value">€{bot.config.resistance.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="bot-runs">
            <div className="bot-runs-title">{isNL ? "Recente uitvoeringen" : "Recent executions"}</div>
            {loadingRuns && <div className="bot-runs-empty">…</div>}
            {!loadingRuns && runs.length === 0 && (
              <div className="bot-runs-empty">
                {isNL ? "Nog geen uitvoeringen" : "No executions yet"}
              </div>
            )}
            {runs.map(run => (
              <div key={run.id} className={`bot-run-row ${run.status === "error" ? "bot-run-row--error" : ""}`}>
                <span className="bot-run-time">
                  {new Date(run.created_at).toLocaleDateString(isNL ? "nl-BE" : "en-GB", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                  })}
                </span>
                <span className={`bot-run-side ${run.side === "buy" ? "bot-run-side--buy" : "bot-run-side--sell"}`}>
                  {run.side === "buy" ? "▲" : "▼"} {run.action}
                </span>
                <span className="bot-run-amount">€{run.amount}</span>
                <span className={`bot-run-status ${run.status === "error" ? "bot-run-status--error" : "bot-run-status--ok"}`}>
                  {run.status === "error" ? "✗" : "✓"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateBotModal({ onClose, onCreate, isNL }: {
  onClose: () => void;
  onCreate: () => void;
  isNL: boolean;
}) {
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState("dca");
  const [symbol, setSymbol] = useState("BTC");
  const [amountEur, setAmountEur] = useState(50);
  const [intervalMinutes, setIntervalMinutes] = useState(1440);
  const [buyBelow, setBuyBelow] = useState(30);
  const [sellAbove, setSellAbove] = useState(70);
  const [resistance, setResistance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strat = STRATEGIES.find(s => s.key === strategy);

  async function submit() {
    if (!name.trim()) { setError(isNL ? "Geef je bot een naam" : "Give your bot a name"); return; }
    setLoading(true);
    setError("");

    const config: BotConfig = { amount_eur: amountEur };
    if (strategy === "dca")      config.interval_minutes = intervalMinutes;
    if (strategy === "rsi")      { config.buy_below = buyBelow; config.sell_above = sellAbove; }
    if (strategy === "breakout") config.resistance = resistance;

    const res = await fetch("/api/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), strategy, config, exchange: "bitvavo", symbol }),
    });
    const data = await res.json() as { id?: number; error?: string };
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    onCreate();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box bot-create-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isNL ? "Nieuwe bot aanmaken" : "Create new bot"}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="bot-form">
          <label className="bot-label">{isNL ? "Naam" : "Name"}</label>
          <input
            className="bot-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={isNL ? "Mijn DCA bot" : "My DCA bot"}
            maxLength={40}
          />

          <label className="bot-label">{isNL ? "Munt" : "Asset"}</label>
          <div className="bot-symbol-grid">
            {SYMBOLS.map(s => (
              <button
                key={s}
                className={`bot-symbol-btn ${symbol === s ? "bot-symbol-btn--active" : ""}`}
                onClick={() => setSymbol(s)}
              >{s}</button>
            ))}
          </div>

          <label className="bot-label">{isNL ? "Strategie" : "Strategy"}</label>
          {(["longterm", "swing", "day"] as const).map(type => {
            const group = STRATEGIES.filter(s => s.type === type);
            const groupLabel = isNL ? group[0].typeLabelNL : group[0].typeLabelEN;
            return (
              <div key={type} className="bot-strat-group">
                <div className="bot-strat-group-label">{groupLabel}</div>
                <div className="bot-strat-grid">
                  {group.map(s => (
                    <button
                      key={s.key}
                      className={`bot-strat-btn ${strategy === s.key ? "bot-strat-btn--active" : ""}`}
                      onClick={() => setStrategy(s.key)}
                    >
                      <span className="bot-strat-label">{isNL ? s.labelNL : s.labelEN}</span>
                      <span className="bot-strat-desc">{isNL ? s.descNL : s.descEN}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <label className="bot-label">{isNL ? "Bedrag per order (EUR)" : "Amount per order (EUR)"}</label>
          <input
            className="bot-input"
            type="number"
            min={5}
            max={10000}
            value={amountEur}
            onChange={e => setAmountEur(Number(e.target.value))}
          />

          {strategy === "dca" && (
            <>
              <label className="bot-label">{isNL ? "Interval" : "Interval"}</label>
              <select className="bot-input" value={intervalMinutes} onChange={e => setIntervalMinutes(Number(e.target.value))}>
                <option value={60}>{isNL ? "Elk uur" : "Every hour"}</option>
                <option value={360}>{isNL ? "Elke 6 uur" : "Every 6 hours"}</option>
                <option value={720}>{isNL ? "Elke 12 uur" : "Every 12 hours"}</option>
                <option value={1440}>{isNL ? "Elke dag" : "Every day"}</option>
                <option value={10080}>{isNL ? "Elke week" : "Every week"}</option>
              </select>
            </>
          )}

          {strategy === "rsi" && (
            <>
              <label className="bot-label">{isNL ? "Koop als RSI onder" : "Buy when RSI below"}</label>
              <input className="bot-input" type="number" min={10} max={50} value={buyBelow} onChange={e => setBuyBelow(Number(e.target.value))} />
              <label className="bot-label">{isNL ? "Verkoop als RSI boven" : "Sell when RSI above"}</label>
              <input className="bot-input" type="number" min={50} max={90} value={sellAbove} onChange={e => setSellAbove(Number(e.target.value))} />
            </>
          )}

          {strategy === "breakout" && (
            <>
              <label className="bot-label">{isNL ? "Weerstandsniveau (EUR)" : "Resistance level (EUR)"}</label>
              <input className="bot-input" type="number" min={0} value={resistance} onChange={e => setResistance(Number(e.target.value))} />
            </>
          )}

          {strat && (
            <div className="bot-strat-tip">
              ◉ {isNL ? strat.descNL : strat.descEN}
            </div>
          )}

          {error && <div className="bot-error">{error}</div>}

          <button className="bot-create-btn" onClick={submit} disabled={loading}>
            {loading ? "…" : (isNL ? "Bot aanmaken" : "Create bot")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MarcusBot({ isPro }: { isPro: boolean }) {
  const { lang } = useLanguage();
  const isNL = lang === "nl";
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadBots = useCallback(async () => {
    const res = await fetch("/api/bots");
    const data = await res.json() as Bot[];
    setBots(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadBots(); }, [loadBots]);

  async function toggleBot(id: number, active: boolean) {
    await fetch(`/api/bots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    loadBots();
  }

  async function deleteBot(id: number) {
    if (!confirm(isNL ? "Bot verwijderen?" : "Delete bot?")) return;
    await fetch(`/api/bots/${id}`, { method: "DELETE" });
    loadBots();
  }

  if (!isPro) {
    return (
      <div className="bot-upgrade-wall">
        <div className="bot-upgrade-icon">◉</div>
        <h2 className="bot-upgrade-title">Playbook</h2>
        <p className="bot-upgrade-text">
          {isNL
            ? "Jouw trading strategieën in één Playbook. DCA, RSI, breakout, EMA crossover — automatisch uitgevoerd op jouw account."
            : "Your trading strategies in one Playbook. DCA, RSI, breakout, EMA crossover — executed automatically on your account."}
        </p>
        <a href="/pro" className="bot-upgrade-btn">
          {isNL ? "Upgrade naar PRO →" : "Upgrade to PRO →"}
        </a>
      </div>
    );
  }

  return (
    <div className="marcus-bot">
      <div className="bot-header">
        <div>
          <h2 className="bot-title">Playbook</h2>
          <p className="bot-subtitle">
            {isNL
              ? "Jouw automatische trading strategieën."
              : "Your automated trading strategies."}
          </p>
        </div>
        <button className="bot-new-btn" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          {isNL ? "Nieuwe bot" : "New bot"}
        </button>
      </div>

      {loading && <div className="bot-loading">…</div>}

      {!loading && bots.length === 0 && (
        <div className="bot-empty">
          <div className="bot-empty-icon">◉</div>
          <p className="bot-empty-text">
            {isNL
              ? "Nog geen bots. Maak je eerste strategie aan."
              : "No bots yet. Create your first strategy."}
          </p>
          <button className="bot-new-btn" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {isNL ? "Eerste bot aanmaken" : "Create first bot"}
          </button>
        </div>
      )}

      <div className="bot-list">
        {bots.map(bot => (
          <BotCard
            key={bot.id}
            bot={bot}
            onToggle={toggleBot}
            onDelete={deleteBot}
            isNL={isNL}
          />
        ))}
      </div>

      <div className="bot-disclaimer">
        {isNL
          ? "Playbook handelt via jouw eigen API-sleutel op jouw exchange account. Stel je sleutel in via Instellingen."
          : "Playbook trades via your own API key on your exchange account. Configure your key in Settings."}
      </div>

      {showCreate && (
        <CreateBotModal
          onClose={() => setShowCreate(false)}
          onCreate={loadBots}
          isNL={isNL}
        />
      )}
    </div>
  );
}
