"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, AlertTriangle } from "lucide-react";
import Link from "next/link";
import {
  fetchOHLCV,
  fetchPatterns,
  fetchEvents,
  fetchSignalDetail,
} from "@/lib/api";
import CandlestickChart from "@/components/CandlestickChart";
import ExplainPanel from "@/components/ExplainPanel";
import { SkeletonChart, SkeletonText } from "@/components/Skeleton";

const TIMEFRAMES = ["5m", "15m", "1d"] as const;
type TF = (typeof TIMEFRAMES)[number];

const CHART_HEIGHTS: Record<TF, number> = { "5m": 300, "15m": 350, "1d": 400 };

function BacktestRow({ label, value, suffix = "" }: { label: string; value?: number | null; suffix?: string }) {
  return (
    <div className="flex justify-between py-2 border-b text-sm" style={{ borderColor: "var(--border-subtle)" }}>
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200 font-medium">
        {value !== null && value !== undefined ? `${value.toFixed(1)}${suffix}` : "—"}
      </span>
    </div>
  );
}

export default function StockDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const symbol = (params.symbol as string).toUpperCase();
  const signalId = searchParams.get("signal");
  const [timeframe, setTimeframe] = useState<TF>("15m");

  const { data: candles, isLoading: candlesLoading } = useQuery({
    queryKey: ["ohlcv", symbol, timeframe],
    queryFn: () => fetchOHLCV(symbol, timeframe),
  });

  const { data: patterns } = useQuery({
    queryKey: ["patterns", symbol],
    queryFn: () => fetchPatterns(symbol),
  });

  const { data: events } = useQuery({
    queryKey: ["events", symbol],
    queryFn: () => fetchEvents(symbol),
  });

  const { data: signal } = useQuery({
    queryKey: ["signal", signalId],
    queryFn: () => fetchSignalDetail(signalId!),
    enabled: !!signalId,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft size={15} />
          Signal Feed
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-300 font-semibold">{symbol}</span>
      </div>

      {/* Symbol header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold text-slate-100">{symbol}</h1>
        {signal?.pattern && (
          <span
            className="px-3 py-1 rounded-lg text-sm font-medium"
            style={
              signal.pattern.signal_direction === "bullish"
                ? { background: "#10b98120", color: "#10b981" }
                : { background: "#ef444420", color: "#ef4444" }
            }
          >
            {signal.pattern.signal_direction === "bullish" ? "▲" : "▼"} {signal.pattern.pattern_name?.replace("CDL", "")}
          </span>
        )}
        {signal?.low_confidence && (
          <span
            className="px-2 py-1 rounded text-xs text-amber-400 border border-amber-400/30"
            title="Low confidence — fewer than 5 historical samples for this pattern"
          >
            ⚠ Low Confidence
          </span>
        )}
      </div>

      {/* Timeframe toggle */}
      <div className="flex gap-1 mb-4">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={
              timeframe === tf
                ? { background: "#10b981", color: "#0a0a0a" }
                : { color: "#64748b", border: "1px solid #374151" }
            }
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="mb-6">
        {candlesLoading ? (
          <SkeletonChart />
        ) : candles && candles.length > 0 ? (
          <CandlestickChart candles={candles} patterns={patterns} height={CHART_HEIGHTS[timeframe]} />
        ) : (
          <div className="rounded-xl border flex items-center justify-center" style={{ height: CHART_HEIGHTS[timeframe], borderColor: "var(--border)", background: "var(--bg-card)" }}>
            <p className="text-slate-500 text-sm">No OHLCV data available for {symbol} ({timeframe})</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Backtest + Events */}
        <div className="lg:col-span-1 space-y-4">
          {/* Backtest metrics */}
          {signal && (
            <div className="rounded-xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <h2 className="text-sm font-semibold text-slate-300 mb-2">Backtest Metrics</h2>
              <BacktestRow label="Win Rate (5d)" value={signal.win_rate_5d} suffix="%" />
              <BacktestRow label="Win Rate (15d)" value={signal.win_rate_15d} suffix="%" />
              <BacktestRow label="Confluence Score" value={signal.confluence_score} suffix="/3" />
              <BacktestRow label="Signal Rank" value={signal.signal_rank} />
            </div>
          )}

          {/* Corporate events */}
          {events && events.length > 0 && (
            <div className="rounded-xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Corporate Events</h2>
              <div className="space-y-3">
                {events.map((e) => (
                  <div key={e.id} className="pb-2 border-b text-xs" style={{ borderColor: "var(--border-subtle)" }}>
                    <div className="flex items-center gap-1 mb-0.5">
                      {e.is_anomaly && <AlertTriangle size={10} color="#f59e0b" />}
                      <span className="font-medium text-slate-300 capitalize">{e.event_type?.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-slate-500">{e.party_name}</p>
                    {e.total_value_cr && (
                      <p className="text-slate-400">₹ {e.total_value_cr.toFixed(2)} Cr · {e.event_date}</p>
                    )}
                    {e.source_reference && e.source_reference.startsWith("http") && (
                      <a href={e.source_reference} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-0.5">
                        <ExternalLink size={9} /> Source
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: LLM Explanation */}
        <div className="lg:col-span-2">
          {signalId ? (
            <ExplainPanel signalId={signalId} paragraph={signal?.paragraph_explanation} />
          ) : (
            <div className="rounded-xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">AI Analysis</h3>
              <SkeletonText lines={4} />
              <p className="text-xs text-slate-600 mt-4">Select a signal from the feed to see the AI explanation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
