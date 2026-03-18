"use client";

import { useMemo } from "react";
import type { Candle } from "@/lib/types";

type Props = {
  candles: Candle[];
  currentPrice: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  resistanceZoneLow: number;
  resistanceZoneHigh: number;
  mode?: "fast" | "analysis";
};

function formatPrice(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SimpleChart({
  candles,
  currentPrice,
  entryZoneLow,
  entryZoneHigh,
  stopLoss,
  resistanceZoneLow,
  resistanceZoneHigh,
  mode = "analysis",
}: Props) {
  const model = useMemo(() => {
    const width = 1160;
    const height = 560;

    const leftPad = 18;
    const rightPad = 92;
    const topPad = 18;
    const bottomPad = 92;

    const chartWidth = width - leftPad - rightPad;
    const chartHeight = height - topPad - bottomPad;

    const volumeHeight = 78;
    const candleAreaHeight = chartHeight - volumeHeight - 18;
    const volumeTop = topPad + candleAreaHeight + 18;

    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume);

    const candleMax = Math.max(...highs, currentPrice);
    const candleMin = Math.min(...lows, currentPrice);

    const zoneMax = Math.max(
      currentPrice,
      entryZoneHigh,
      resistanceZoneHigh,
      ...highs
    );
    const zoneMin = Math.min(
      currentPrice,
      stopLoss,
      entryZoneLow,
      resistanceZoneLow,
      ...lows
    );

    const useZoneScaling = mode === "analysis";

    const maxPrice = useZoneScaling ? zoneMax : candleMax;
    const minPrice = useZoneScaling ? zoneMin : candleMin;

    const maxVolume = Math.max(...volumes, 1);

    const padding = (maxPrice - minPrice) * 0.1 || maxPrice * 0.02 || 100;
    const topPrice = maxPrice + padding;
    const bottomPrice = minPrice - padding;
    const priceRange = Math.max(topPrice - bottomPrice, 1);

    const candleSlot = chartWidth / Math.max(candles.length, 1);
    const candleWidth = Math.max(5, Math.min(12, candleSlot * 0.68));

    function x(index: number) {
      return leftPad + index * candleSlot + candleSlot / 2;
    }

    function y(price: number) {
      return topPad + ((topPrice - price) / priceRange) * candleAreaHeight;
    }

    function volumeY(volume: number) {
      return volumeTop + volumeHeight - (volume / maxVolume) * volumeHeight;
    }

    const priceSteps = 6;
    const priceLines = Array.from({ length: priceSteps + 1 }, (_, i) => {
      const ratio = i / priceSteps;
      const price = topPrice - ratio * priceRange;
      return {
        y: topPad + ratio * candleAreaHeight,
        price,
      };
    });

    const timeMarks = candles
      .map((c, i) => ({ candle: c, index: i }))
      .filter((_, i, arr) => {
        if (i === 0 || i === arr.length - 1) return true;
        return i % Math.max(1, Math.floor(arr.length / 6)) === 0;
      });

    const entryZoneVisible =
      useZoneScaling &&
      entryZoneHigh >= bottomPrice &&
      entryZoneLow <= topPrice;

    const resistanceZoneVisible =
      useZoneScaling &&
      resistanceZoneHigh >= bottomPrice &&
      resistanceZoneLow <= topPrice;

    const stopLossVisible =
      useZoneScaling && stopLoss >= bottomPrice && stopLoss <= topPrice;

    const lastCandle =
      candles.length > 0 ? candles[candles.length - 1] : undefined;

    return {
      width,
      height,
      leftPad,
      rightPad,
      topPad,
      bottomPad,
      chartWidth,
      candleAreaHeight,
      volumeTop,
      volumeHeight,
      candleWidth,
      candles,
      x,
      y,
      volumeY,
      priceLines,
      timeMarks,
      currentPriceY: y(currentPrice),
      stopLossY: y(stopLoss),
      entryZoneTop: y(entryZoneHigh),
      entryZoneBottom: y(entryZoneLow),
      resistanceZoneTop: y(resistanceZoneHigh),
      resistanceZoneBottom: y(resistanceZoneLow),
      lastCandleX: candles.length > 0 ? x(candles.length - 1) : leftPad,
      entryZoneVisible,
      resistanceZoneVisible,
      stopLossVisible,
      topPrice,
      bottomPrice,
      lastCandle,
    };
  }, [
    candles,
    currentPrice,
    entryZoneLow,
    entryZoneHigh,
    stopLoss,
    resistanceZoneLow,
    resistanceZoneHigh,
    mode,
  ]);

  const isFast = mode === "fast";

  return (
    <div className="market-chart-shell">
      <div className="market-chart-topbar">
        <div className="market-chart-chip">
          {isFast ? "5m live chart" : "4H analyse chart"}
        </div>
        <div className="market-chart-chip">Wit = prijs nu</div>
        <div className="market-chart-chip">Volume onderaan</div>
        {!isFast && <div className="market-chart-chip">Groen = koopzone</div>}
        {!isFast && <div className="market-chart-chip">Rood = stop-loss</div>}
        {!isFast && <div className="market-chart-chip">Grijs = resistance</div>}
      </div>

      {isFast && (
        <div className="market-chart-context-strip">
          <div className="market-chart-context-box">
            4H koopzone: ${formatPrice(entryZoneLow)} - ${formatPrice(entryZoneHigh)}
          </div>
          <div className="market-chart-context-box">
            4H stop-loss: ${formatPrice(stopLoss)}
          </div>
          <div className="market-chart-context-box">
            4H resistance: ${formatPrice(resistanceZoneLow)} - ${formatPrice(resistanceZoneHigh)}
          </div>
        </div>
      )}

      <div className="market-chart-frame">
        <svg
          viewBox={`0 0 ${model.width} ${model.height}`}
          className="market-chart-svg"
          role="img"
          aria-label="Live Bitcoin market chart"
        >
          <rect
            x={model.leftPad}
            y={model.topPad}
            width={model.chartWidth}
            height={model.candleAreaHeight}
            className="market-chart-panel"
            rx="14"
          />

          {model.priceLines.map((line) => (
            <g key={line.y}>
              <line
                x1={model.leftPad}
                x2={model.leftPad + model.chartWidth}
                y1={line.y}
                y2={line.y}
                className="market-grid-line"
              />
              <text
                x={model.leftPad + model.chartWidth + 12}
                y={line.y + 4}
                className="market-price-label"
              >
                {formatPrice(line.price)}
              </text>
            </g>
          ))}

          {!isFast && model.resistanceZoneVisible && (
            <rect
              x={model.leftPad}
              y={model.resistanceZoneTop}
              width={model.chartWidth}
              height={Math.max(
                8,
                model.resistanceZoneBottom - model.resistanceZoneTop
              )}
              className="market-zone-resistance"
              rx="8"
            />
          )}

          {!isFast && model.entryZoneVisible && (
            <rect
              x={model.leftPad}
              y={model.entryZoneTop}
              width={model.chartWidth}
              height={Math.max(8, model.entryZoneBottom - model.entryZoneTop)}
              className="market-zone-buy"
              rx="8"
            />
          )}

          {!isFast && model.stopLossVisible && (
            <line
              x1={model.leftPad}
              x2={model.leftPad + model.chartWidth}
              y1={model.stopLossY}
              y2={model.stopLossY}
              className="market-stop-line"
            />
          )}

          <line
            x1={model.leftPad}
            x2={model.leftPad + model.chartWidth}
            y1={model.currentPriceY}
            y2={model.currentPriceY}
            className="market-current-line"
          />

          <g>
            <rect
              x={model.leftPad + model.chartWidth + 8}
              y={model.currentPriceY - 12}
              width="76"
              height="24"
              rx="12"
              className="market-current-pill"
            />
            <text
              x={model.leftPad + model.chartWidth + 46}
              y={model.currentPriceY + 4}
              textAnchor="middle"
              className="market-current-pill-text"
            >
              {formatPrice(currentPrice)}
            </text>
          </g>

          {model.candles.map((candle, index) => {
            const cx = model.x(index);
            const wickTop = model.y(candle.high);
            const wickBottom = model.y(candle.low);
            const openY = model.y(candle.open);
            const closeY = model.y(candle.close);
            const bullish = candle.close >= candle.open;
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(2.5, Math.abs(openY - closeY));

            return (
              <g key={candle.openTime}>
                <line
                  x1={cx}
                  x2={cx}
                  y1={wickTop}
                  y2={wickBottom}
                  className={bullish ? "market-wick-up" : "market-wick-down"}
                />
                <rect
                  x={cx - model.candleWidth / 2}
                  y={bodyTop}
                  width={model.candleWidth}
                  height={bodyHeight}
                  rx="2.5"
                  className={bullish ? "market-body-up" : "market-body-down"}
                />
              </g>
            );
          })}

          {model.candles.map((candle, index) => {
            const cx = model.x(index);
            const barTop = model.volumeY(candle.volume);
            const barHeight = model.volumeTop + model.volumeHeight - barTop;
            const bullish = candle.close >= candle.open;

            return (
              <rect
                key={`vol-${candle.openTime}`}
                x={cx - model.candleWidth / 2}
                y={barTop}
                width={model.candleWidth}
                height={Math.max(2, barHeight)}
                rx="1.5"
                className={bullish ? "market-volume-up" : "market-volume-down"}
              />
            );
          })}

          <line
            x1={model.leftPad}
            x2={model.leftPad + model.chartWidth}
            y1={model.volumeTop}
            y2={model.volumeTop}
            className="market-volume-separator"
          />

          <text
            x={model.leftPad + 6}
            y={model.volumeTop - 8}
            className="market-volume-label"
          >
            Volume
          </text>

          {model.timeMarks.map(({ candle, index }) => (
            <text
              key={`time-${candle.openTime}`}
              x={model.x(index)}
              y={model.topPad + model.candleAreaHeight + model.volumeHeight + 34}
              textAnchor="middle"
              className="market-time-label"
            >
              {formatTime(candle.openTime)}
            </text>
          ))}

          {model.candles.length > 0 && (
            <>
              <line
                x1={model.lastCandleX}
                x2={model.lastCandleX}
                y1={model.topPad}
                y2={model.topPad + model.candleAreaHeight}
                className="market-live-candle-line"
              />
              <text
                x={model.lastCandleX}
                y={model.topPad - 4}
                textAnchor="middle"
                className="market-live-candle-label"
              >
                NU
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
