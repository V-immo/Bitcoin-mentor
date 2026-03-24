"use client";

import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  currentPrice: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  resistanceZoneLow: number;
  resistanceZoneHigh: number;
  status: string;
  action: string;
  livePriceConnected: boolean;
  liveCandleConnected: boolean;
  lastTickLabel: string;
  tickKey: number;
};

function getColorClass(status: string) {
  if (status === "Goed moment") return "green";
  if (status === "Nog even wachten") return "orange";
  return "red";
}

export default function LiveSimpleMode({
  currentPrice,
  entryZoneLow,
  entryZoneHigh,
  stopLoss,
  resistanceZoneLow,
  resistanceZoneHigh,
  status,
  action,
  livePriceConnected,
  liveCandleConnected,
  lastTickLabel,
  tickKey,
}: Props) {
  const { t } = useLanguage();

  const maxValue = Math.max(currentPrice, resistanceZoneHigh, entryZoneHigh);
  const minValue = Math.min(
    currentPrice,
    stopLoss,
    entryZoneLow,
    resistanceZoneLow
  );
  const range = Math.max(maxValue - minValue, 1);

  function getPosition(value: number) {
    const pct = ((maxValue - value) / range) * 100;
    return Math.min(100, Math.max(0, pct));
  }

  const currentTop = getPosition(currentPrice);
  const entryTop = getPosition(entryZoneHigh);
  const entryBottom = getPosition(entryZoneLow);
  const stopTop = getPosition(stopLoss);
  const resistanceTop = getPosition(resistanceZoneHigh);
  const resistanceBottom = getPosition(resistanceZoneLow);

  return (
    <section className="warm-hero-shell">
      <div className="warm-hero-left card">
        <div className="label">{t("live_bitcoin_now")}</div>
        <div className="big-live-price" key={tickKey}>
          ${currentPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </div>

        <div className="warm-status-badge-row">
          <div className={`warm-status-badge ${getColorClass(status)}`}>
            {status === "Goed moment" ? t("status_good_moment")
              : status === "Nog even wachten" ? t("status_wait")
              : t("status_no_buy")}
          </div>
          <div className="warm-action-chip">
            {action === "Kleine koop mogelijk" ? t("action_small_buy")
              : action === "Wacht op betere prijs" ? t("action_wait_price")
              : t("action_no_buy")}
          </div>
        </div>

        <div className="live-status-row">
          <div className="live-pill">
            <span
              className={`live-dot ${livePriceConnected ? "live-on" : "live-off"}`}
            />
            {t("live_price_label")} {livePriceConnected ? t("live_price_connected") : t("live_price_offline")}
          </div>

          <div className="live-pill">
            <span
              className={`live-dot ${liveCandleConnected ? "live-on" : "live-off"}`}
            />
            {t("live_candle_label")} {liveCandleConnected ? t("live_price_connected") : t("live_price_offline")}
          </div>

          <div className="live-pill">{t("live_last_tick")} {lastTickLabel || "-"}</div>
        </div>
      </div>

      <div className="warm-hero-right card">
        <div className="label">{t("live_safe_label")}</div>
        <div className="warm-safety-title">
          {t("live_safe_title")}
        </div>

        <div className="warm-safety-list">
          <div className="warm-safety-item">
            {t("live_safe_item1")}
          </div>
          <div className="warm-safety-item">
            {t("live_safe_item2")}
          </div>
          <div className="warm-safety-item">
            {t("live_safe_item3")}
          </div>
          <div className="warm-safety-item">
            {t("live_safe_item4")}
          </div>
        </div>
      </div>

      <div className="warm-zone-board card">
        <div className="label">{t("live_read_label")}</div>
        <div className="warm-zone-board-text">
          {t("live_zone_text")}
        </div>

        <div className="simple-mode-chart-wrap" style={{ marginTop: 14 }}>
          <div className="simple-mode-axis">
            <div
              className="simple-zone resistance-zone"
              style={{
                top: `${resistanceTop}%`,
                height: `${Math.max(10, resistanceBottom - resistanceTop)}%`,
              }}
            >
              <span>{t("live_resistance")}</span>
              <strong>
                ${Math.round(resistanceZoneLow).toLocaleString("en-US")} - $
                {Math.round(resistanceZoneHigh).toLocaleString("en-US")}
              </strong>
            </div>

            <div
              className="simple-zone entry-zone"
              style={{
                top: `${entryTop}%`,
                height: `${Math.max(10, entryBottom - entryTop)}%`,
              }}
            >
              <span>{t("live_entry_zone")}</span>
              <strong>
                ${Math.round(entryZoneLow).toLocaleString("en-US")} - $
                {Math.round(entryZoneHigh).toLocaleString("en-US")}
              </strong>
            </div>

            <div className="simple-line stop-line" style={{ top: `${stopTop}%` }}>
              <span>{t("live_stop_loss")}</span>
              <strong>${Math.round(stopLoss).toLocaleString("en-US")}</strong>
            </div>

            <div
              className="simple-line current-line"
              style={{ top: `${currentTop}%` }}
            >
              <span>{t("live_current")}</span>
              <strong>${Math.round(currentPrice).toLocaleString("en-US")}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
