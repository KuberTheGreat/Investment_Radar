"use client";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { SignalDetail } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfluenceScore } from "./ConfluenceScore";
import { CorporateEventItem } from "./CorporateEventItem";
import { AIExplainer } from "./AIExplainer";
import { formatTimeAgo, formatPercent } from "@/lib/utils";
import { cn } from "@/components/ui/cn";

interface SignalDetailPanelProps {
  signal: SignalDetail;
}

export function SignalDetailPanel({ signal }: SignalDetailPanelProps) {
  const patternDirection = signal.pattern?.signal_direction;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column: signal meta + pattern + events */}
      <div className="lg:col-span-2 space-y-5">
        {/* Hero banner */}
        <div
          className={cn(
            "glass-card p-5 border",
            signal.high_confluence
              ? "border-bullish/25 shadow-glow-bullish"
              : "border-border-subtle"
          )}
        >
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-bullish/10 border border-accent/20 flex items-center justify-center text-sm font-bold text-foreground">
                  {signal.symbol.slice(0, 2)}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    {signal.symbol}
                  </h1>
                  <p className="text-xs text-muted">
                    {formatTimeAgo(signal.created_at)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {signal.high_confluence && (
                <Badge variant="bullish" dot>High Confluence</Badge>
              )}
              {signal.low_confidence && (
                <Badge variant="amber">Low Confidence</Badge>
              )}
              <Badge
                variant={signal.signal_type === "opportunity" ? "accent" : "amber"}
              >
                {signal.signal_type === "opportunity" ? "Opportunity" : "Pattern"}
              </Badge>
            </div>
          </div>

          {/* Confluence */}
          <div className="mb-4">
            <p className="text-xs text-muted-2 mb-1.5">Confluence Score</p>
            <ConfluenceScore score={signal.confluence_score} size="md" />
          </div>

          {/* Win rates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-2 rounded-lg p-3 border border-border-subtle">
              <p className="text-[10px] text-muted-2 mb-1">5-Day Win Rate</p>
              <p
                className={cn(
                  "text-lg font-bold",
                  signal.win_rate_5d != null && signal.win_rate_5d >= 60
                    ? "text-bullish"
                    : "text-muted"
                )}
              >
                {formatPercent(signal.win_rate_5d)}
              </p>
            </div>
            <div className="bg-surface-2 rounded-lg p-3 border border-border-subtle">
              <p className="text-[10px] text-muted-2 mb-1">15-Day Win Rate</p>
              <p
                className={cn(
                  "text-lg font-bold",
                  signal.win_rate_15d != null && signal.win_rate_15d >= 60
                    ? "text-bullish"
                    : "text-muted"
                )}
              >
                {formatPercent(signal.win_rate_15d)}
              </p>
            </div>
          </div>
        </div>

        {/* Pattern info */}
        {signal.pattern && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                <CardTitle>Detected Pattern</CardTitle>
              </div>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoCell label="Pattern" value={signal.pattern.pattern_name} />
              <InfoCell
                label="Direction"
                value={
                  <span
                    className={cn(
                      "flex items-center gap-1 font-semibold",
                      patternDirection === "bullish"
                        ? "text-bullish"
                        : "text-bearish"
                    )}
                  >
                    {patternDirection === "bullish" ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    {patternDirection}
                  </span>
                }
              />
              <InfoCell label="Timeframe" value={signal.pattern.timeframe} />
            </div>
            <div className="mt-3 pt-3 border-t border-border-subtle">
              <Link
                href={`/stock/${signal.symbol}`}
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                View on chart <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>
        )}

        {/* Corporate events */}
        {signal.events && signal.events.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                <CardTitle>Corporate Events</CardTitle>
              </div>
              <span className="text-xs text-muted">
                {signal.events.length} event{signal.events.length > 1 ? "s" : ""}
              </span>
            </CardHeader>
            <div className="space-y-2">
              {signal.events.map((event) => (
                <CorporateEventItem key={event.id} event={event} />
              ))}
            </div>
          </Card>
        )}

        {/* Paragraph explanation */}
        {signal.paragraph_explanation && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                <CardTitle>Signal Summary</CardTitle>
              </div>
            </CardHeader>
            <p className="text-sm text-muted leading-relaxed">
              {signal.paragraph_explanation}
            </p>
          </Card>
        )}
      </div>

      {/* Right column: AI Explainer */}
      <div className="lg:col-span-1">
        <AIExplainer signalId={signal.id} />
      </div>
    </div>
  );
}

function InfoCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="bg-surface-2 rounded-lg p-3 border border-border-subtle">
      <p className="text-[10px] text-muted-2 mb-1">{label}</p>
      <p className="text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}
