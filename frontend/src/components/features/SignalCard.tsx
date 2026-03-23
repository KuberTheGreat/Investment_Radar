"use client";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Signal } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfluenceScore } from "./ConfluenceScore";
import {
  formatPercent,
  formatTimeAgo,
  getSignalTypeBg,
} from "@/lib/utils";
import { cn } from "@/components/ui/cn";

interface SignalCardProps {
  signal: Signal;
  compact?: boolean;
}

export function SignalCard({ signal, compact = false }: SignalCardProps) {
  const isBullish = signal.signal_type === "opportunity";
  // Determine direction from pattern if available
  const directionHint = signal.high_confluence ? "bullish" : undefined;

  return (
    <Link href={`/signals/${signal.id}`} className="block">
      <Card
        hover
        className={cn(
          "animate-fade-in transition-all duration-200",
          signal.high_confluence &&
            "border-bullish/20 hover:border-bullish/40 hover:shadow-glow-bullish"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold",
                isBullish
                  ? "bg-bullish/10 text-bullish border border-bullish/20"
                  : "bg-amber/10 text-amber border border-amber/20"
              )}
            >
              {signal.symbol.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {signal.symbol}
              </p>
              <p className="text-xs text-muted">
                {formatTimeAgo(signal.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {signal.low_confidence && (
              <span title="Low confidence">
                <AlertTriangle className="w-3.5 h-3.5 text-amber" />
              </span>
            )}
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", getSignalTypeBg(signal.signal_type))}>
              {signal.signal_type === "opportunity" ? "Opportunity" : "Pattern"}
            </span>
          </div>
        </div>

        {/* Confluence */}
        <div className="mb-3">
          <ConfluenceScore score={signal.confluence_score} size="sm" />
        </div>

        {/* AI one-liner */}
        {!compact && signal.one_liner && (
          <p className="text-xs text-muted leading-relaxed mb-3 line-clamp-2">
            {signal.one_liner}
          </p>
        )}

        {/* Win rates */}
        {(signal.win_rate_5d != null || signal.win_rate_15d != null) && (
          <div className="flex gap-4 mb-3">
            {signal.win_rate_5d != null && (
              <div>
                <p className="text-[10px] text-muted-2 mb-0.5">5D Win Rate</p>
                <p className={cn(
                    "text-xs font-semibold",
                    signal.win_rate_5d >= 60 ? "text-bullish" : "text-muted"
                  )}
                >
                  {formatPercent(signal.win_rate_5d)}
                </p>
              </div>
            )}
            {signal.win_rate_15d != null && (
              <div>
                <p className="text-[10px] text-muted-2 mb-0.5">15D Win Rate</p>
                <p className={cn(
                    "text-xs font-semibold",
                    signal.win_rate_15d >= 60 ? "text-bullish" : "text-muted"
                  )}
                >
                  {formatPercent(signal.win_rate_15d)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
          <div className="flex gap-1.5">
            {signal.high_confluence && (
              <Badge variant="bullish" dot>High Confluence</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors">
            <span>View</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
