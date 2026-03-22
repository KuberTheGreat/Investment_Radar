"use client";
import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  createSeriesMarkers,
  Time,
} from "lightweight-charts";
import type { OHLCCandle, PatternMarker } from "@/lib/api";

interface CandlestickChartProps {
  candles: OHLCCandle[];
  patterns?: PatternMarker[];
  height?: number;
}

export default function CandlestickChart({ candles, patterns = [], height = 400 }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0d1117" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#1f2937" },
      timeScale: { borderColor: "#1f2937", timeVisible: true },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#10b981",
      wickDownColor: "#ef4444",
      wickUpColor: "#10b981",
    });

    series.setData(
      candles.map((c) => ({
        time: c.time as unknown as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    // v5 API: createSeriesMarkers instead of series.setMarkers
    if (patterns.length > 0) {
      const markers = patterns
        .map((p) => ({
          time: Math.floor(new Date(p.detected_at).getTime() / 1000) as unknown as Time,
          position: p.signal_direction === "bullish" ? ("belowBar" as const) : ("aboveBar" as const),
          color: p.signal_direction === "bullish" ? "#10b981" : "#ef4444",
          shape: p.signal_direction === "bullish" ? ("arrowUp" as const) : ("arrowDown" as const),
          text: p.pattern_name.replace("CDL", "").replace(/([A-Z])/g, " $1").trim(),
        }))
        .sort((a, b) => (a.time > b.time ? 1 : -1));
      createSeriesMarkers(series, markers);
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [candles, patterns, height]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden border"
      style={{ height, borderColor: "var(--border)" }}
    />
  );
}
