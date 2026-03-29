import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Star, ArrowRight, Zap } from "lucide-react";
import { ConfluenceDots } from "@/components/ui/confluence-dots";
import { cn } from "@/lib/utils";
import { useLivePrice } from "@/hooks/use-live-price";
import type { Signal } from "@/lib/mock-data";

interface HeroSignalCardProps {
  signal: Signal;
  onAddToWatchlist?: (symbol: string) => void;
}

export function HeroSignalCard({ signal, onAddToWatchlist }: HeroSignalCardProps) {
  const router = useRouter();
  const livePrice = useLivePrice(signal.symbol, signal.price);
  
  // Base daily change from last close.
  const prevClose = signal.price - signal.priceChange;
  const liveChange = livePrice - prevClose;
  const liveChangePct = prevClose > 0 ? (liveChange / prevClose) * 100 : 0;
  const isUp = liveChange >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative mx-4 rounded-2xl overflow-hidden cursor-pointer"
      onClick={() => router.push(`/stock/${signal.symbol}`)}
    >
      {/* Background gradient */}
      <div className={cn(
        "absolute inset-0 transition-colors duration-500",
        signal.direction === "bullish"
          ? "bg-gradient-to-br from-bullish/10 via-surface to-accent/5"
          : "bg-gradient-to-br from-bearish/10 via-surface to-accent/5"
      )} />

      {/* Glow border */}
      <div className={cn(
        "absolute inset-0 rounded-2xl border",
        signal.direction === "bullish" ? "border-bullish/25" : "border-bearish/25"
      )} />

      {/* Dynamic blink effect on tick */}
      <motion.div
        key={livePrice}
        initial={{ opacity: 0.3 }}
        animate={{ opacity: 0 }}
        className={cn("absolute inset-0 z-0 pointer-events-none", isUp ? "bg-bullish/10" : "bg-bearish/10")}
        transition={{ duration: 0.8 }}
      />

      <div className="relative p-5 z-10">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-3.5 h-3.5 text-warning fill-warning" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-warning">
                Today&apos;s Top Signal
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">{signal.symbol}</h2>
            <p className="text-xs text-muted mt-0.5">{signal.companyName}</p>
          </div>

          <div className="text-right">
            <motion.div 
              key={livePrice}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.3 }}
              className={cn("text-xl font-bold font-mono transition-colors", isUp ? "text-bullish" : "text-bearish")}
            >
              ₹{livePrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </motion.div>
            <div className={cn("flex items-center justify-end gap-1 text-sm font-semibold mt-0.5", isUp ? "text-bullish" : "text-bearish")}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isUp ? "+" : ""}
              {liveChangePct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Pattern info */}
        <div className="flex items-center gap-2 mb-3">
          <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold",
            signal.direction === "bullish" ? "badge-bullish" : "badge-bearish"
          )}>
            {signal.direction === "bullish" ? "↑" : "↓"} {signal.direction.charAt(0).toUpperCase() + signal.direction.slice(1)}
          </span>
          <span className="text-sm font-medium text-foreground">{signal.pattern}</span>
          <span className="text-xs text-muted">· {signal.timeframe}</span>
        </div>

        {/* One liner */}
        <p className="text-sm text-muted leading-relaxed mb-4">
          &ldquo;{signal.oneLiner}&rdquo;
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-5">
          <ConfluenceDots score={signal.confluenceScore} />
          <div className="h-4 w-px bg-border" />
          <div className="flex gap-3 text-xs">
            <div>
              <span className="text-muted">5D Win Rate</span>
              <span className={cn("ml-1.5 font-bold", signal.winRate5d >= 65 ? "text-bullish" : "text-muted")}>
                {signal.winRate5d}%
              </span>
            </div>
            <div>
              <span className="text-muted">15D</span>
              <span className={cn("ml-1.5 font-bold", signal.winRate15d >= 65 ? "text-bullish" : "text-muted")}>
                {signal.winRate15d}%
              </span>
            </div>
          </div>
          {signal.eventHighlight && (
            <>
              <div className="h-4 w-px bg-border" />
              <span className="text-xs font-medium text-accent">{signal.eventHighlight}</span>
            </>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(`/stock/${signal.symbol}`)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                       bg-accent text-background font-bold text-sm hover:bg-accent/90 transition-colors"
          >
            View Analysis <ArrowRight className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onAddToWatchlist?.(signal.symbol); }}
            className="flex items-center justify-center p-2.5 rounded-xl border border-border
                       bg-surface-2 hover:bg-surface-3 transition-colors group"
          >
            <Star className="w-4 h-4 text-muted group-hover:text-warning group-hover:fill-warning transition-colors" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
