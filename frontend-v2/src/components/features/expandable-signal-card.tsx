"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Star, ArrowUpRight, ChevronDown } from "lucide-react";
import { ConfluenceDots } from "@/components/ui/confluence-dots";
import { cn } from "@/lib/utils";
import { radarApi } from "@/lib/api";
import { useLivePrice } from "@/hooks/use-live-price";
import type { Signal } from "@/lib/mock-data";

interface ExpandableSignalCardProps {
  signal: Signal;
  index: number;
  isWatchlisted?: boolean;
  onWatchlist?: (symbol: string) => void;
}

/** Mini Sparkline component built from OHLCV close prices */
function SparklineChart({ symbol }: { symbol: string }) {
  const { data: ohlcv = [], isLoading } = useQuery({
    queryKey: ["ohlcv-sparkline", symbol],
    queryFn: () => radarApi.getStockOHLCV(symbol, "15m"),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="h-14 rounded-xl bg-surface-3 animate-pulse flex items-center justify-center">
        <span className="text-[10px] text-muted">Loading chart…</span>
      </div>
    );
  }

  const closes = ohlcv.slice(-40).map((c: any) => c.close ?? c.c ?? 0).filter((v: number) => v > 0) as number[];

  if (closes.length < 2) {
    return (
      <div className="h-14 rounded-xl bg-surface-3 flex items-center justify-center">
        <span className="text-[10px] text-muted">No recent price data</span>
      </div>
    );
  }

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const w = 300;
  const h = 48;
  const step = w / (closes.length - 1);
  const toY = (v: number) => h - ((v - min) / range) * h;

  const points = closes.map((v, i) => `${i * step},${toY(v)}`).join(" ");
  const isUp = closes[closes.length - 1] >= closes[0];

  return (
    <div className="h-14 rounded-xl bg-surface-3 overflow-hidden px-1 py-1">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={isUp ? "var(--color-bullish)" : "var(--color-bearish)"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function ExpandableSignalCard({ signal, index, isWatchlisted = false, onWatchlist }: ExpandableSignalCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  
  // Live SSE Price State
  const livePrice = useLivePrice(signal.symbol, signal.price);
  
  // Base daily change from last close.
  const prevClose = signal.price - signal.priceChange;
  const liveChange = livePrice - prevClose;
  const liveChangePct = prevClose > 0 ? (liveChange / prevClose) * 100 : 0;
  const isUp = liveChange >= 0;

  const directionLower = signal.direction?.toLowerCase() ?? "bullish";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={cn(
        "mx-4 rounded-2xl border transition-all duration-300 overflow-hidden relative",
        expanded ? "border-accent/40 bg-surface-2" : "border-border-subtle bg-surface hover:bg-surface-2"
      )}
    >
      {/* Dynamic blink effect on tick */}
      <motion.div
        key={livePrice}
        initial={{ opacity: 0.3 }}
        animate={{ opacity: 0 }}
        className={cn("absolute inset-0 z-0 pointer-events-none", isUp ? "bg-bullish/5" : "bg-bearish/5")}
        transition={{ duration: 0.8 }}
      />

      {/* Always-visible header — tap to expand */}
      <button
        className="w-full p-4 text-left relative z-10 bg-transparent"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-black text-lg text-foreground tracking-tight">{signal.symbol}</span>
              <span className="text-xs text-muted font-medium truncate">{signal.companyName}</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                directionLower === "bullish" ? "badge-bullish" : "badge-bearish"
              )}>
                {directionLower === "bullish" ? "↑" : "↓"} {directionLower}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-medium text-foreground">{signal.pattern}</span>
              <span>·</span>
              <span>{signal.timeframe}</span>
              <span>·</span>
              <span>{signal.detectedAt}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <motion.div 
                key={livePrice}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 0.3 }}
                className={cn("text-sm font-bold font-mono transition-colors", isUp ? "text-bullish" : "text-bearish")}
              >
                {livePrice > 0 ? `₹${livePrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              </motion.div>
              {livePrice > 0 && (
                <div className={cn("text-xs font-semibold flex items-center justify-end gap-0.5 mt-0.5", isUp ? "text-bullish" : "text-bearish")}>
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isUp ? "+" : ""}{liveChangePct.toFixed(2)}%
                </div>
              )}
            </div>
            <ChevronDown className={cn("w-4 h-4 text-muted transition-transform duration-300", expanded ? "rotate-180" : "")} />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2.5">
          <ConfluenceDots score={signal.confluenceScore} size="sm" />
          <span className="text-[11px] text-muted">
            <span className="text-foreground font-semibold">
              {signal.winRate5d > 0 ? `${signal.winRate5d}%` : "—"}
            </span>
            {signal.winRate5d > 0 && " · 5D win rate"}
          </span>
          {signal.eventHighlight && (
            <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full font-medium">
              {signal.eventHighlight}
            </span>
          )}
        </div>
      </button>

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden relative z-10 bg-transparent"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border-subtle pt-4">
              {/* Live sparkline chart */}
              <SparklineChart symbol={signal.symbol} />

              {/* What this means */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">What this means</p>
                <p className="text-sm text-muted leading-relaxed">
                  &ldquo;{signal.oneLiner}&rdquo;
                </p>
              </div>

              {/* Why we're confident */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Why we&apos;re confident</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-bullish">✅</span>
                    <span className="text-foreground">Pattern detected on {signal.timeframe} chart</span>
                  </div>
                  {signal.winRate5d > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-bullish">✅</span>
                      <span className="text-foreground">Historical win rate: <span className="font-bold text-bullish">{signal.winRate5d}%</span> (5-day)</span>
                    </div>
                  )}
                  {signal.eventHighlight && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-bullish">✅</span>
                      <span className="text-foreground">{signal.eventHighlight}</span>
                    </div>
                  )}
                  {signal.confluenceScore < 2 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted">❌</span>
                      <span className="text-muted">No major corporate event confirmation</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => router.push(`/stock/${signal.symbol}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent/10 text-accent text-sm font-semibold hover:bg-accent/20 transition-colors"
                >
                  Full Analysis <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onWatchlist?.(signal.symbol); }}
                  className={cn(
                    "flex items-center justify-center p-2 rounded-xl border transition-all duration-200",
                    isWatchlisted ? "border-warning bg-warning/10 text-warning" : "border-border-subtle bg-surface-3 text-muted hover:text-warning"
                  )}
                >
                  <Star className={cn("w-4 h-4 transition-all", isWatchlisted ? "fill-warning" : "")} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
