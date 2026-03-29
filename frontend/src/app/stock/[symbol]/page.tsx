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
import { useEvents, usePatterns, useOHLCV, useOnDemandAnalysis, useWatchlist } from "@/lib/hooks";
import AiAnalysis from "@/components/AiAnalysis";
import { Activity, Calendar, Loader2, Star } from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useQueryClient } from "@tanstack/react-query";
import { addToWatchlist, removeFromWatchlist } from "@/lib/api";

interface StockPageProps {
  params: Promise<{ symbol: string }>;
}

export default function StockPage({ params }: StockPageProps) {
  const { symbol } = use(params);
  const upperSymbol = symbol.toUpperCase();
  
  const { data: ohlcvData, isLoading: isOhlcvLoading } = useOHLCV(upperSymbol, "15m");
  const { data: dayData, isLoading: isDayLoading } = useOHLCV(upperSymbol, "1d");
  const { mutate: triggerAnalysis, isPending: isAnalyzing } = useOnDemandAnalysis();
  const hasTriggeredRef = useRef(false);

  const { token, setShowAuthModal } = useAuth() as any; // Cast for optional modal toggle if exposed, else generic alert
  const { data: watchlist } = useWatchlist();
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);
  
  const isStarred = watchlist?.includes(upperSymbol);

  const handleStarToggle = async () => {
    if (!token) {
      alert("Please sign in from the TopBar to add to your Watchlist");
      return;
    }
    setIsToggling(true);
    try {
      if (isStarred) {
        await removeFromWatchlist(upperSymbol);
      } else {
        await addToWatchlist(upperSymbol);
      }
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    } catch (e) {
      console.error(e);
    } finally {
      setIsToggling(false);
    }
  };

  // Bug fix: Reset trigger flag on EVERY symbol navigation
  useEffect(() => {
    hasTriggeredRef.current = false;
  }, [upperSymbol]);

  // Bug fix: Corrected missing-data detection + force-refetch after analysis
  useEffect(() => {
    // Wait until both queries have settled
    if (isOhlcvLoading || isDayLoading) return;
    // Trigger if data is undefined OR empty array (first load returns undefined, not [])
    const ohlcvMissing = !ohlcvData || ohlcvData.length === 0;
    const dayMissing = !dayData || dayData.length === 0;
    if ((ohlcvMissing || dayMissing) && !isAnalyzing && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      triggerAnalysis(upperSymbol, {
        onSuccess: () => {
          // Force immediate refetch — don't wait for staleTime
          queryClient.invalidateQueries({ queryKey: ["ohlcv", upperSymbol] });
          queryClient.invalidateQueries({ queryKey: ["patterns", upperSymbol] });
          queryClient.invalidateQueries({ queryKey: ["events", upperSymbol] });
        },
      });
    }
  }, [isOhlcvLoading, isDayLoading, ohlcvData, dayData, upperSymbol, triggerAnalysis, isAnalyzing, queryClient]);

  const latestPrice = dayData && dayData.length > 0 
    ? `₹${dayData[dayData.length - 1].close.toFixed(2)}`
    : "Loading price...";

  return (
    <>
      <TopBar
        title={`${upperSymbol} Analysis`}
      />
      <PageWrapper>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>
        
        {/* Prominent Stock Price Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 p-6 rounded-2xl bg-surface border border-border-subtle shadow-sm relative overflow-hidden glass-card">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-extrabold text-foreground tracking-tight">{upperSymbol}</h1>
              <button 
                onClick={handleStarToggle}
                disabled={isToggling}
                className={`p-2 rounded-full transition-colors flex items-center justify-center ${isStarred ? "bg-accent/10 text-accent hover:bg-accent/20" : "bg-surface-2 text-muted hover:text-foreground hover:bg-surface-3"}`}
                title={isStarred ? "Remove from Watchlist" : "Add to Watchlist"}
              >
                {isToggling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Star className={`w-5 h-5 ${isStarred ? "fill-current" : ""}`} />}
              </button>
            </div>
            <p className="text-sm font-medium text-muted">Advanced Market Intelligence & Interactive Charting</p>
          </div>
          <div className="mt-6 md:mt-0 text-left md:text-right relative z-10">
            <div className="text-4xl font-extrabold gradient-text tracking-tight">{latestPrice}</div>
            {dayData && dayData.length >= 2 && (
              <div className={`text-sm font-bold flex items-center md:justify-end gap-1 mt-1.5 ${dayData[dayData.length-1].close >= dayData[dayData.length-2].close ? "text-bullish" : "text-bearish"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {dayData[dayData.length-1].close >= dayData[dayData.length-2].close ? "+" : ""}
                {((dayData[dayData.length-1].close - dayData[dayData.length-2].close) / dayData[dayData.length-2].close * 100).toFixed(2)}% Current Session
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Chart — always rendered; spinner overlays during background analysis */}
          <ErrorBoundary context="CandlestickChart">
            <div className="relative">
              <CandlestickChart symbol={upperSymbol} />
              {isAnalyzing && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-surface/80 backdrop-blur-sm">
                  <Loader2 className="w-7 h-7 text-accent animate-spin mb-3" />
                  <p className="text-sm font-medium text-foreground">Fetching data for {upperSymbol}...</p>
                  <p className="text-xs text-muted mt-1">Chart will update automatically</p>
                </div>
              )}
            </div>
          </ErrorBoundary>

          {/* AI Analysis Section */}
          <ErrorBoundary context="AiAnalysis">
            <AiAnalysis ticker={upperSymbol} />
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
              <span className="text-muted-2 min-w-[90px] text-right">
                {new Date(p.detected_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
              </span>
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
