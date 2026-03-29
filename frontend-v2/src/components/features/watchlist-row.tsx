"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ChevronRight, Star, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/mock-data";

interface WatchlistRowProps {
  signal: Signal;
  index: number;
  onRemove: (symbol: string) => void;
  onNavigate: (symbol: string) => void;
}

export function WatchlistRow({ signal, index, onRemove, onNavigate }: WatchlistRowProps) {
  const isUp = signal.priceChange >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="group relative mx-4 rounded-2xl border border-border-subtle bg-surface overflow-hidden
                 hover:bg-surface-2 transition-colors"
    >
      {/* Delete button revealed on hover/long-press (desktop: hover; mobile: swipe sim) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <button
          onClick={() => onRemove(signal.symbol)}
          className="p-2 rounded-xl bg-bearish/15 text-bearish hover:bg-bearish/30 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        className="w-full text-left p-4 pr-12"
        onClick={() => onNavigate(signal.symbol)}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: symbol + company */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-black text-lg text-foreground tracking-tight">{signal.symbol}</span>
              {/* Signal badge when a signal exists */}
              {signal.confluenceScore > 0 && (
                <span className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                  signal.confluenceScore === 3 ? "bg-accent/15 text-accent" : "bg-surface-3 text-muted"
                )}>
                  <Zap className="w-2.5 h-2.5" />
                  {signal.confluenceScore === 3 ? "Signal: HIGH" : signal.confluenceScore === 2 ? "Signal: MED" : "Signal"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted truncate">{signal.companyName}</p>
          </div>

          {/* Right: price + change */}
          <div className="text-right flex-shrink-0 flex items-center gap-3">
            <div>
              <div className="text-base font-bold font-mono text-foreground">
                ₹{signal.price.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
              </div>
              <div className={cn("flex items-center justify-end gap-0.5 text-sm font-semibold", isUp ? "text-bullish" : "text-bearish")}>
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isUp ? "+" : ""}{signal.priceChangePct.toFixed(2)}%
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-border" />
          </div>
        </div>
      </button>
    </motion.div>
  );
}
