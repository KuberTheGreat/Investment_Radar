import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CorporateEvent } from "@/lib/mock-candles";

interface CorporateEventsPanelProps {
  events: CorporateEvent[];
  symbol: string;
}

const EVENT_CONFIG = {
  insider_buy:  { icon: "💼", label: "Insider Buy",  color: "text-bullish bg-bullish/10" },
  insider_sell: { icon: "💼", label: "Insider Sell", color: "text-bearish bg-bearish/10" },
  bulk_deal:    { icon: "📦", label: "Bulk Deal",    color: "text-accent  bg-accent/10"  },
  block_deal:   { icon: "🧱", label: "Block Deal",   color: "text-accent  bg-accent/10"  },
  anomaly:      { icon: "⚡", label: "Anomaly",       color: "text-warning bg-warning/10" },
} as const;

export function CorporateEventsPanel({ events, symbol }: CorporateEventsPanelProps) {
  return (
    <div className="mx-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground">Corporate Events</h2>
        <span className="text-[10px] text-muted">{symbol}</span>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl bg-surface border border-border-subtle py-8 flex flex-col items-center">
          <span className="text-2xl mb-2">📋</span>
          <p className="text-xs text-muted">No recent corporate events</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {events.map((ev, i) => {
            const cfg = EVENT_CONFIG[ev.type as keyof typeof EVENT_CONFIG] || {
              icon: "📌",
              label: ev.type.replace(/_/g, " "),
              color: "text-muted bg-surface-2"
            };
            const isRecent = ev.daysAgo <= 5;
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-2xl border transition-colors",
                  isRecent
                    ? "border-accent/20 bg-accent/5"
                    : "border-border-subtle bg-surface"
                )}
              >
                {/* Icon */}
                <div className="w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center text-base flex-shrink-0">
                  {cfg.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full capitalize", cfg.color)}>
                      {cfg.label}
                    </span>
                    {isRecent && (
                      <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                        Recent
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground font-medium">
                    {ev.description}
                    {ev.amount && <span className="text-accent ml-1">· {ev.amount}</span>}
                  </p>
                </div>

                {/* Date */}
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-muted">{ev.date}</p>
                  <p className={cn("text-[10px] font-medium", isRecent ? "text-accent" : "text-muted")}>
                    {ev.daysAgo}d ago
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
