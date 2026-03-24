"use client";

import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  status: string;
  action: string;
  currentPrice: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  resistanceZoneLow: number;
  resistanceZoneHigh: number;
  riskRewardEstimate: number;
  score: number;
  setupGrade: string;
  blockers: string[];
  warnings: string[];
  trend4h: string;
  trend1h: string;
  structure4h: string;
  rsi4h: number;
  liveMode: boolean;
  lastTickLabel: string;
};

export default function AITradeCoach({
  status,
  action,
  currentPrice,
  entryZoneLow,
  entryZoneHigh,
  stopLoss,
  resistanceZoneLow,
  resistanceZoneHigh,
  riskRewardEstimate,
  score,
  setupGrade,
  blockers,
  warnings,
  trend4h,
  trend1h,
  structure4h,
  rsi4h,
  liveMode,
  lastTickLabel,
}: Props) {
  const { t } = useLanguage();

  function getConfidence(s: number, grade: string) {
    if (grade === "A" && s >= 72) return t("coach_confidence_high");
    if (grade === "B" || grade === "C") return t("coach_confidence_mid");
    return t("coach_confidence_low");
  }

  const coach = useMemo(() => {
    const inBuyZone =
      currentPrice >= entryZoneLow && currentPrice <= entryZoneHigh;
    const aboveBuyZone = currentPrice > entryZoneHigh;
    const belowBuyZone = currentPrice < entryZoneLow;

    let headline = "";
    let verdict = "";
    let bestAction = "";
    let biggestMistake = "";
    let lesson = "";
    let marketTone = "";
    let simpleTranslation = "";

    if (blockers.length > 0) {
      headline = t("coach_no_buy_headline");
      verdict = t("coach_no_buy_verdict");
      bestAction = t("coach_no_buy_action");
      biggestMistake = t("coach_no_buy_mistake");
      lesson = t("coach_no_buy_lesson");
      simpleTranslation = t("coach_no_buy_simple");
    } else if (status === "Goed moment" && inBuyZone) {
      headline = t("coach_entry_headline");
      verdict = t("coach_entry_verdict");
      bestAction = t("coach_entry_action");
      biggestMistake = t("coach_entry_mistake");
      lesson = t("coach_entry_lesson");
      simpleTranslation = t("coach_entry_simple");
    } else if (status === "Nog even wachten" && aboveBuyZone) {
      headline = t("coach_fomo_headline");
      verdict = t("coach_fomo_verdict");
      bestAction =
        `${t("coach_fomo_action_prefix")} ${Math.round(
          entryZoneLow
        ).toLocaleString("en-US")} - ${Math.round(entryZoneHigh).toLocaleString(
          "en-US"
        )} ${t("coach_fomo_action_suffix")}`;
      biggestMistake = t("coach_fomo_mistake");
      lesson = t("coach_fomo_lesson");
      simpleTranslation = t("coach_fomo_simple");
    } else if (belowBuyZone) {
      headline = t("coach_below_headline");
      verdict = t("coach_below_verdict");
      bestAction = t("coach_below_action");
      biggestMistake = t("coach_below_mistake");
      lesson = t("coach_below_lesson");
      simpleTranslation = t("coach_below_simple");
    } else {
      headline = t("coach_default_headline");
      verdict = t("coach_default_verdict");
      bestAction = t("coach_default_action");
      biggestMistake = t("coach_default_mistake");
      lesson = t("coach_default_lesson");
      simpleTranslation = t("coach_default_simple");
    }

    if (trend4h === "bullish" && structure4h === "bullish") {
      marketTone = t("coach_tone_bull");
    } else if (trend4h === "bearish" || structure4h === "bearish") {
      marketTone = t("coach_tone_bear");
    } else {
      marketTone = t("coach_tone_mixed");
    }

    return {
      headline,
      verdict,
      bestAction,
      biggestMistake,
      lesson,
      marketTone,
      simpleTranslation,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    blockers,
    status,
    currentPrice,
    entryZoneLow,
    entryZoneHigh,
    trend4h,
    structure4h,
  ]);

  const confidence = useMemo(
    () => getConfidence(score, setupGrade),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [score, setupGrade]
  );

  return (
    <div className="mentor-hero-card">
      <div className="mentor-hero-top">
        <div>
          <div className="label">{t("coach_label")}</div>
          <div className="mentor-hero-title">{coach.headline}</div>
        </div>

        <div className="mentor-live-pill">
          {liveMode ? t("coach_live") : t("coach_last_analysis")}
          {lastTickLabel ? ` • ${lastTickLabel}` : ""}
        </div>
      </div>

      <div className="mentor-summary-row">
        <div className="mentor-summary-box">
          <span className="mentor-summary-label">{t("coach_status")}</span>
          <span className="mentor-summary-value">
            {status === "Goed moment" ? t("status_good_moment")
              : status === "Nog even wachten" ? t("status_wait")
              : t("status_no_buy")}
          </span>
        </div>

        <div className="mentor-summary-box">
          <span className="mentor-summary-label">{t("coach_action")}</span>
          <span className="mentor-summary-value">
            {action === "Kleine koop mogelijk" ? t("action_small_buy")
              : action === "Wacht op betere prijs" ? t("action_wait_price")
              : t("action_no_buy")}
          </span>
        </div>

        <div className="mentor-summary-box">
          <span className="mentor-summary-label">{t("coach_confidence")}</span>
          <span className="mentor-summary-value">{confidence}</span>
        </div>

        <div className="mentor-summary-box">
          <span className="mentor-summary-label">{t("coach_grade")}</span>
          <span className="mentor-summary-value">{setupGrade}</span>
        </div>
      </div>

      <div className="mentor-main-grid">
        <div className="mentor-main-box">
          <div className="mentor-main-label">{t("coach_verdict_label")}</div>
          <div className="mentor-main-text">{coach.verdict}</div>
        </div>

        <div className="mentor-main-box">
          <div className="mentor-main-label">{t("coach_best_action_label")}</div>
          <div className="mentor-main-text">{coach.bestAction}</div>
        </div>

        <div className="mentor-main-box">
          <div className="mentor-main-label">{t("coach_biggest_mistake_label")}</div>
          <div className="mentor-main-text">{coach.biggestMistake}</div>
        </div>

        <div className="mentor-main-box">
          <div className="mentor-main-label">{t("coach_lesson_label")}</div>
          <div className="mentor-main-text">{coach.lesson}</div>
        </div>
      </div>

      <div className="mentor-soft-strip">
        <div className="mentor-soft-item">{coach.simpleTranslation}</div>
        <div className="mentor-soft-item">{coach.marketTone}</div>
        <div className="mentor-soft-item">
          {t("coach_stop_resistance")} ${Math.round(stopLoss).toLocaleString("en-US")} •
          {t("coach_resistance")} ${Math.round(resistanceZoneLow).toLocaleString("en-US")} - $
          {Math.round(resistanceZoneHigh).toLocaleString("en-US")}
        </div>
        <div className="mentor-soft-item">
          {t("coach_rr_score")} {riskRewardEstimate} • {t("coach_score")} {score}/100
        </div>

        {trend1h === "bearish" && (
          <div className="mentor-soft-item">
            {t("coach_short_trend_weak")}
          </div>
        )}

        {rsi4h > 72 && (
          <div className="mentor-soft-item">
            {t("coach_rsi_high")}
          </div>
        )}

        {rsi4h < 35 && (
          <div className="mentor-soft-item">
            {t("coach_rsi_low")}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mentor-soft-item">
            {t("coach_warning_prefix")} {warnings[0]}
          </div>
        )}

        {blockers.length > 0 && (
          <div className="mentor-soft-item mentor-soft-item-red">
            {t("coach_blocker_prefix")} {blockers[0]}
          </div>
        )}
      </div>
    </div>
  );
}
