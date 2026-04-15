"use client";

import { useEffect, useRef, useState } from "react";
import type { MentorSignal, TradeBrief } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  signal: MentorSignal;
  currentPrice: number;
  asset: string;
  signalReady: boolean;
  onExecuteTrade: (amountEur: number) => void;
};

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function eur(n: number) {
  return n.toLocaleString("nl-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export default function TradePartnerPanel({ signal, currentPrice, asset, signalReady, onExecuteTrade }: Props) {
  const { t } = useLanguage();
  const [brief, setBrief] = useState<TradeBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [tradeAmount, setTradeAmount] = useState("1000");
  const lastFetchKey = useRef("");

  async function fetchBrief(amount = Number(tradeAmount) || 1000) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/trade-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal, asset, currentPrice, tradeAmountEur: amount }),
      });
      if (res.ok) {
        const data = await res.json();
        setBrief(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  // Auto-fetch wanneer signaal van het juiste asset geladen is
  useEffect(() => {
    if (!signalReady) return;
    const key = `${asset}-${signal.score}-${Math.round(signal.price)}`;
    if (key === lastFetchKey.current) return;
    lastFetchKey.current = key;
    fetchBrief();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal.price, signal.score, asset, signalReady]);

  function handleExecute() {
    if (!brief || brief.decision !== "long") return;
    const amount = Number(tradeAmount) || 1000;
    onExecuteTrade(amount);
    setExecuted(true);
    setTimeout(() => setExecuted(false), 4000);
  }

  const ticker = asset.includes("USDT") ? asset.replace("USDT", "") : asset;
  const isLong = brief?.decision === "long";

  return (
    <section className="terminal-side-card">
      <div className="terminal-label">{t("partner_label")}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, lineHeight: 1.5 }}>
        {t("partner_desc")}
      </div>
      <div className="terminal-side-title" style={{ marginBottom: 0 }}>
        {!brief && !loading && t("partner_waiting")}
        {loading && t("partner_loading")}
        {brief && !loading && (
          <span style={{ color: isLong ? "var(--green)" : "var(--orange)", fontWeight: 700 }}>
            {isLong
              ? `${t("partner_long")} ${ticker}`
              : `${t("partner_skip")} ${ticker}${t("partner_skip_suffix") ? " " + t("partner_skip_suffix") : ""}`}
          </span>
        )}
      </div>

      {brief && !loading && (
        <>
          {/* Levels */}
          <div className="terminal-paper-stats" style={{ marginTop: 10 }}>
            <div className="terminal-mini-box">
              <span className="terminal-mini-label">{t("partner_entry")}</span>
              <span className="terminal-mini-value">${fmt(brief.entryPrice, 0)}</span>
            </div>
            <div className="terminal-mini-box">
              <span className="terminal-mini-label">Stop-loss</span>
              <span className="terminal-mini-value" style={{ color: "var(--red)" }}>${fmt(brief.stopLoss, 0)}</span>
            </div>
            <div className="terminal-mini-box">
              <span className="terminal-mini-label">{t("partner_target")}</span>
              <span className="terminal-mini-value" style={{ color: "var(--green)" }}>${fmt(brief.target, 0)}</span>
            </div>
            <div className="terminal-mini-box">
              <span className="terminal-mini-label">R/R</span>
              <span className="terminal-mini-value">1:{brief.riskRewardRatio}</span>
            </div>
          </div>

          {/* Euro amounts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
            <div className="terminal-mini-box" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
              <span className="terminal-mini-label">{t("partner_risk")}</span>
              <span className="terminal-mini-value" style={{ color: "var(--red)" }}>−{eur(brief.riskEur)}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{t("partner_if_stop")}</span>
            </div>
            <div className="terminal-mini-box" style={{ borderColor: "rgba(38,197,124,0.2)" }}>
              <span className="terminal-mini-label">{t("partner_expected_profit")}</span>
              <span className="terminal-mini-value" style={{ color: "var(--green)" }}>+{eur(brief.expectedProfitEur)}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{t("partner_if_target")}</span>
            </div>
          </div>

          {/* Explanation sections */}
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="trade-partner-section">
              <div className="trade-partner-label">{t("partner_why_now")}</div>
              <div className="trade-partner-text">{brief.waaromNu}</div>
            </div>
            <div className="trade-partner-section">
              <div className="trade-partner-label">{t("partner_when_exit")}</div>
              <div className="trade-partner-text">{brief.wanneerUitStappen}</div>
            </div>
            <div className="trade-partner-section" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
              <div className="trade-partner-label" style={{ color: "var(--red)" }}>{t("partner_biggest_risk")}</div>
              <div className="trade-partner-text">{brief.grootsteRisico}</div>
            </div>
            <div className="trade-partner-section">
              <div className="trade-partner-label">{t("partner_expected_scenario")}</div>
              <div className="trade-partner-text">{brief.verwachtScenario}</div>
              {brief.tijdshorizon && (
                <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>{t("partner_time_horizon")} {brief.tijdshorizon}</div>
              )}
            </div>
          </div>

          {/* Action */}
          {isLong && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <label className="terminal-mini-label" style={{ whiteSpace: "nowrap" }}>{t("partner_amount_label")}</label>
                <input
                  className="terminal-terminal-input"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  inputMode="decimal"
                  style={{ flex: 1 }}
                />
              </div>
              <button
                className="terminal-btn terminal-btn-green"
                onClick={handleExecute}
                style={{ width: "100%", fontWeight: 700, fontSize: 13 }}
              >
                {t("partner_open_trade")} ({eur(Number(tradeAmount) || 1000)})
              </button>
              {executed && (
                <div className="trade-partner-executed">
                  {t("partner_executed")}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {loading && (
        <div style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
          {t("partner_analysing")}
        </div>
      )}

      <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
        <button
          className="terminal-btn terminal-btn-muted"
          onClick={() => fetchBrief(Number(tradeAmount) || 1000)}
          disabled={loading}
          style={{ flex: 1, fontSize: 12 }}
        >
          {loading ? `⟳ ${t("loading")}` : t("partner_reanalyse")}
        </button>
      </div>

      <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
        {t("partner_disclaimer")}
      </div>
    </section>
  );
}
