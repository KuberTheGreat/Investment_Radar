"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { use } from "react";
import { StockHeader } from "@/components/features/stock-header";
import { TimeframeSelector, type Timeframe } from "@/components/features/timeframe-selector";
import { CandlestickChart } from "@/components/features/candlestick-chart";
import { ConfluenceScoreCard } from "@/components/features/confluence-score-card";
import { AISignalExplanation } from "@/components/features/ai-signal-explanation";
import { CorporateEventsPanel } from "@/components/features/corporate-events-panel";
import { PatternHistoryTable } from "@/components/features/pattern-history-table";
import { SignalDetailSheet } from "@/components/features/signal-detail-sheet";
import { AskAIButton } from "@/components/features/ask-ai-button";
import { AiAnalysis } from "@/components/features/ai-analysis";
import { useQuery } from "@tanstack/react-query";
import { radarApi } from "@/lib/api";

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export default function StockAnalysisPage({ params }: PageProps) {
  const { symbol } = use(params);
  const upperSymbol = symbol.toUpperCase();

  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [sheetOpen, setSheetOpen] = useState(false);

  // 1. Fetch live signals to find current active signal
  const { data: signalsResponse, isLoading: isLoadingSignals } = useQuery({
    queryKey: ['signals'],
    queryFn: () => radarApi.getSignals(),
  });
  
  const signals = signalsResponse?.data || [];

  const signal = signals.find(s => s.symbol === upperSymbol);

  // 2. Fetch specific events for this symbol
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['events', upperSymbol],
    queryFn: () => radarApi.getEvents(upperSymbol),
  });

  // 3. Fetch specific patterns for this symbol
  const { data: history = [], isLoading: isLoadingPatterns } = useQuery({
    queryKey: ['patterns', upperSymbol],
    queryFn: () => radarApi.getPatterns(upperSymbol),
  });

  if (isLoadingSignals) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <span className="text-3xl mb-3">📡</span>
          <p className="text-sm font-medium">Gathering Intelligence...</p>
        </div>
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <span className="text-4xl mb-3">📡</span>
        <h2 className="text-xl font-bold text-foreground mb-2">No Active Signal</h2>
        <p className="text-sm text-muted">No real-time signal is active for {upperSymbol} at the moment.</p>
        <button onClick={() => window.history.back()} className="mt-6 px-5 py-2.5 rounded-xl bg-surface-2 font-bold hover:bg-surface-3 transition">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 1. Sticky Header */}
      <StockHeader
        signal={signal}
        isWatchlisted={false}
      />

      {/* 2. Timeframe Selector */}
      <TimeframeSelector active={timeframe} onChange={setTimeframe} />

      {/* 3. Candlestick Chart */}
      <CandlestickChart
        symbol={upperSymbol}
        timeframe={timeframe}
      />

      {/* "View Signal Detail" CTA — taps open the bottom sheet */}
      <div className="px-4 mt-3">
        <button
          onClick={() => setSheetOpen(true)}
          className="w-full py-3 rounded-xl border border-accent/30 bg-accent/5 text-accent text-sm font-bold
                     hover:bg-accent/10 transition-colors flex items-center justify-center gap-2"
        >
          📡 View Full Signal Analysis
        </button>
      </div>

      {/* Content sections */}
      <div className="mt-5 space-y-5 pb-6">
        {/* NEW 3.5: AI Analysis */}
        <div className="px-4">
          <AiAnalysis ticker={upperSymbol} />
        </div>

        {/* 4. Confluence Score */}
        <ConfluenceScoreCard
          score={signal.confluenceScore as any}
          patternName={(signal as any).pattern}
        />

        {/* 5. AI Explanation + Win Rates + Evidence */}
        <AISignalExplanation signal={signal as any} />

        {/* Divider */}
        <div className="mx-4 border-t border-border-subtle" />

        {/* 6. Corporate Events */}
        <CorporateEventsPanel events={events} symbol={upperSymbol} />

        {/* Divider */}
        <div className="mx-4 border-t border-border-subtle" />

        {/* 7. Pattern History */}
        <PatternHistoryTable
          history={history}
          symbol={upperSymbol}
          patternName={(signal as any).pattern}
        />
      </div>

      {/* 8. Sticky Ask AI bar */}
      <AskAIButton symbol={upperSymbol} />

      {/* 9. Signal Detail Bottom Sheet */}
      <SignalDetailSheet
        signal={signal}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onWatchlist={(sym) => console.log("watchlist", sym)}
      />
    </div>
  );
}
