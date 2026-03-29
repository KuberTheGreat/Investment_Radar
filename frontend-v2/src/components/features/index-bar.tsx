"use client";

import { useState } from "react";
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { MOCK_INDICES } from "@/lib/mock-data";

export function IndexBar() {
  const [expanded, setExpanded] = useState(false);
  
  // Show only Nifty 50 when collapsed
  const primaryIndex = MOCK_INDICES[0];
  const isPrimaryUp = primaryIndex.change >= 0;

  return (
    <div className="w-full bg-surface-2 border-y border-border-subtle overflow-hidden">
      {/* Primary Collapsed View */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-wide text-foreground">{primaryIndex.name}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-mono text-muted">{formatNumber(primaryIndex.value)}</span>
            <span className={cn("text-xs font-semibold flex items-center", isPrimaryUp ? "text-bullish" : "text-bearish")}>
              {isPrimaryUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {isPrimaryUp ? "+" : ""}{formatNumber(primaryIndex.changePct)}%
            </span>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted transition-transform duration-300", expanded ? "rotate-180" : "rotate-0")} />
      </button>

      {/* Expanded View */}
      <div 
        className={cn(
          "grid grid-cols-2 gap-px bg-border-subtle transition-all duration-300 origin-top",
          expanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {MOCK_INDICES.slice(1).map((idx) => {
          const isUp = idx.change >= 0;
          return (
            <div key={idx.name} className="bg-surface-2 p-3 flex flex-col justify-center">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1">{idx.name}</span>
              <span className="text-sm font-mono font-medium text-foreground mb-0.5">{formatNumber(idx.value)}</span>
              <span className={cn("text-xs font-semibold", isUp ? "text-bullish" : "text-bearish")}>
                {isUp ? "+" : ""}{formatNumber(idx.changePct)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
