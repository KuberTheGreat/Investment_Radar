"use client";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { TopBar } from "@/components/layout/TopBar";
import { CandlestickChart } from "@/components/features/CandlestickChart";
import { CorporateEventItem } from "@/components/features/CorporateEventItem";
import { ErrorBoundary, ErrorDisplay } from "@/components/ui/ErrorBoundary";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEvents, usePatterns } from "@/lib/hooks";
import { Activity, Calendar } from "lucide-react";

interface StockPageProps {
  params: { symbol: string };
}

export default function StockPage({ params }: StockPageProps) {
  const { symbol } = params;
  const upperSymbol = symbol.toUpperCase();

  return (
    <>
      <TopBar
        title={upperSymbol}
        subtitle="Interactive candlestick chart with pattern & event overlays"
      />
      <PageWrapper>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>

        <div className="space-y-6">
          {/* Chart */}
          <ErrorBoundary context="CandlestickChart">
            <CandlestickChart symbol={upperSymbol} />
          </ErrorBoundary>

          {/* Patterns + Events row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ErrorBoundary context="Patterns">
              <PatternsPanel symbol={upperSymbol} />
            </ErrorBoundary>
            <ErrorBoundary context="Events">
              <EventsPanel symbol={upperSymbol} />
            </ErrorBoundary>
          </div>
        </div>
      </PageWrapper>
    </>
  );
}

function PatternsPanel({ symbol }: { symbol: string }) {
  const { data: patterns, isLoading, error, refetch } = usePatterns(symbol);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <CardTitle>Detected Patterns</CardTitle>
        </div>
        {patterns && (
          <span className="text-xs text-muted">{patterns.length} found</span>
        )}
      </CardHeader>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorDisplay
          error={error as Error}
          onRetry={() => refetch()}
          message="Could not load patterns"
        />
      ) : !patterns || patterns.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No patterns detected"
          description="Patterns will appear here once the detection pipeline runs."
          className="py-6"
        />
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {patterns.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-2 border border-border-subtle text-xs"
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  p.signal_direction === "bullish"
                    ? "bg-bullish"
                    : "bg-bearish"
                }`}
              />
              <span className="font-medium text-foreground truncate flex-1">
                {p.pattern_name.replace("CDL", "")}
              </span>
              <span
                className={
                  p.signal_direction === "bullish"
                    ? "text-bullish"
                    : "text-bearish"
                }
              >
                {p.signal_direction}
              </span>
              <span className="text-muted-2">{p.timeframe}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function EventsPanel({ symbol }: { symbol: string }) {
  const { data: events, isLoading, error, refetch } = useEvents(symbol);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          <CardTitle>Corporate Events</CardTitle>
        </div>
        {events && (
          <span className="text-xs text-muted">{events.length} found</span>
        )}
      </CardHeader>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorDisplay
          error={error as Error}
          onRetry={() => refetch()}
          message="Could not load events"
        />
      ) : !events || events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No corporate events"
          description="Corporate events like insider trades and bulk deals will appear here."
          className="py-6"
        />
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {events.map((event) => (
            <CorporateEventItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </Card>
  );
}
