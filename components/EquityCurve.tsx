"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type Point = { time: number; value: number }; // time = unix ms

type Props = {
  points: Point[];
  startingBalance: number;
  height?: number;
};

const TZ_OFFSET_SEC = new Date().getTimezoneOffset() * -60;

export default function EquityCurve({ points, startingBalance, height = 120 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isLight = theme === "light";

  const BG   = isLight ? "#f2ebe0" : "#0e0810";
  const GRID = isLight ? "rgba(160,100,20,0.06)" : "rgba(255,255,255,0.04)";
  const TEXT = isLight ? "#7a5530" : "#bf7a99";

  const last = points[points.length - 1]?.value ?? startingBalance;
  const isUp = last >= startingBalance;
  const lineColor = isUp ? "#22c55e" : "#ef4444";

  useEffect(() => {
    if (!containerRef.current || points.length < 2) return;
    let destroyed = false;

    async function init() {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (destroyed || !containerRef.current) return;

      const { createChart, ColorType, CrosshairMode, LineSeries } = await import("lightweight-charts");
      if (destroyed || !containerRef.current) return;

      const w = containerRef.current.clientWidth || 280;
      const chart = createChart(containerRef.current, {
        width: w,
        height,
        layout: { background: { type: ColorType.Solid, color: BG }, textColor: TEXT },
        grid: { vertLines: { color: GRID }, horzLines: { color: GRID } },
        rightPriceScale: { borderColor: GRID, textColor: TEXT, scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderColor: GRID, timeVisible: false, rightOffset: 4 },
        crosshair: { mode: CrosshairMode.Normal },
        handleScroll: false,
        handleScale: false,
      });

      const series = chart.addSeries(LineSeries, {
        color: lineColor,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        priceFormat: { type: "custom", formatter: (v: number) => `€${v.toFixed(0)}` },
      });

      // Baseline at starting balance
      series.createPriceLine({
        price: startingBalance,
        color: "rgba(255,255,255,0.2)",
        lineWidth: 1,
        lineStyle: 2, // dashed
        axisLabelVisible: false,
        title: "",
      });

      // Deduplicate timestamps by rounding to second
      const seen = new Map<number, number>();
      for (const p of points) {
        const t = Math.floor(p.time / 1000) + TZ_OFFSET_SEC;
        seen.set(t, p.value); // last trade wins if same second
      }
      const data = Array.from(seen.entries())
        .sort(([a], [b]) => a - b)
        .map(([time, value]) => ({ time: time as unknown as import("lightweight-charts").Time, value }));

      series.setData(data);
      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (!containerRef.current) return;
        chart.applyOptions({ width: containerRef.current.clientWidth });
      });
      ro.observe(containerRef.current);

      return () => { ro.disconnect(); chart.remove(); };
    }

    let cleanup: (() => void) | undefined;
    init().then(fn => { cleanup = fn; });

    return () => {
      destroyed = true;
      cleanup?.();
    };
  }, [points, startingBalance, height, BG, GRID, TEXT, lineColor]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
