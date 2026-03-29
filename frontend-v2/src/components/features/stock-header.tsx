"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Share2, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/mock-data";

interface StockHeaderProps {
  signal: Signal;
  isWatchlisted?: boolean;
  onWatchlistToggle?: () => void;
}

export function StockHeader({ signal, isWatchlisted = false, onWatchlistToggle }: StockHeaderProps) {
  const router = useRouter();
  const [starred, setStarred] = useState(isWatchlisted);
  const isUp = signal.priceChange >= 0;

  const handleStar = () => {
    setStarred(s => !s);
    onWatchlistToggle?.();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${signal.symbol} Signal — ${signal.pattern}`,
        text: signal.oneLiner,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border-subtle">
      {/* Main header row */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>

        {/* Symbol + Company */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black tracking-tight text-foreground leading-none">{signal.symbol}</h1>
          <p className="text-xs text-muted mt-0.5 truncate">{signal.companyName}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors"
          >
            <Share2 className="w-4 h-4 text-muted" />
          </button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleStar}
            className={cn(
              "p-2 rounded-xl border transition-all duration-200",
              starred
                ? "bg-warning/15 border-warning/40"
                : "bg-surface-2 border-border-subtle hover:bg-surface-3"
            )}
          >
            <Star className={cn("w-4 h-4 transition-all", starred ? "text-warning fill-warning" : "text-muted")} />
          </motion.button>
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-end justify-between px-4 pb-3">
        <div>
          <div className="text-3xl font-black font-mono text-foreground tracking-tight leading-none">
            ₹{signal.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className={cn(
            "flex items-center gap-1.5 mt-1.5 text-sm font-semibold",
            isUp ? "text-bullish" : "text-bearish"
          )}>
            {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {isUp ? "+" : ""}₹{Math.abs(signal.priceChange).toFixed(2)}
            <span className="text-xs">({isUp ? "+" : ""}{signal.priceChangePct.toFixed(2)}%)</span>
          </div>
        </div>

        {/* Signal direction pill */}
        <span className={cn(
          "px-3 py-1.5 rounded-xl text-xs font-bold",
          signal.direction === "bullish" ? "badge-bullish" : "badge-bearish"
        )}>
          {signal.direction === "bullish" ? "↑" : "↓"} {signal.pattern} · {signal.timeframe}
        </span>
      </div>
    </div>
  );
}
