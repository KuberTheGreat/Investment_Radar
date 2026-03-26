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
import { Skeleton } from "@/components/ui/Skeleton";
import { useEvents, usePatterns, useOHLCV, useOnDemandAnalysis } from "@/lib/hooks";
import { Activity, Calendar, Loader2 } from "lucide-react";
import { use, useEffect } from "react";

interface StockPageProps {
  params: Promise<{ symbol: string }>;
}

export default function StockPage({ params }: StockPageProps) {
  const { symbol } = use(params);
  const upperSymbol = symbol.toUpperCase();
  
  const { data: ohlcvData, isLoading: isDataLoading } = useOHLCV(upperSymbol, "15m");
  const { data: dayData } = useOHLCV(upperSymbol, "1d");
  const { mutate: triggerAnalysis, isPending: isAnalyzing } = useOnDemandAnalysis();

  useEffect(() => {
    if (!isDataLoading && ohlcvData && ohlcvData.length === 0 && !isAnalyzing) {
      triggerAnalysis(upperSymbol);
    }
  }, [isDataLoading, ohlcvData, upperSymbol, triggerAnalysis, isAnalyzing]);

  const latestPrice = dayData && dayData.length > 0 
    ? `₹${dayData[dayData.length - 1].close.toFixed(2)}`
    : "Loading price...";

  return (
    <>
      <TopBar
        title={upperSymbol}
        subtitle={`Current Price: ${latestPrice} • Interactive candlestick chart`}
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
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center p-12 border border-border-subtle rounded-xl bg-surface/50 h-[400px]">
                <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Analyzing {upperSymbol}...</h3>
                <p className="text-sm text-muted text-center max-w-md">
                  We are fetching historical market data, running pattern recognition models, and computing AI confluence scores in real-time. This may take a few seconds.
                </p>
              </div>
            ) : (
              <CandlestickChart symbol={upperSymbol} />
            )}
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

  // Deduplicate by name and time
  const uniquePatterns = patterns
    ? patterns.filter(
        (v, i, a) =>
          a.findIndex(
            (t) =>
              t.pattern_name === v.pattern_name &&
              t.detected_at === v.detected_at
          ) === i
      )
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <CardTitle>Detected Patterns</CardTitle>
        </div>
        {!isLoading && (
          <span className="text-xs text-muted">
            {uniquePatterns.length} found
          </span>
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
      ) : uniquePatterns.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No patterns detected"
          description="Patterns will appear here once the detection pipeline runs."
          className="py-6"
        />
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {uniquePatterns.map((p) => (
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

  // Deduplicate events by type, date, and party
  const uniqueEvents = events
    ? events.filter(
        (v, i, a) =>
          a.findIndex(
            (t) =>
              t.event_type === v.event_type &&
              t.event_date === v.event_date &&
              t.party_name === v.party_name
          ) === i
      )
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          <CardTitle>Corporate Events</CardTitle>
        </div>
        {!isLoading && (
          <span className="text-xs text-muted">
            {uniqueEvents.length} found
          </span>
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
      ) : uniqueEvents.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No corporate events"
          description="Corporate events like insider trades and bulk deals will appear here."
          className="py-6"
        />
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {uniqueEvents.map((event) => (
            <CorporateEventItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </Card>
  );
}
