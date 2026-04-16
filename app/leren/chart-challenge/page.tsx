"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

type Candle = [number, number, number, number]; // [open, high, low, close]

type Scenario = {
  id: string;
  candles: Candle[];
  questionNL: string;
  questionEN: string;
  choices: { nl: string; en: string }[];
  correctIndex: number;
  feedbackCorrectNL: string;
  feedbackCorrectEN: string;
  feedbackWrongNL: string;
  feedbackWrongEN: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "uptrend",
    candles: [
      [35,38,33,37],[37,41,36,40],[40,44,38,43],[38,44,37,41],
      [41,46,40,45],[45,47,43,44],[44,48,42,47],[47,51,45,50],
      [50,52,48,49],[49,54,48,53],[53,56,51,55],[55,58,53,56],
      [56,60,54,59],[59,61,57,58],[58,63,57,62],[62,65,60,64],
      [64,67,62,66],[66,68,64,67],[67,71,65,70],[70,73,68,72],
    ],
    questionNL: "Wat is de richting van de trend op deze chart?",
    questionEN: "What is the trend direction on this chart?",
    choices: [
      { nl: "Uptrend — hogere highs en hogere lows", en: "Uptrend — higher highs and higher lows" },
      { nl: "Downtrend — lagere highs en lagere lows", en: "Downtrend — lower highs and lower lows" },
      { nl: "Zijwaarts — geen duidelijke richting", en: "Sideways — no clear direction" },
      { nl: "Kan ik niet bepalen", en: "Cannot determine" },
    ],
    correctIndex: 0,
    feedbackCorrectNL: "Correct. Elke top is hoger dan de vorige, elke bodem ook — textbook uptrend. In een uptrend zoek je koopmomenten bij de pullbacks naar de hogere lows, niet bij de tops.",
    feedbackCorrectEN: "Correct. Every peak is higher than the previous, every trough too — textbook uptrend. In an uptrend you look for buying at the pullbacks to higher lows, not at the tops.",
    feedbackWrongNL: "Kijk opnieuw. Elke top is hoger dan de vorige, elke bodem ook — hogere highs en hogere lows. Dat is de definitie van een uptrend. Leer dit patroon herkennen voor je orders plaatst.",
    feedbackWrongEN: "Look again. Every peak is higher than the previous, every trough too — higher highs and higher lows. That's the definition of an uptrend. Learn to spot this before placing orders.",
  },
  {
    id: "downtrend",
    candles: [
      [73,76,71,72],[72,73,68,69],[69,71,66,67],[67,69,64,65],
      [65,66,61,62],[62,64,60,61],[61,62,58,59],[59,61,56,57],
      [57,58,54,55],[55,57,53,54],[54,55,51,52],[52,54,50,51],
      [51,52,48,49],[49,51,47,48],[48,49,45,46],[46,48,44,45],
      [45,46,42,43],[43,45,41,42],[42,43,39,40],[40,42,38,39],
    ],
    questionNL: "Wat vertelt deze chart je over de markttrend?",
    questionEN: "What does this chart tell you about the market trend?",
    choices: [
      { nl: "Downtrend — lagere highs, lagere lows", en: "Downtrend — lower highs, lower lows" },
      { nl: "Uptrend — stijgende markt", en: "Uptrend — rising market" },
      { nl: "Zijwaartse consolidatie", en: "Sideways consolidation" },
      { nl: "Breakout naar boven", en: "Breakout upward" },
    ],
    correctIndex: 0,
    feedbackCorrectNL: "Goed. Elke rally stopt lager dan de vorige, elke dip gaat dieper. Lagere highs + lagere lows = downtrend. In een downtrend short je de bounces, of je staat gewoon aan de kant.",
    feedbackCorrectEN: "Good. Every rally stops lower than before, every dip goes deeper. Lower highs + lower lows = downtrend. In a downtrend you short the bounces, or you simply stay out.",
    feedbackWrongNL: "Dit is een downtrend. Elke top is lager dan de vorige, elke bodem ook. Lagere highs + lagere lows. Handelen tégen een trend is gevaarlijk.",
    feedbackWrongEN: "This is a downtrend. Every peak is lower than the previous, every trough too. Lower highs + lower lows. Trading against the trend is dangerous.",
  },
  {
    id: "support-bounce",
    candles: [
      [62,65,60,63],[63,65,61,62],[62,63,58,59],[59,60,55,56],
      [56,57,52,53],[53,54,49,50],[50,51,44,45],[45,46,40,41],
      [41,44,40,43],[43,47,41,46],[46,51,44,50],[50,53,48,52],
      [52,55,50,51],[51,53,49,50],[50,51,46,47],[47,48,43,44],
      [44,45,40,41],[41,44,40,43],[43,48,42,47],[47,53,45,52],
    ],
    questionNL: "Wat zie je bij het laagste prijsniveau dat twee keer geraakt wordt?",
    questionEN: "What happens at the lowest price level that gets touched twice?",
    choices: [
      { nl: "Support houdt stand — prijs stuitert omhoog", en: "Support holds — price bounces upward" },
      { nl: "Weerstand breekt door naar boven", en: "Resistance breaks upward" },
      { nl: "Prijs doorbreekt de bodem naar beneden", en: "Price breaks below the bottom" },
      { nl: "Geen patroon zichtbaar", en: "No pattern visible" },
    ],
    correctIndex: 0,
    feedbackCorrectNL: "Precies. De prijs daalt twee keer tot hetzelfde niveau en stuit terug. Dat is support. Hoe vaker een niveau getest wordt zonder te breken, hoe sterker het is. Dit zijn de niveaus waarop je je stop-loss plaatst.",
    feedbackCorrectEN: "Exactly. Price drops to the same level twice and bounces back. That's support. The more a level gets tested without breaking, the stronger it is. These are the levels where you place your stop-loss.",
    feedbackWrongNL: "Kijk naar de twee dieptepunten — op hetzelfde niveau. Elke keer stuit de prijs terug omhoog. Dat is support in actie — een vloer die de markt heeft bepaald.",
    feedbackWrongEN: "Look at the two lowest points — at the same level. Each time price bounces back up. That's support in action — a floor the market has established.",
  },
  {
    id: "resistance-rejection",
    candles: [
      [42,45,40,44],[44,48,42,47],[47,52,45,51],[51,56,49,55],
      [55,60,53,58],[58,63,56,62],[62,67,60,66],[66,68,63,65],
      [65,66,61,62],[62,64,58,61],[61,63,57,60],[60,62,56,59],
      [59,61,55,57],[57,60,53,56],[56,59,52,55],[55,58,51,54],
      [54,59,52,58],[58,64,56,63],[63,68,61,67],[67,69,64,66],
    ],
    questionNL: "Hoe reageert de prijs op het hoogste niveau dat twee keer geraakt wordt?",
    questionEN: "How does price react at the highest level that gets touched twice?",
    choices: [
      { nl: "Weerstand houdt stand — prijs draait terug", en: "Resistance holds — price reverses" },
      { nl: "Prijs breekt door naar boven", en: "Price breaks through upward" },
      { nl: "Support wordt actief op dat niveau", en: "Support becomes active at that level" },
      { nl: "Trending kanaal bevestigd", en: "Trending channel confirmed" },
    ],
    correctIndex: 0,
    feedbackCorrectNL: "Correct. De prijs stijgt twee keer tot hetzelfde niveau maar kan er niet doorheen. Dat is weerstand. Hoe vaker getest zonder breakout, hoe sterker het niveau. Tot het breekt, is longpositie bij die zone gevaarlijk.",
    feedbackCorrectEN: "Correct. Price rises to the same level twice but can't push through. That's resistance. The more it gets tested without a breakout, the stronger the level. Until it breaks, going long near that zone is dangerous.",
    feedbackWrongNL: "Kijk naar de twee toppen op dezelfde hoogte. Elke keer draait de prijs terug. Dat is weerstand — verkopers wachten daar. Koop nooit vlak onder sterke weerstand tenzij je een duidelijke breakout ziet.",
    feedbackWrongEN: "Look at the two peaks at the same height. Each time price turns back. That's resistance — sellers waiting there. Never buy just below strong resistance unless you see a clear breakout.",
  },
  {
    id: "breakout",
    candles: [
      [51,54,49,53],[53,55,51,52],[52,54,50,53],[53,55,51,52],
      [52,55,50,53],[53,56,51,52],[52,55,50,53],[53,55,51,52],
      [52,56,50,54],[54,56,52,53],[53,56,51,54],[54,56,52,53],
      [53,57,51,55],[55,57,53,54],[54,57,52,55],[55,57,53,56],
      [55,58,53,56],[56,59,54,58],[58,67,57,66],[66,72,64,71],
    ],
    questionNL: "Wat zie je bij de laatste twee kaarsen na de lange consolidatiefase?",
    questionEN: "What do you see at the last two candles after the long consolidation phase?",
    choices: [
      { nl: "Breakout — prijs doorbreekt de consolidatiezone omhoog", en: "Breakout — price breaks above the consolidation zone" },
      { nl: "Weerstand houdt stand, prijs daalt terug", en: "Resistance holds, price falls back" },
      { nl: "Support breekt, prijs valt", en: "Support breaks, price falls" },
      { nl: "Nieuwe consolidatiefase begint", en: "New consolidation phase begins" },
    ],
    correctIndex: 0,
    feedbackCorrectNL: "Goed gezien. Lange consolidatie is opgebouwde druk. Wanneer de prijs met kracht door de bovenkant breekt, volgen traders die al weken wachtten. Na een echte breakout wordt de vorige weerstand de nieuwe support.",
    feedbackCorrectEN: "Well spotted. Long consolidation is built-up pressure. When price forcefully breaks through the top, traders who waited weeks follow. After a real breakout, the old resistance becomes the new support.",
    feedbackWrongNL: "Kijk naar de eerste 18 kaarsen — smalle range, consolidatie. Dan twee massieve groene kaarsen die door de bovenkant schieten. Breakout. Breakouts na consolidatie zijn betrouwbaarder dan willekeurige moves.",
    feedbackWrongEN: "Look at the first 18 candles — tight range, consolidation. Then two massive green candles shoot through the top. Breakout. Breakouts after consolidation are more reliable than random moves.",
  },
  {
    id: "double-bottom",
    candles: [
      [66,69,64,68],[68,70,66,67],[67,69,63,64],[64,66,59,61],
      [61,63,57,58],[58,60,54,55],[55,57,51,52],[52,54,49,51],
      [51,54,50,53],[53,57,51,56],[56,60,54,59],[59,63,57,62],
      [62,64,60,61],[61,63,59,60],[60,62,57,59],[59,61,55,56],
      [56,58,52,53],[53,55,50,52],[52,54,50,53],[53,60,51,59],
    ],
    questionNL: "Welk technisch patroon herken je in deze chart?",
    questionEN: "What technical pattern do you recognize in this chart?",
    choices: [
      { nl: "Dubbele bodem — twee bodems op hetzelfde niveau", en: "Double bottom — two troughs at the same level" },
      { nl: "Hoofd-en-schouders — drie toppen", en: "Head and shoulders — three peaks" },
      { nl: "Breakdown — prijs verlaat de range naar beneden", en: "Breakdown — price exits range downward" },
      { nl: "Enkelvoudige bodem, geen patroon", en: "Single bottom, no pattern" },
    ],
    correctIndex: 0,
    feedbackCorrectNL: "Correct. Twee bodems op hetzelfde niveau — de markt weigerde twee keer te zakken. Daarna de bounce: kopers winnen. Een dubbele bodem is een reversal-signaal. Wacht altijd op de bevestiging (hogere close) voor je instapt.",
    feedbackCorrectEN: "Correct. Two troughs at the same level — the market refused to break below twice. Then the bounce: buyers won. A double bottom is a reversal signal. Always wait for confirmation (higher close) before entering.",
    feedbackWrongNL: "Kijk naar de twee dieptepunten op vrijwel hetzelfde niveau. Daartussen herstel, dan opnieuw daling naar hetzelfde niveau, dan bounce. Dubbele bodem — klassiek reversal-patroon.",
    feedbackWrongEN: "Look at the two lowest points at nearly the same level. A recovery in between, then another drop to the same level, then a bounce. Double bottom — a classic reversal pattern.",
  },
  {
    id: "bull-reversal",
    candles: [
      [61,64,59,63],[63,65,59,61],[61,62,56,57],[57,59,54,55],
      [55,56,51,52],[52,53,48,49],[49,51,47,49],[49,51,46,48],
      [48,50,46,48],[48,49,45,47],[47,49,44,46],[46,48,43,45],
      [45,47,42,44],[44,47,42,46],[46,49,44,48],[48,51,46,49],
      [49,53,47,52],[52,56,50,55],[55,61,53,60],[60,70,58,69],
    ],
    questionNL: "Wat signaleert de grote groene kaars aan het einde van de chart?",
    questionEN: "What does the large green candle at the end of the chart signal?",
    choices: [
      { nl: "Sterke koopdruk — mogelijke trendkeer", en: "Strong buying pressure — possible trend reversal" },
      { nl: "Verkoopdruk — prijs gaat verder dalen", en: "Selling pressure — price continues falling" },
      { nl: "Onzekerheid — neutrale kaars", en: "Uncertainty — neutral candle" },
      { nl: "Einde van de uptrend", en: "End of the uptrend" },
    ],
    correctIndex: 0,
    feedbackCorrectNL: "Goed. Na een lange daling verschijnt een groot groen lichaam — massieve koopdruk, bulls nemen controle. Dit soort kaarsen zijn reversal-signalen. Niet direct instappen: wacht op een bevestigende kaars daarna.",
    feedbackCorrectEN: "Good. After a long decline a large green body appears — massive buying pressure, bulls taking control. These candles are reversal signals. Don't rush in: wait for a confirming candle after it.",
    feedbackWrongNL: "Na een lange downtrend: een grote groene kaars die de vorige rode kaarsen overschrijft. Bullish engulfing — kopers namen massief de controle over. Mogelijk reversal, maar wacht op bevestiging.",
    feedbackWrongEN: "After a long downtrend: a large green candle overshadowing the previous red ones. Bullish engulfing — buyers took massive control. Possible reversal, but wait for confirmation.",
  },
  {
    id: "doji",
    candles: [
      [60,64,58,62],[62,65,60,61],[61,62,57,58],[58,59,53,54],
      [54,59,48,54],[54,59,49,54],[53,58,48,53],[53,58,48,53],
      [53,58,48,54],[54,59,49,54],[54,59,48,53],[53,58,48,54],
      [54,59,49,54],[54,59,48,53],[53,58,48,55],[55,60,50,56],
      [56,61,54,55],[55,59,53,57],[57,62,55,56],[56,61,54,55],
    ],
    questionNL: "Wat signaleren de kleine kaarsen met lange wicks in het midden van de chart?",
    questionEN: "What do the small candles with long wicks in the middle of the chart signal?",
    choices: [
      { nl: "Onzekerheid — kopers en verkopers zijn in evenwicht", en: "Uncertainty — buyers and sellers are balanced" },
      { nl: "Sterke uptrend bezig", en: "Strong uptrend in progress" },
      { nl: "Breakout naar boven komende", en: "Breakout upward coming" },
      { nl: "Support niveau actief", en: "Support level active" },
    ],
    correctIndex: 0,
    feedbackCorrectNL: "Correct. Kleine body's met lange wicks zijn doji-kaarsen — de prijs opent en sluit op vrijwel hetzelfde niveau. Kopers en verkopers zijn even sterk. In zo'n fase wacht je: geen positie innemen als niemand de controle heeft.",
    feedbackCorrectEN: "Correct. Small bodies with long wicks are doji candles — price opens and closes at nearly the same level. Buyers and sellers are evenly matched. In such a phase you wait: don't take a position when nobody is in control.",
    feedbackWrongNL: "Die kleine kaarsen met wicks omhoog en omlaag zijn doji's. Open ≈ close: noch kopers noch verkopers hebben de controle. Onzekerheid. Geduld is hier het enige juiste antwoord.",
    feedbackWrongEN: "Those small candles with wicks up and down are doji candles. Open ≈ close: neither buyers nor sellers are in control. Uncertainty. Patience is the only correct response here.",
  },
  {
    id: "hh-hl",
    candles: [
      [38,42,36,40],[40,43,38,39],[39,44,38,43],[43,44,40,41],
      [41,47,40,46],[46,48,44,45],[45,49,43,48],[48,53,46,52],
      [52,54,49,50],[50,52,48,51],[51,52,48,51],[51,57,49,56],
      [56,59,54,58],[58,62,56,61],[61,65,59,64],[64,65,61,62],
      [62,64,60,63],[63,69,61,68],[68,72,66,71],[71,75,69,74],
    ],
    questionNL: "Welk specifiek patroon zie je in de opeenvolgende highs en lows?",
    questionEN: "What specific pattern do you see in the consecutive highs and lows?",
    choices: [
      { nl: "Hogere highs + hogere lows — klassieke uptrend", en: "Higher highs + higher lows — classic uptrend" },
      { nl: "Lagere highs + lagere lows — downtrend", en: "Lower highs + lower lows — downtrend" },
      { nl: "Gelijke highs en lows — range", en: "Equal highs and lows — range" },
      { nl: "Willekeurig — geen patroon", en: "Random — no pattern" },
    ],
    correctIndex: 0,
    feedbackCorrectNL: "Goed. HH + HL is het fundament van trendanalyse. Hogere high = bulls winnen terrein. Hogere low = bears kunnen zelfs bij terugval niet meer zo laag als vroeger. Zolang dit intact is, blijft de uptrend geldig.",
    feedbackCorrectEN: "Good. HH + HL is the foundation of trend analysis. Higher high = bulls gaining ground. Higher low = bears can't pull back as low as before. As long as this pattern holds, the uptrend remains valid.",
    feedbackWrongNL: "Elke nieuwe top is hoger dan de vorige. Elke nieuwe bodem ook. Hogere highs + hogere lows = uptrend. Het meest fundamentele concept in technische analyse — ken het van buiten.",
    feedbackWrongEN: "Every new peak is higher than the previous. Every new trough too. Higher highs + higher lows = uptrend. The most fundamental concept in technical analysis — know it cold.",
  },
  {
    id: "range",
    candles: [
      [51,59,48,56],[56,61,53,57],[57,60,54,58],[58,61,55,57],
      [57,61,54,58],[58,62,55,57],[57,61,53,56],[56,60,52,55],
      [55,59,52,57],[57,61,54,59],[59,63,56,61],[61,63,58,59],
      [59,62,56,60],[60,63,57,61],[61,64,58,60],[60,62,56,58],
      [58,62,55,60],[60,63,57,61],[61,64,57,60],[60,63,56,59],
    ],
    questionNL: "Wat doet de prijs op deze chart?",
    questionEN: "What is price doing on this chart?",
    choices: [
      { nl: "Consolideert in een range — geen duidelijke richting", en: "Consolidating in a range — no clear direction" },
      { nl: "Breakout naar boven — trend begint", en: "Breaking out upward — trend beginning" },
      { nl: "Duidelijke downtrend", en: "Clear downtrend" },
      { nl: "Uptrend met pullbacks", en: "Uptrend with pullbacks" },
    ],
    correctIndex: 0,
    feedbackCorrectNL: "Precies. Zijwaarts tussen twee niveaus zonder echte richting. In een range wacht je op de breakout, of je handelt de extremen — kopen bij support, verkopen bij weerstand. Maar met krappe stops, want ranges breken onverwacht.",
    feedbackCorrectEN: "Exactly. Sideways between two levels without a real direction. In a range you wait for the breakout, or trade the extremes — buy at support, sell at resistance. But tight stops, because ranges break unexpectedly.",
    feedbackWrongNL: "De prijs beweegt op en neer maar keert telkens terug. Geen hogere highs, geen lagere lows. Dat is consolidatie — een range. Er is geen trending markt hier.",
    feedbackWrongEN: "Price moves up and down but always returns to the same area. No higher highs, no lower lows. That's consolidation — a range. There's no trending market here.",
  },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function pickScenario(date: string): Scenario {
  const hash = date.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SCENARIOS[hash % SCENARIOS.length];
}

function CandleChart({ candles }: { candles: Candle[] }) {
  const n = candles.length;
  const W = 320;
  const H = 120;
  const PAD = 8;
  const slotW = W / n;
  const candleW = Math.max(3, slotW * 0.55);
  const allVals = candles.flatMap(([o, h, l, c]) => [o, h, l, c]);
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;
  const chartH = H - PAD * 2;
  const scaleY = (v: number) => PAD + (1 - (v - min) / range) * chartH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
      <rect x={0} y={0} width={W} height={H} fill="var(--surface)" rx={8} />
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={0} y1={PAD + f * chartH} x2={W} y2={PAD + f * chartH}
          stroke="var(--border)" strokeWidth={0.5} strokeDasharray="4 4" />
      ))}
      {candles.map(([o, h, l, c], i) => {
        const x = i * slotW + slotW / 2;
        const bull = c >= o;
        const color = bull ? "#22c55e" : "#ef4444";
        const bodyTop = scaleY(Math.max(o, c));
        const bodyBot = scaleY(Math.min(o, c));
        const bodyH = Math.max(1, bodyBot - bodyTop);
        return (
          <g key={i}>
            <line x1={x} y1={scaleY(h)} x2={x} y2={scaleY(l)} stroke={color} strokeWidth={1} />
            <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} rx={0.5} />
          </g>
        );
      })}
    </svg>
  );
}

export default function ChartChallengePage() {
  const { lang } = useLanguage();
  const isNL = lang === "nl";
  const today = todayStr();
  const scenario = pickScenario(today);

  const [selected, setSelected] = useState<number | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    setAlreadyDone(localStorage.getItem(`btcmentor-chartchallenge-${today}`) === "1");
  }, [today]);

  function handleAnswer(idx: number) {
    if (selected !== null || alreadyDone) return;
    setSelected(idx);
    if (idx === scenario.correctIndex) {
      localStorage.setItem(`btcmentor-chartchallenge-${today}`, "1");
      setAlreadyDone(true);
      window.dispatchEvent(new Event("storage"));
    }
  }

  const isCorrect = selected === scenario.correctIndex;

  return (
    <main className="container-page">
      <div style={{ marginBottom: 12 }}>
        <Link href="/leren" className="page-back-btn">
          ← {isNL ? "Terug naar leren" : "Back to learning"}
        </Link>
      </div>

      <div className="chart-challenge-hero">
        <div className="chart-challenge-tag">
          📊 {isNL ? "Dagelijkse Chart Challenge" : "Daily Chart Challenge"}
        </div>
        <h1 className="chart-challenge-title">
          {isNL ? "Analyseer deze chart" : "Analyze this chart"}
        </h1>
        <p className="chart-challenge-sub">
          {isNL
            ? "Marcus toont je een historisch BTC-patroon. Wat zie jij?"
            : "Marcus shows you a historical BTC pattern. What do you see?"}
        </p>
      </div>

      {alreadyDone && selected === null ? (
        <div className="card chart-challenge-done-card">
          <div className="chart-challenge-done-icon">✅</div>
          <p className="chart-challenge-done-text">
            {isNL
              ? "Je hebt de chart challenge van vandaag al voltooid. Kom morgen terug voor een nieuw patroon."
              : "You already completed today's chart challenge. Come back tomorrow for a new pattern."}
          </p>
        </div>
      ) : (
        <>
          <div className="chart-challenge-chart-wrapper">
            <div className="chart-challenge-chart-label">BTC/USD · 4H</div>
            <CandleChart candles={scenario.candles} />
          </div>

          <div className="chart-challenge-question">
            {isNL ? scenario.questionNL : scenario.questionEN}
          </div>

          <div className="chart-challenge-choices">
            {scenario.choices.map((choice, idx) => {
              let cls = "chart-challenge-choice";
              if (selected !== null) {
                if (idx === scenario.correctIndex) cls += " correct";
                else if (idx === selected) cls += " wrong";
                else cls += " dimmed";
              }
              return (
                <button key={idx} className={cls} onClick={() => handleAnswer(idx)} disabled={selected !== null}>
                  <span className="chart-challenge-choice-letter">{String.fromCharCode(65 + idx)}</span>
                  <span>{isNL ? choice.nl : choice.en}</span>
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className={`card chart-challenge-feedback${isCorrect ? " correct" : " wrong"}`}>
              <div className="chart-challenge-feedback-header">
                <div className="chart-challenge-feedback-avatar">M</div>
                <span className="chart-challenge-feedback-label">
                  {isCorrect
                    ? (isNL ? "✓ Correct" : "✓ Correct")
                    : (isNL ? "✗ Niet helemaal" : "✗ Not quite")}
                </span>
              </div>
              <p className="chart-challenge-feedback-text">
                {isCorrect
                  ? (isNL ? scenario.feedbackCorrectNL : scenario.feedbackCorrectEN)
                  : (isNL ? scenario.feedbackWrongNL : scenario.feedbackWrongEN)}
              </p>
              {isCorrect && (
                <div className="chart-challenge-xp-badge">+30 XP</div>
              )}
              <Link href="/leren" className="chart-challenge-back-btn">
                {isNL ? "← Terug naar leren" : "← Back to learning"}
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}
