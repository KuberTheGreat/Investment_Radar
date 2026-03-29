"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  createSeriesMarkers,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type Time,
} from "lightweight-charts";

import { generateMockCandles } from "@/lib/mock-candles";
import type { Timeframe } from "@/components/features/timeframe-selector";
import { cn } from "@/lib/utils";

interface CandlestickChartProps {
  symbol: string;
  timeframe: Timeframe;
}

function ChartSkeleton() {
  return (
    <div className="w-full h-full flex flex-col justify-end gap-1 px-4 pt-6 pb-4">
      {[40, 60, 50, 75, 55, 70, 45, 88, 68, 52, 76, 60].map((h, i) => (
        <div key={i} className="skeleton rounded" style={{ height: `${h / 3}px` }} />
      ))}
      <p className="text-center text-xs text-muted mt-3">Loading chart…</p>
    </div>
  );
}

export function CandlestickChart({ symbol, timeframe }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setLoading(true);
    setHasData(true);

    // Clean up any existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "hsl(222, 20%, 7%)" },
        textColor: "hsl(215, 20%, 45%)",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "hsl(220, 15%, 13%)" },
        horzLines: { color: "hsl(220, 15%, 13%)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "hsl(199, 89%, 55%)",
          width: 1,
          style: 3,
          labelBackgroundColor: "hsl(199, 89%, 40%)",
        },
        horzLine: {
          color: "hsl(199, 89%, 55%)",
          width: 1,
          style: 3,
          labelBackgroundColor: "hsl(199, 89%, 40%)",
        },
      },
      rightPriceScale: {
        borderColor: "hsl(220, 15%, 22%)",
        scaleMargins: { top: 0.06, bottom: 0.22 },
      },
      timeScale: {
        borderColor: "hsl(220, 15%, 22%)",
        timeVisible: true,
        secondsVisible: timeframe === "1m",
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      width: container.clientWidth,
      height: container.clientHeight,
    });

    chartRef.current = chart;

    // v5 API: addSeries(SeriesType, options)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "hsl(158, 64%, 52%)",
      downColor: "hsl(0, 70%, 65%)",
      borderUpColor: "hsl(158, 64%, 52%)",
      borderDownColor: "hsl(0, 70%, 65%)",
      wickUpColor: "hsl(158, 64%, 45%)",
      wickDownColor: "hsl(0, 70%, 58%)",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "hsla(199, 89%, 55%, 0.35)",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    const rawBars = generateMockCandles(timeframe, symbol);

    if (!rawBars.length) {
      setHasData(false);
      setLoading(false);
      return;
    }

    candleSeries.setData(
      rawBars.map(b => ({
        time: b.time as Time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }))
    );

    volumeSeries.setData(
      rawBars.map(b => ({
        time: b.time as Time,
        value: b.volume,
        color: b.close >= b.open
          ? "hsla(158, 64%, 52%, 0.3)"
          : "hsla(0, 70%, 65%, 0.3)",
      }))
    );

    // Signal arrow on last candle (v5 API: createSeriesMarkers)
    const lastBar = rawBars[rawBars.length - 1];
    createSeriesMarkers(candleSeries, [{
      time: lastBar.time as Time,
      position: "belowBar",
      color: "hsl(199, 89%, 55%)",
      shape: "arrowUp",
      text: "Signal",
      size: 1,
    }]);


    chart.timeScale().fitContent();
    setLoading(false);

    // Resize observer
    const ro = new ResizeObserver(() => {
      chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [symbol, timeframe]);

  const chartHeight = "h-[280px] sm:h-[360px] lg:h-[420px]";

  return (
    <div className="mx-4 rounded-2xl overflow-hidden border border-border-subtle bg-background relative">
      {/* Chart container — always mounted so the ref exists */}
      <div
        ref={containerRef}
        className={cn(chartHeight, "w-full", loading ? "invisible" : "visible")}
      />

      {/* Loading skeleton overlaid on top */}
      {loading && (
        <div className={cn("absolute inset-0", chartHeight)}>
          <ChartSkeleton />
        </div>
      )}

      {/* No-data fallback */}
      {!loading && !hasData && (
        <div className={cn("absolute inset-0 flex flex-col items-center justify-center", chartHeight)}>
          <span className="text-3xl mb-3">📊</span>
          <p className="text-sm font-medium text-foreground">No chart data available</p>
          <p className="text-xs text-muted mt-1">Try a different timeframe</p>
        </div>
      )}
    </div>
  );
}
