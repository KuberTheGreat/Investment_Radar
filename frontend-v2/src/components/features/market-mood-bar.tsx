import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/mock-data";

interface MarketMoodBarProps {
  signals: Signal[];
}

export function MarketMoodBar({ signals }: MarketMoodBarProps) {
  const bullishCount = signals.filter(s => s.direction === "bullish").length;
  const bearishCount = signals.filter(s => s.direction === "bearish").length;
  const total = bullishCount + bearishCount || 1;
  const bullishPct = Math.round((bullishCount / total) * 100);

  return (
    <div className="mx-4 rounded-2xl bg-surface border border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground">Market Mood</span>
        <span className="text-xs text-muted">{signals.length} signals today</span>
      </div>

      {/* Bar */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-bearish/20 mb-2.5">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-bullish to-bullish/70 rounded-full transition-all duration-700"
          style={{ width: `${bullishPct}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-bullish">🐂 Bullish · {bullishCount}</span>
        <span className={cn(
          "font-bold",
          bullishPct > 50 ? "text-bullish" : "text-bearish"
        )}>
          {bullishPct}% Bullish
        </span>
        <span className="text-bearish">{bearishCount} · Bearish 🐻</span>
      </div>
    </div>
  );
}
