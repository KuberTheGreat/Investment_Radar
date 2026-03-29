import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PatternHistory } from "@/lib/mock-candles";

interface PatternHistoryTableProps {
  history: PatternHistory[];
  symbol: string;
  patternName: string;
}

export function PatternHistoryTable({ history, symbol, patternName }: PatternHistoryTableProps) {
  const wins = history.filter(h => h.resultPct > 0).length;
  const total = history.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  return (
    <div className="mx-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground">Pattern Track Record</h2>
        <span className="text-[10px] text-muted">{patternName} on {symbol}</span>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-4 gap-2 px-4 py-2.5 bg-surface-2 border-b border-border-subtle">
          {["Date", "Timeframe", "Dir.", "5D Result"].map(h => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {history.map((row, i) => {
          const isWin = row.resultPct > 0;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "grid grid-cols-4 gap-2 px-4 py-3 items-center border-b border-border-subtle/50",
                i % 2 === 0 ? "bg-surface" : "bg-surface-2/50",
                "last:border-b-0"
              )}
            >
              <span className="text-[11px] text-muted">{row.date.split(" ").slice(0, 2).join(" ")}</span>
              <span className="text-[11px] text-foreground font-medium">{row.timeframe}</span>
              <span className={cn("text-[10px] font-bold", row.direction === "bullish" ? "text-bullish" : "text-bearish")}>
                {row.direction === "bullish" ? "↑" : "↓"}
              </span>
              <span className={cn(
                "text-xs font-bold font-mono inline-flex items-center rounded-md px-1.5 py-0.5 w-fit",
                isWin ? "text-bullish bg-bullish/10" : "text-bearish bg-bearish/10"
              )}>
                {isWin ? "+" : ""}{row.resultPct.toFixed(1)}%
              </span>
            </motion.div>
          );
        })}

        {/* Summary footer */}
        <div className="px-4 py-3 bg-surface-2 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted">
            {wins} wins, {total - wins} losses · {total} occurrences
          </span>
          <span className={cn("text-sm font-black", winRate >= 60 ? "text-bullish" : "text-muted")}>
            {winRate}% win rate
          </span>
        </div>
      </div>
    </div>
  );
}
