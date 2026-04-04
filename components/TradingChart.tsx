"use client";

import { useEffect, useRef, useState } from "react";
import type { Candle } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  candles: Candle[];
  currentPrice: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  resistanceZoneLow: number;
  resistanceZoneHigh: number;
  mode?: "fast" | "analysis";
  height?: number;
  compact?: boolean;
};

function candleToBar(c: Candle) {
  return {
    time: Math.floor(c.openTime / 1000) as unknown as import("lightweight-charts").Time,
    open: c.open, high: c.high, low: c.low, close: c.close,
  };
}
function candleToVol(c: Candle) {
  return {
    time: Math.floor(c.openTime / 1000) as unknown as import("lightweight-charts").Time,
    value: c.volume,
    color: c.close >= c.open ? "#26c57c44" : "#ef444444",
  };
}

function calcMA(candles: Candle[], period: number) {
  return candles.map((c, i) => {
    if (i < period - 1) return null;
    const slice = candles.slice(i - period + 1, i + 1);
    const avg = slice.reduce((s, x) => s + x.close, 0) / period;
    return {
      time: Math.floor(c.openTime / 1000) as unknown as import("lightweight-charts").Time,
      value: avg,
    };
  }).filter(Boolean) as { time: import("lightweight-charts").Time; value: number }[];
}

function calcRSI(candles: Candle[], period = 14) {
  if (candles.length < period + 1) return [];
  const closes = candles.map(c => c.close);
  const result: { time: import("lightweight-charts").Time; value: number }[] = [];
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff; else avgLoss += Math.abs(diff);
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period; i < candles.length; i++) {
    if (i > period) {
      const diff = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({
      time: Math.floor(candles[i].openTime / 1000) as unknown as import("lightweight-charts").Time,
      value: Math.round((100 - 100 / (1 + rs)) * 100) / 100,
    });
  }
  return result;
}

function calcBB(candles: Candle[], period = 20, mult = 2) {
  type BBPoint = { time: import("lightweight-charts").Time; value: number };
  const upper: BBPoint[] = [];
  const middle: BBPoint[] = [];
  const lower: BBPoint[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const avg = slice.reduce((s, x) => s + x.close, 0) / period;
    const variance = slice.reduce((s, x) => s + Math.pow(x.close - avg, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    const t = Math.floor(candles[i].openTime / 1000) as unknown as import("lightweight-charts").Time;
    upper.push({ time: t, value: avg + mult * stdDev });
    middle.push({ time: t, value: avg });
    lower.push({ time: t, value: avg - mult * stdDev });
  }
  return { upper, middle, lower };
}

function calcEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = values[0];
  result.push(ema);
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcMACD(candles: Candle[], fast = 12, slow = 26, signalPeriod = 9) {
  if (candles.length < slow + signalPeriod) return { macd: [], signal: [], histogram: [] };
  const closes = candles.map(c => c.close);
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);

  type MACDPoint = { time: import("lightweight-charts").Time; value: number };
  type HistPoint = { time: import("lightweight-charts").Time; value: number; color: string };

  const macdLine: number[] = [];
  const macdTimes: import("lightweight-charts").Time[] = [];

  for (let i = slow - 1; i < candles.length; i++) {
    macdLine.push(emaFast[i] - emaSlow[i]);
    macdTimes.push(Math.floor(candles[i].openTime / 1000) as unknown as import("lightweight-charts").Time);
  }

  const signalLine = calcEMA(macdLine, signalPeriod);

  const macdResult: MACDPoint[] = [];
  const signalResult: MACDPoint[] = [];
  const histResult: HistPoint[] = [];

  const offset = signalPeriod - 1;
  for (let i = offset; i < macdLine.length; i++) {
    const t = macdTimes[i];
    const m = macdLine[i];
    const s = signalLine[i];
    const h = m - s;
    macdResult.push({ time: t, value: m });
    signalResult.push({ time: t, value: s });
    histResult.push({ time: t, value: h, color: h >= 0 ? "#26c57c88" : "#ef444488" });
  }

  return { macd: macdResult, signal: signalResult, histogram: histResult };
}

export default function TradingChart({
  candles,
  currentPrice,
  entryZoneLow,
  entryZoneHigh,
  stopLoss,
  resistanceZoneLow,
  resistanceZoneHigh,
  mode = "analysis",
  height = 380,
  compact = false,
}: Props) {
  const { t } = useLanguage();
  const [showBB, setShowBB] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [chartType, setChartType] = useState<"candle" | "line">("candle");
  const [chartInitKey, setChartInitKey] = useState(0);
  const chartTypeRef = useRef<"candle" | "line">("candle");
  chartTypeRef.current = chartType;

  const mainRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rsiChartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const macdChartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ma20Ref = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ma50Ref = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rsiSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceLineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bbUpperRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bbMiddleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bbLowerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const macdLineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const macdSignalRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const macdHistRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineSeriesRef = useRef<any>(null);

  const candlesRef = useRef<Candle[]>(candles);
  candlesRef.current = candles;

  // Track of gebruiker handmatig heeft gezoomd — dan geen auto-fitContent meer
  const userZoomedRef = useRef(false);

  const showBBRef = useRef(showBB);
  showBBRef.current = showBB;
  const showMACDRef = useRef(showMACD);
  showMACDRef.current = showMACD;

  const BG = "#0e0810";
  const GRID = "#1a0f18";
  const TEXT = "#bf7a99";

  useEffect(() => {
    if (!mainRef.current || !rsiRef.current) return;
    let destroyed = false;
    let cleanupFn: (() => void) | undefined;

    async function init() {
      // Wait for layout to complete (critical on mobile — container may have 0 width initially)
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (destroyed || !mainRef.current || !rsiRef.current) return;

      const lc = await import("lightweight-charts");
      if (destroyed || !mainRef.current || !rsiRef.current) return;

      const { createChart, ColorType, CrosshairMode, LineStyle, CandlestickSeries, HistogramSeries, LineSeries } = lc;

      const containerW = mainRef.current.clientWidth || 320;

      const commonLayout = {
        layout: { background: { type: ColorType.Solid, color: BG }, textColor: TEXT },
        grid: { vertLines: { color: GRID }, horzLines: { color: GRID } },
        rightPriceScale: { borderColor: GRID, textColor: TEXT },
        timeScale: { borderColor: GRID, timeVisible: true, secondsVisible: false, rightOffset: 8 },
        crosshair: { mode: CrosshairMode.Normal },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      };

      // Main chart — explicit width instead of autoSize to prevent 0-width init on mobile
      const chart = createChart(mainRef.current, { ...commonLayout, width: containerW, height });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#26c57c", downColor: "#ef4444",
        borderUpColor: "#26c57c", borderDownColor: "#ef4444",
        wickUpColor: "#26c57c", wickDownColor: "#ef4444",
      });

      // Line series (alternative view to candlestick)
      const lineSeries = chart.addSeries(LineSeries, {
        color: "#e91e63",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title: "",
        visible: chartTypeRef.current === "line",
      });
      lineSeriesRef.current = lineSeries;

      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" }, priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.80, bottom: 0 } });

      const ma20Series = chart.addSeries(LineSeries, {
        color: "#f59e0b", lineWidth: 1, priceLineVisible: false, lastValueVisible: true,
        title: "MA20",
      });
      const ma50Series = chart.addSeries(LineSeries, {
        color: "#e91e63", lineWidth: 1, priceLineVisible: false, lastValueVisible: true,
        title: "MA50",
      });

      // Bollinger Bands
      const bbUpperSeries = chart.addSeries(LineSeries, {
        color: "#3b82f6", lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
        title: "BB↑",
      });
      const bbMiddleSeries = chart.addSeries(LineSeries, {
        color: "#f59e0b", lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
        title: "BB mid", lineStyle: LineStyle.Dashed,
      });
      const bbLowerSeries = chart.addSeries(LineSeries, {
        color: "#3b82f6", lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
        title: "BB↓",
      });

      chartRef.current = chart;
      seriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;
      ma20Ref.current = ma20Series;
      ma50Ref.current = ma50Series;
      bbUpperRef.current = bbUpperSeries;
      bbMiddleRef.current = bbMiddleSeries;
      bbLowerRef.current = bbLowerSeries;

      // RSI chart
      const rsiChart = createChart(rsiRef.current, {
        ...commonLayout,
        width: containerW,
        height: rsiH,
        timeScale: { ...commonLayout.timeScale, barSpacing: 8, minBarSpacing: 2 },
        rightPriceScale: { ...commonLayout.rightPriceScale, scaleMargins: { top: 0.1, bottom: 0.1 } },
      });

      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: "#e91e63", lineWidth: 1, priceLineVisible: false, lastValueVisible: true, title: "RSI",
      });
      rsiSeries.createPriceLine({ price: 70, color: "#ef444466", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "70" });
      rsiSeries.createPriceLine({ price: 50, color: "#ffffff22", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: "" });
      rsiSeries.createPriceLine({ price: 30, color: "#26c57c66", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "30" });

      rsiChartRef.current = rsiChart;
      rsiSeriesRef.current = rsiSeries;

      // MACD chart
      type IChart = ReturnType<typeof createChart>;
      let macdChart: IChart | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let macdLineSeries: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let macdSignalSeries: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let macdHistSeries: any = null;

      if (macdRef.current) {
        macdChart = createChart(macdRef.current, {
          ...commonLayout,
          width: containerW,
          height: macdH,
          timeScale: { ...commonLayout.timeScale, barSpacing: 8, minBarSpacing: 2 },
          rightPriceScale: { ...commonLayout.rightPriceScale, scaleMargins: { top: 0.15, bottom: 0.15 } },
        });
        macdLineSeries = macdChart.addSeries(LineSeries, {
          color: "#3b82f6", lineWidth: 1, priceLineVisible: false, lastValueVisible: true, title: "MACD",
        });
        macdSignalSeries = macdChart.addSeries(LineSeries, {
          color: "#e91e63", lineWidth: 1, priceLineVisible: false, lastValueVisible: true, title: "Signal",
        });
        macdHistSeries = macdChart.addSeries(HistogramSeries, {
          priceLineVisible: false, lastValueVisible: false,
        });

        macdChartRef.current = macdChart;
        macdLineRef.current = macdLineSeries;
        macdSignalRef.current = macdSignalSeries;
        macdHistRef.current = macdHistSeries;
      }

      // Sync time scales (all three charts)
      let syncing = false;
      const charts = [chart, rsiChart, ...(macdChart ? [macdChart] : [])];

      charts.forEach((c, idx) => {
        c.timeScale().subscribeVisibleLogicalRangeChange((range) => {
          if (syncing || !range) return;
          syncing = true;
          charts.forEach((other, otherIdx) => {
            if (otherIdx !== idx) other.timeScale().setVisibleLogicalRange(range);
          });
          syncing = false;
        });
      });

      // Fill data
      const snap = candlesRef.current;
      if (snap.length > 0) {
        candleSeries.setData(snap.map(candleToBar));
        lineSeries.setData(snap.map(c => ({ time: Math.floor(c.openTime / 1000) as unknown as import("lightweight-charts").Time, value: c.close })));
        // In line mode, hide volume bars (they look cluttered without candles)
        volumeSeries.applyOptions({ visible: chartTypeRef.current === "candle" });
        ma20Series.setData(calcMA(snap, 20));
        ma50Series.setData(calcMA(snap, 50));
        rsiSeries.setData(calcRSI(snap, 14));

        const bb = calcBB(snap);
        bbUpperSeries.setData(showBBRef.current ? bb.upper : []);
        bbMiddleSeries.setData(showBBRef.current ? bb.middle : []);
        bbLowerSeries.setData(showBBRef.current ? bb.lower : []);

        if (macdLineSeries && macdSignalSeries && macdHistSeries) {
          const macdData = calcMACD(snap);
          macdLineSeries.setData(showMACDRef.current ? macdData.macd : []);
          macdSignalSeries.setData(showMACDRef.current ? macdData.signal : []);
          macdHistSeries.setData(showMACDRef.current ? macdData.histogram : []);
        }

        chart.timeScale().fitContent();
        rsiChart.timeScale().fitContent();
        macdChart?.timeScale().fitContent();
      }

      // Zones
      if (mode === "analysis" && entryZoneLow > 0) {
        candleSeries.createPriceLine({ price: stopLoss, color: "#ef4444", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "Stop" });
        candleSeries.createPriceLine({ price: entryZoneLow, color: "#26c57c", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "Entry ↓" });
        candleSeries.createPriceLine({ price: entryZoneHigh, color: "#26c57c", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "Entry ↑" });
        candleSeries.createPriceLine({ price: resistanceZoneLow, color: "#6b7280", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "Resistance" });
      }

      priceLineRef.current = candleSeries.createPriceLine({
        price: currentPrice, color: "#ffffff", lineWidth: 1,
        lineStyle: LineStyle.Solid, axisLabelVisible: true, title: "",
      });

      // Detecteer handmatige zoom — daarna geen auto-fitContent meer
      chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
        userZoomedRef.current = true;
      });

      // Signal dat de chart klaar is — triggert de candle update effect opnieuw
      setChartInitKey(k => k + 1);

      // ResizeObserver — handles orientation change and container resize on mobile
      const ro = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect.width;
        if (!w || w <= 0) return;
        chart.applyOptions({ width: w });
        rsiChart.applyOptions({ width: w });
        macdChart?.applyOptions({ width: w });
      });
      if (mainRef.current) ro.observe(mainRef.current);

      cleanupFn = () => {
        ro.disconnect();
        chart.remove();
        rsiChart.remove();
        macdChart?.remove();
        chartRef.current = null;
        rsiChartRef.current = null;
        macdChartRef.current = null;
        seriesRef.current = null;
        volumeSeriesRef.current = null;
        ma20Ref.current = null;
        ma50Ref.current = null;
        rsiSeriesRef.current = null;
        priceLineRef.current = null;
        bbUpperRef.current = null;
        bbMiddleRef.current = null;
        bbLowerRef.current = null;
        macdLineRef.current = null;
        macdSignalRef.current = null;
        macdHistRef.current = null;
        lineSeriesRef.current = null;
      };
    }

    init();
    return () => { destroyed = true; cleanupFn?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, stopLoss, entryZoneLow, entryZoneHigh, resistanceZoneLow]);

  // Update candle data
  useEffect(() => {
    if (!seriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;
    seriesRef.current.setData(candles.map(candleToBar));
    volumeSeriesRef.current.setData(candles.map(candleToVol));
    lineSeriesRef.current?.setData(candles.map(c => ({
      time: Math.floor(c.openTime / 1000) as unknown as import("lightweight-charts").Time,
      value: c.close,
    })));
    ma20Ref.current?.setData(calcMA(candles, 20));
    ma50Ref.current?.setData(calcMA(candles, 50));
    rsiSeriesRef.current?.setData(calcRSI(candles, 14));

    const bb = calcBB(candles);
    bbUpperRef.current?.setData(showBB ? bb.upper : []);
    bbMiddleRef.current?.setData(showBB ? bb.middle : []);
    bbLowerRef.current?.setData(showBB ? bb.lower : []);

    if (macdLineRef.current && macdSignalRef.current && macdHistRef.current) {
      const macdData = calcMACD(candles);
      macdLineRef.current.setData(showMACD ? macdData.macd : []);
      macdSignalRef.current.setData(showMACD ? macdData.signal : []);
      macdHistRef.current.setData(showMACD ? macdData.histogram : []);
    }

    // Alleen auto-fit als gebruiker nog niet handmatig heeft gezoomd
    if (!userZoomedRef.current) {
      chartRef.current?.timeScale().fitContent();
      rsiChartRef.current?.timeScale().fitContent();
      macdChartRef.current?.timeScale().fitContent();
    }
  }, [candles, showBB, showMACD, chartInitKey]);

  // Toggle candle / line chart type
  useEffect(() => {
    if (!seriesRef.current || !lineSeriesRef.current) return;
    const isCandle = chartType === "candle";
    seriesRef.current.applyOptions({ visible: isCandle });
    volumeSeriesRef.current?.applyOptions({ visible: isCandle });
    lineSeriesRef.current.applyOptions({ visible: !isCandle });
  }, [chartType]);

  // Toggle BB
  useEffect(() => {
    if (!bbUpperRef.current || candles.length === 0) return;
    const bb = calcBB(candles);
    bbUpperRef.current.setData(showBB ? bb.upper : []);
    bbMiddleRef.current?.setData(showBB ? bb.middle : []);
    bbLowerRef.current?.setData(showBB ? bb.lower : []);
  }, [showBB, candles]);

  // Toggle MACD
  useEffect(() => {
    if (!macdLineRef.current || candles.length === 0) return;
    const macdData = calcMACD(candles);
    macdLineRef.current.setData(showMACD ? macdData.macd : []);
    macdSignalRef.current?.setData(showMACD ? macdData.signal : []);
    macdHistRef.current?.setData(showMACD ? macdData.histogram : []);
  }, [showMACD, candles]);

  // Live price line
  useEffect(() => {
    priceLineRef.current?.applyOptions({ price: currentPrice });
  }, [currentPrice]);

  const isFast = mode === "fast";
  const rsiH = compact ? 60 : 100;
  const macdH = compact ? 60 : 100;

  return (
    <div className="market-chart-shell">
      {!compact && (
        <div className="market-chart-topbar">
          <div className="market-chart-chip">{isFast ? t("chart_live_label") : t("chart_analysis_label")}</div>
          <div className="market-chart-chip" style={{ color: "#f59e0b" }}>── MA20</div>
          <div className="market-chart-chip" style={{ color: "#e91e63" }}>── MA50</div>
          {showBB && <div className="market-chart-chip" style={{ color: "#3b82f6" }}>── BB(20)</div>}
          {showMACD && <div className="market-chart-chip" style={{ color: "#3b82f6" }}>── MACD(12,26,9)</div>}
          <div className="market-chart-chip">{t("chart_drag_hint")}</div>
          <div className="market-chart-chip">{t("chart_scroll_hint")}</div>
        </div>
      )}

      {/* Indicator toggle buttons */}
      {!compact && (
        <div style={{ display: "flex", gap: 8, padding: "6px 0 2px 0", flexWrap: "wrap", alignItems: "center" }}>
          {/* Chart type toggle */}
          <div style={{
            display: "flex", borderRadius: 20, overflow: "hidden",
            border: "1px solid #2a1a28", marginRight: 4,
          }}>
            <button
              onClick={() => setChartType("candle")}
              style={{
                padding: "3px 12px", border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: chartType === "candle" ? "#7c3aed" : "#2a1a28",
                color: chartType === "candle" ? "#fff" : "#bf7a99",
                transition: "background 0.15s",
              }}
            >
              🕯 {t("chart_candle_label")}
            </button>
            <button
              onClick={() => setChartType("line")}
              style={{
                padding: "3px 12px", border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: chartType === "line" ? "#7c3aed" : "#2a1a28",
                color: chartType === "line" ? "#fff" : "#bf7a99",
                transition: "background 0.15s",
              }}
            >
              📈 {t("chart_line_label")}
            </button>
          </div>
          <button
            onClick={() => setShowBB(v => !v)}
            style={{
              padding: "3px 12px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              background: showBB ? "#e91e63" : "#2a1a28",
              color: showBB ? "#fff" : "#bf7a99",
              transition: "background 0.15s",
            }}
          >
            BB
          </button>
          <button
            onClick={() => setShowMACD(v => !v)}
            style={{
              padding: "3px 12px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              background: showMACD ? "#e91e63" : "#2a1a28",
              color: showMACD ? "#fff" : "#bf7a99",
              transition: "background 0.15s",
            }}
          >
            MACD
          </button>
        </div>
      )}

      {!compact && !isFast && (
        <div className="market-chart-legend">
          <div className="market-chart-legend-item">
            <span className="market-chart-legend-dot" style={{ background: "#26c57c" }} />
            <span>{t("chart_buy_zone_desc")}</span>
          </div>
          <div className="market-chart-legend-item">
            <span className="market-chart-legend-dot" style={{ background: "#ef4444" }} />
            <span>{t("chart_stoploss_desc")}</span>
          </div>
          <div className="market-chart-legend-item">
            <span className="market-chart-legend-dot" style={{ background: "#6b7280" }} />
            <span>{t("chart_resistance_desc")}</span>
          </div>
          <div className="market-chart-legend-item">
            <span className="market-chart-legend-dot" style={{ background: "#f59e0b" }} />
            <span>{t("chart_ma20_desc")}</span>
          </div>
          <div className="market-chart-legend-item">
            <span className="market-chart-legend-dot" style={{ background: "#e91e63" }} />
            <span>{t("chart_ma50_desc")}</span>
          </div>
          {showBB && (
            <div className="market-chart-legend-item">
              <span className="market-chart-legend-dot" style={{ background: "#3b82f6" }} />
              <span>{t("chart_bb_desc")}</span>
            </div>
          )}
          {showMACD && (
            <div className="market-chart-legend-item">
              <span className="market-chart-legend-dot" style={{ background: "#3b82f6" }} />
              <span>{t("chart_macd_desc")}</span>
            </div>
          )}
        </div>
      )}

      {!compact && isFast && (
        <div className="market-chart-context-strip">
          <div className="market-chart-context-box">{t("chart_buy_zone_label")}: ${entryZoneLow.toLocaleString("en-US", { maximumFractionDigits: 0 })} – ${entryZoneHigh.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
          <div className="market-chart-context-box">{t("chart_stop_label")}: ${stopLoss.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
          <div className="market-chart-context-box">{t("chart_resistance_label")}: ${resistanceZoneLow.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
        </div>
      )}

      {/* Zoom controls */}
      <div style={{ display: "flex", gap: 6, padding: "4px 0 2px 0", alignItems: "center" }}>
        <button
          onClick={() => {
            const ts = chartRef.current?.timeScale();
            if (!ts) return;
            const range = ts.getVisibleLogicalRange();
            if (!range) return;
            const mid = (range.from + range.to) / 2;
            const half = (range.to - range.from) / 4;
            ts.setVisibleLogicalRange({ from: mid - half, to: mid + half });
          }}
          style={{ padding: "3px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 16, fontWeight: 700, background: "#2a1a28", color: "#bf7a99" }}
          title="Zoom in"
        >+</button>
        <button
          onClick={() => {
            const ts = chartRef.current?.timeScale();
            if (!ts) return;
            const range = ts.getVisibleLogicalRange();
            if (!range) return;
            const mid = (range.from + range.to) / 2;
            const half = (range.to - range.from);
            ts.setVisibleLogicalRange({ from: mid - half, to: mid + half });
          }}
          style={{ padding: "3px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 16, fontWeight: 700, background: "#2a1a28", color: "#bf7a99" }}
          title="Zoom out"
        >−</button>
        <button
          onClick={() => {
            userZoomedRef.current = false;
            chartRef.current?.timeScale().fitContent();
            rsiChartRef.current?.timeScale().fitContent();
            macdChartRef.current?.timeScale().fitContent();
          }}
          style={{ padding: "3px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: "#2a1a28", color: "#bf7a99" }}
          title="Fit all"
        >⤢ fit</button>
      </div>

      {/* Main candlestick chart */}
      <div className="market-chart-frame" style={{ overflow: "hidden", borderRadius: compact ? 10 : 14, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <div ref={mainRef} style={{ width: "100%", height, touchAction: "none" }} />
      </div>

      {/* RSI sub-chart */}
      <div className="market-chart-frame" style={{
        overflow: "hidden", borderRadius: 0,
        borderBottomLeftRadius: compact ? 10 : 14,
        borderBottomRightRadius: compact ? 10 : 14,
        borderTop: `1px solid ${GRID}`,
      }}>
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: 8, top: 4, fontSize: 10, color: TEXT,
            zIndex: 1, pointerEvents: "none", letterSpacing: "0.05em",
          }}>RSI 14</span>
          <div ref={rsiRef} style={{ width: "100%", height: rsiH, touchAction: "none" }} />
        </div>
      </div>

      {/* MACD sub-chart — always mounted, hidden when toggle is off */}
      <div
        className="market-chart-frame"
        style={{
          overflow: "hidden", borderRadius: 0,
          borderBottomLeftRadius: compact ? 10 : 14,
          borderBottomRightRadius: compact ? 10 : 14,
          borderTop: `1px solid ${GRID}`,
          display: showMACD ? "block" : "none",
        }}
      >
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: 8, top: 4, fontSize: 10, color: TEXT,
            zIndex: 1, pointerEvents: "none", letterSpacing: "0.05em",
          }}>MACD (12, 26, 9)</span>
          <div ref={macdRef} style={{ width: "100%", height: macdH, touchAction: "none" }} />
        </div>
      </div>
    </div>
  );
}
