"use client";

import { useMemo } from "react";

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

function getConfidence(score: number, grade: string) {
  if (grade === "A" && score >= 72) return "Hoog";
  if (grade === "B" || grade === "C") return "Middel";
  return "Laag";
}

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
      headline = "Ik zou je nu niet laten kopen";
      verdict =
        "Er zit op dit moment iets fundamenteel zwaks in deze setup. Daarom wil ik je hier beschermen.";
      bestAction =
        "Blijf kijken en oefen alleen met begrijpen wat de markt fout maakt.";
      biggestMistake =
        "Toch kopen omdat je hoopt dat de prijs ineens draait.";
      lesson =
        "Een slechte setup overslaan is ook een goede trade-beslissing.";
      simpleTranslation =
        "Simpel gezegd: de basis is nu niet gezond genoeg.";
    } else if (status === "Goed moment" && inBuyZone) {
      headline = "Dit is een netter leer-moment";
      verdict =
        "De setup is op dit moment bruikbaar en de prijs zit op een logischere plek.";
      bestAction =
        "Blijf klein en gedisciplineerd. Behandel dit als een oefentrade, niet als een gok.";
      biggestMistake =
        "Te veel willen verdienen op één trade.";
      lesson =
        "Een goede trade is meestal saai, gecontroleerd en duidelijk.";
      simpleTranslation =
        "Simpel gezegd: dit is een veel properere plek om naar een entry te kijken.";
    } else if (status === "Nog even wachten" && aboveBuyZone) {
      headline = "Ik wil je uit FOMO houden";
      verdict =
        "De setup is niet slecht, maar de prijs zit nog te hoog voor een nette entry.";
      bestAction =
        `Wacht liever tot de prijs terug dichter bij ${Math.round(
          entryZoneLow
        ).toLocaleString("en-US")} - ${Math.round(entryZoneHigh).toLocaleString(
          "en-US"
        )} komt.`;
      biggestMistake =
        "Instappen omdat je bang bent dat de move zonder jou doorgaat.";
      lesson =
        "Niet elke stijgende prijs is een goede koop. Waar je koopt is bijna net zo belangrijk als wat je koopt.";
      simpleTranslation =
        "Simpel gezegd: de markt is niet het probleem, jouw entry wel.";
    } else if (belowBuyZone) {
      headline = "Goedkoper voelt verleidelijk, maar wacht";
      verdict =
        "De prijs zit onder de koopzone. Dat lijkt interessant, maar kan ook betekenen dat de markt nog onrustig is.";
      bestAction =
        "Laat de prijs eerst tonen dat hij ergens wil houden in plaats van zomaar te blijven vallen.";
      biggestMistake =
        "Denken dat lager automatisch beter is.";
      lesson =
        "Een vallend mes vangen voelt soms slim, maar is vaak gewoon te vroeg.";
      simpleTranslation =
        "Simpel gezegd: eerst bevestiging, dan pas vertrouwen.";
    } else {
      headline = "De markt is nog niet klaar genoeg";
      verdict =
        "Ik wil dat je nu eerst begrijpt wat je ziet in plaats van iets te forceren.";
      bestAction =
        "Observeer en gebruik dit moment als training, niet als haastige trade-kans.";
      biggestMistake =
        "Traden uit verveling of ongeduld.";
      lesson =
        "Je groeit sneller als je leert wachten op kwaliteit.";
      simpleTranslation =
        "Simpel gezegd: nog niet klikken.";
    }

    if (trend4h === "bullish" && structure4h === "bullish") {
      marketTone =
        "De 4H trend en structuur helpen mee. Dat is positief voor een long idee.";
    } else if (trend4h === "bearish" || structure4h === "bearish") {
      marketTone =
        "De 4H trend of structuur werkt tegen. Daardoor is blind kopen gevaarlijker.";
    } else {
      marketTone =
        "De markt is nog gemengd. Daarom wil ik dat je meer op prijspositie let.";
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
    [score, setupGrade]
  );

  return (
    <div className="mentor-hero-card">
      <div className="mentor-hero-top">
        <div>
          <div className="label">Jouw mentor voor deze trade</div>
          <div className="mentor-hero-title">{coach.headline}</div>
        </div>

        <div className="mentor-live-pill">
          {liveMode ? "Ik kijk live met je mee" : "Ik werk op laatste analyse"}
          {lastTickLabel ? ` • ${lastTickLabel}` : ""}
        </div>
      </div>

      <div className="mentor-summary-row">
        <div className="mentor-summary-box">
          <span className="mentor-summary-label">Status</span>
          <span className="mentor-summary-value">{status}</span>
        </div>

        <div className="mentor-summary-box">
          <span className="mentor-summary-label">Actie</span>
          <span className="mentor-summary-value">{action}</span>
        </div>

        <div className="mentor-summary-box">
          <span className="mentor-summary-label">Vertrouwen</span>
          <span className="mentor-summary-value">{confidence}</span>
        </div>

        <div className="mentor-summary-box">
          <span className="mentor-summary-label">Grade</span>
          <span className="mentor-summary-value">{setupGrade}</span>
        </div>
      </div>

      <div className="mentor-main-grid">
        <div className="mentor-main-box">
          <div className="mentor-main-label">Wat ik je nu eerlijk zeg</div>
          <div className="mentor-main-text">{coach.verdict}</div>
        </div>

        <div className="mentor-main-box">
          <div className="mentor-main-label">Wat jij nu best doet</div>
          <div className="mentor-main-text">{coach.bestAction}</div>
        </div>

        <div className="mentor-main-box">
          <div className="mentor-main-label">Grootste fout nu</div>
          <div className="mentor-main-text">{coach.biggestMistake}</div>
        </div>

        <div className="mentor-main-box">
          <div className="mentor-main-label">Wat je vandaag leert</div>
          <div className="mentor-main-text">{coach.lesson}</div>
        </div>
      </div>

      <div className="mentor-soft-strip">
        <div className="mentor-soft-item">{coach.simpleTranslation}</div>
        <div className="mentor-soft-item">{coach.marketTone}</div>
        <div className="mentor-soft-item">
          Stop-loss rond ${Math.round(stopLoss).toLocaleString("en-US")} •
          Resistance ${Math.round(resistanceZoneLow).toLocaleString("en-US")} - $
          {Math.round(resistanceZoneHigh).toLocaleString("en-US")}
        </div>
        <div className="mentor-soft-item">
          Risk/reward {riskRewardEstimate} • Score {score}/100
        </div>

        {trend1h === "bearish" && (
          <div className="mentor-soft-item">
            De korte trend is nog zwak. Dat betekent: niet te snel springen.
          </div>
        )}

        {rsi4h > 72 && (
          <div className="mentor-soft-item">
            RSI 4H is hoog. De markt kan te heet zijn.
          </div>
        )}

        {rsi4h < 35 && (
          <div className="mentor-soft-item">
            RSI 4H is laag. Dat kan op extra zwakte wijzen.
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mentor-soft-item">
            Waarschuwing: {warnings[0]}
          </div>
        )}

        {blockers.length > 0 && (
          <div className="mentor-soft-item mentor-soft-item-red">
            Blocker: {blockers[0]}
          </div>
        )}
      </div>
    </div>
  );
}
