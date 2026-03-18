"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries } from "lightweight-charts";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import type { Candle } from "@/lib/types";

type Props = {
    candles: Candle[];
    currentPrice: number;
};

export default function RealChart({ candles }: Props) {
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "#0a0e1a" },
                textColor: "#8b95ad",
                fontSize: 12,
            },
            grid: {
                vertLines: { color: "rgba(255,255,255,0.03)" },
                horzLines: { color: "rgba(255,255,255,0.03)" },
            },
            width: chartContainerRef.current.clientWidth,
            height: 440,
            rightPriceScale: {
                borderColor: "rgba(255,255,255,0.06)",
            },
            timeScale: {
                borderColor: "rgba(255,255,255,0.06)",
            },
            crosshair: {
                vertLine: { color: "rgba(255,255,255,0.1)", width: 1 },
                horzLine: { color: "rgba(255,255,255,0.1)", width: 1 },
            },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: "#22c55e",
            downColor: "#ef4444",
            borderVisible: false,
            wickUpColor: "#22c55e",
            wickDownColor: "#ef4444",
        });

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;

        const formatted = candles.map((c) => ({
            time: (c.openTime / 1000) as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));

        candleSeries.setData(formatted);

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                });
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
        // only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!candleSeriesRef.current) return;

        const formatted = candles.map((c) => ({
            time: (c.openTime / 1000) as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));

        candleSeriesRef.current.setData(formatted);
    }, [candles]);

    return (
        <div
            ref={chartContainerRef}
            style={{
                width: "100%",
                height: "440px",
            }}
        />
    );
}
