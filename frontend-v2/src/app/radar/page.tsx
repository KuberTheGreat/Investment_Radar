"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { RadarFilterBar, type ConfidenceFilter, type DirectionFilter, type SortOption } from "@/components/features/radar-filter-bar";
import { ExpandableSignalCard } from "@/components/features/expandable-signal-card";
import { LiveCount } from "@/components/features/live-count";
import { radarApi } from "@/lib/api";

export default function RadarPage() {
  const [confidence, setConfidence] = useState<ConfidenceFilter>("all");
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [watchlisted, setWatchlisted] = useState<Set<string>>(new Set());

  const { data: signals = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["signals"],
    queryFn: () => radarApi.getSignals(),
    refetchInterval: 15 * 60 * 1000, // 15 min
    staleTime: 60 * 1000,
  });

  const filtered = useMemo(() => {
    let list = [...signals];

    if (confidence === "high")   list = list.filter(s => s.confluenceScore === 3);
    if (confidence === "medium") list = list.filter(s => s.confluenceScore === 2);
    if (confidence === "low")    list = list.filter(s => s.confluenceScore <= 1);
    if (direction === "bullish") list = list.filter(s => s.direction.toLowerCase() === "bullish");
    if (direction === "bearish") list = list.filter(s => s.direction.toLowerCase() === "bearish");

    if (sort === "confidence") list.sort((a, b) => b.confluenceScore - a.confluenceScore);
    if (sort === "winrate")    list.sort((a, b) => b.winRate5d - a.winRate5d);
    if (sort === "alpha")      list.sort((a, b) => a.symbol.localeCompare(b.symbol));
    // "newest" keeps insertion order (already newest-first from BE)

    return list;
  }, [signals, confidence, direction, sort]);

  const handleWatchlist = (symbol: string) => {
    setWatchlisted(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* Page header */}
      <div className="sticky top-0 z-40 bg-background">
        <div className="flex items-center justify-between gap-3 px-4 pt-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
              <span className="text-sm">📡</span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-foreground">Signal Radar</h1>
              <p className="text-xs text-muted">AI-detected opportunities across NSE</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="text-[11px] text-accent bg-accent/10 px-3 py-1 rounded-full hover:bg-accent/20 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        <LiveCount count={filtered.length} />
        <RadarFilterBar
          confidence={confidence}
          direction={direction}
          sort={sort}
          onConfidenceChange={setConfidence}
          onDirectionChange={setDirection}
          onSortChange={setSort}
        />
      </div>

      {/* Signal feed */}
      {isLoading ? (
        <div className="mx-4 mt-3 space-y-2.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface border border-border-subtle animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="mx-4 mt-6 py-12 flex flex-col items-center justify-center rounded-2xl bg-surface border border-bearish/30">
          <span className="text-3xl mb-3">⚠️</span>
          <p className="text-sm font-semibold text-foreground">Failed to load signals</p>
          <p className="text-xs text-muted mt-1">Please ensure the FastAPI server is running</p>
          <button onClick={() => refetch()} className="mt-4 px-4 py-2 text-xs rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition-colors">Retry</button>
        </div>
      ) : (
        <motion.div layout className="mt-3 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="mx-4 py-20 flex flex-col items-center justify-center rounded-2xl bg-surface border border-border-subtle">
              <span className="text-4xl mb-3">🔍</span>
              <p className="text-sm font-semibold text-foreground">No signals match these filters</p>
              <p className="text-xs text-muted mt-1">Try adjusting your confidence or direction filter</p>
            </div>
          ) : (
            filtered.map((signal, i) => (
              <ExpandableSignalCard
                key={signal.id}
                signal={signal}
                index={i}
                isWatchlisted={watchlisted.has(signal.symbol)}
                onWatchlist={handleWatchlist}
              />
            ))
          )}
        </motion.div>
      )}

      <p className="text-center text-[10px] text-muted mt-6 pb-4">
        Showing {filtered.length} of {signals.length} total signals · Auto-refresh every 15 min
      </p>
    </div>
  );
}
