"use client";
import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, createSeriesMarkers } from "lightweight-charts";
import { useOHLCV, usePatterns } from "@/lib/hooks";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorDisplay } from "@/components/ui/ErrorBoundary";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarChart2 } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { logger } from "@/lib/utils";

const TIMEFRAMES = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1d", label: "1D" },
];

interface CandlestickChartProps {
  symbol: string;
}

export function CandlestickChart({ symbol }: CandlestickChartProps) {
  const [timeframe, setTimeframe] = useState("15m");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null);

  const {
    data: candles,
    isLoading,
    error,
    refetch,
  } = useOHLCV(symbol, timeframe);

  const { data: patterns } = usePatterns(symbol);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    logger.info("CandlestickChart", `Initializing chart for ${symbol}`);

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "hsl(222, 40%, 7%)" },
        textColor: "hsl(215, 15%, 55%)",
      },
      grid: {
        vertLines: { color: "hsl(222, 25%, 13%)" },
        horzLines: { color: "hsl(222, 25%, 13%)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: "hsl(222, 25%, 18%)",
      },
      timeScale: {
        borderColor: "hsl(222, 25%, 18%)",
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 420,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "hsl(158, 64%, 52%)",
      downColor: "hsl(0, 84%, 60%)",
      borderUpColor: "hsl(158, 64%, 52%)",
      borderDownColor: "hsl(0, 84%, 60%)",
      wickUpColor: "hsl(158, 64%, 52%)",
      wickDownColor: "hsl(0, 84%, 60%)",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Resize observer
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        chart.applyOptions({ width: entries[0].contentRect.width });
      }
    });
    observer.observe(chartContainerRef.current);

    return () => {
      logger.info("CandlestickChart", "Removing chart");
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol]);

  // Update data
  useEffect(() => {
    if (!seriesRef.current || !candles) return;
    if (candles.length === 0) {
      logger.warn("CandlestickChart", "No candle data returned for", symbol, timeframe);
      return;
    }

    logger.info("CandlestickChart", `Setting ${candles.length} candles for ${symbol} @${timeframe}`);

    const sorted = [...candles].sort((a, b) => a.time - b.time);
    seriesRef.current.setData(sorted);

    // Add pattern markers via v4 plugin API
    if (patterns && patterns.length > 0 && seriesRef.current) {
      const markers = patterns
        .filter((p) => {
          const ts = Math.floor(new Date(p.detected_at).getTime() / 1000);
          return sorted.some((c) => c.time === ts);
        })
        .slice(0, 20)
        .map((p) => ({
          time: Math.floor(new Date(p.detected_at).getTime() / 1000) as number,
          position: (p.signal_direction === "bullish" ? "belowBar" : "aboveBar") as "belowBar" | "aboveBar",
          color: p.signal_direction === "bullish" ? "hsl(158,64%,52%)" : "hsl(0,84%,60%)",
          shape: (p.signal_direction === "bullish" ? "arrowUp" : "arrowDown") as "arrowUp" | "arrowDown",
          text: p.pattern_name.replace("CDL", "").toLowerCase(),
        }));

      if (markers.length > 0) {
        try {
          const markersPlugin = createSeriesMarkers(seriesRef.current, markers);
          logger.info("CandlestickChart", `Added ${markers.length} pattern markers via createSeriesMarkers`);
          // Store so we can clean up if needed (currently just let it persist)
          void markersPlugin;
        } catch (e) {
          logger.warn("CandlestickChart", "Could not add markers:", e);
        }
      }
    }

    chartRef.current?.timeScale().fitContent();
  }, [candles, patterns, symbol, timeframe]);

  return (
    <div className="glass-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">{symbol}</span>
          <span className="text-xs text-muted">Candlestick</span>
        </div>
        <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1 border border-border-subtle">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => {
                logger.info("CandlestickChart", `Switching to timeframe ${tf.value}`);
                setTimeframe(tf.value);
              }}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                timeframe === tf.value
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground"
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80">
            <Spinner size="lg" />
          </div>
        )}
        {error && (
          <div className="p-6">
            <ErrorDisplay
              error={error as Error}
              onRetry={() => refetch()}
              message="Failed to load chart data"
            />
          </div>
        )}
        {!isLoading && !error && candles?.length === 0 && (
          <div className="py-12">
            <EmptyState
              icon={BarChart2}
              title="No chart data"
              description={`No OHLCV data found for ${symbol} at ${timeframe} timeframe.`}
            />
          </div>
        )}
        <div
          ref={chartContainerRef}
          className={cn(
            "w-full",
            (!candles || candles.length === 0) && "hidden"
          )}
        />
      </div>
    </div>
  );
}
