import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, ChevronRight, Star, Zap } from "lucide-react";
import { ConfluenceDots } from "@/components/ui/confluence-dots";
import { cn } from "@/lib/utils";
import { useLivePrice } from "@/hooks/use-live-price";
import type { Signal } from "@/lib/mock-data";

interface CompactSignalCardProps {
  signal: Signal;
  index: number;
  onAddToWatchlist?: (symbol: string) => void;
}

export function CompactSignalCard({ signal, index, onAddToWatchlist }: CompactSignalCardProps) {
  const router = useRouter();
  const livePrice = useLivePrice(signal.symbol, signal.price);
  
  // Base daily change from last close.
  // We approximate yesterday's close by reversing the initial priceChange
  const prevClose = signal.price - signal.priceChange;
  const liveChange = livePrice - prevClose;
  const liveChangePct = prevClose > 0 ? (liveChange / prevClose) * 100 : 0;
  
  const isUp = liveChange >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
      className="mx-4 rounded-2xl border border-border-subtle bg-surface hover:bg-surface-2 
                 transition-colors duration-200 cursor-pointer overflow-hidden relative group"
      onClick={() => router.push(`/stock/${signal.symbol}`)}
    >
      <div className="p-4 relative z-10 bg-surface/50">
        {/* Top row */}
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-lg tracking-tight text-foreground">{signal.symbol}</span>
              {signal.confluenceScore === 3 && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 flex items-center gap-0.5">
                  <Zap className="w-2 h-2" /> Top
                </span>
              )}
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                signal.direction === "bullish" ? "badge-bullish" : "badge-bearish"
              )}>
                {signal.direction === "bullish" ? "↑" : "↓"} {signal.direction}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-foreground font-medium">{signal.pattern}</span>
              <span className="text-muted text-xs">· {signal.timeframe} · {signal.detectedAt}</span>
            </div>
          </div>

          {/* Price */}
          <div className="text-right shrink-0">
            <motion.div
              key={livePrice} // Re-renders slightly on change to show life
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.3 }}
              className={cn("text-base font-bold font-mono transition-colors", isUp ? "text-bullish" : "text-bearish")}
            >
              ₹{livePrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </motion.div>
            <div className={cn("flex items-center justify-end gap-0.5 text-sm font-semibold mt-0.5", isUp ? "text-bullish" : "text-bearish")}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isUp ? "+" : ""}{liveChangePct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* One liner */}
        <p className="text-xs text-muted leading-relaxed mb-3 line-clamp-2">
          {signal.oneLiner}
        </p>

        {/* Bottom strip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConfluenceDots score={signal.confluenceScore} size="sm" />
            <div className="text-[11px] text-muted">
              <span className="text-foreground font-semibold">{signal.winRate5d}%</span> win rate
            </div>
            {signal.eventHighlight && (
              <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full truncate max-w-[100px]">
                {signal.eventHighlight}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onAddToWatchlist?.(signal.symbol); }}
              className="p-1.5 rounded-full hover:bg-surface-3 transition-colors group/btn"
              title="Add to Watchlist"
            >
              <Star className="w-3.5 h-3.5 text-muted group-hover/btn:text-warning group-hover/btn:fill-warning transition-colors" />
            </button>
            <ChevronRight className="w-4 h-4 text-border group-hover:text-foreground transition-colors" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
