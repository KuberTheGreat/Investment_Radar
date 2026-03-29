"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { radarApi } from "@/lib/api";
import { TopBar } from "@/components/features/top-bar";
import { IndexBar } from "@/components/features/index-bar";
import { HeroSignalCard } from "@/components/features/hero-signal-card";
import { FilterChips } from "@/components/features/filter-chips";
import { CompactSignalCard } from "@/components/features/compact-signal-card";
import { MarketMoodBar } from "@/components/features/market-mood-bar";
import { SectorSnapshot } from "@/components/features/sector-snapshot";
import { MOCK_SECTORS } from "@/lib/mock-data";

type Filter = "all" | "bullish" | "bearish" | "high";

export default function DiscoverPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const { data: signalsResponse, isLoading, error } = useQuery({
    queryKey: ['signals'],
    queryFn: () => radarApi.getSignals(),
    refetchInterval: 15 * 60 * 1000, // refresh every 15 minutes
  });
  const signals = signalsResponse?.data || [];

  const heroSignal = signals.find(s => s.confluenceScore === 3) ?? signals[0];

  const feedSignals = useMemo(() => {
    if (!heroSignal) return [];
    const rest = signals.filter(s => s.id !== heroSignal.id);
    if (filter === "bullish") return rest.filter(s => s.direction === "bullish");
    if (filter === "bearish") return rest.filter(s => s.direction === "bearish");
    if (filter === "high")    return rest.filter(s => s.confluenceScore === 3);
    return rest;
  }, [filter, signals, heroSignal?.id]);

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* Sticky top section */}
      <div className="sticky top-0 z-40 bg-background">
        <TopBar />
        <IndexBar />
      </div>

      <div className="space-y-5 pt-4">
        {/* Loading & Error States */}
        {isLoading && (
          <div className="mx-4 py-20 flex flex-col items-center justify-center rounded-2xl bg-surface border border-border-subtle animate-pulse">
            <span className="text-3xl mb-3">📡</span>
            <p className="text-sm font-medium text-foreground">Listening for signals...</p>
          </div>
        )}

        {error && (
          <div className="mx-4 py-8 flex flex-col items-center justify-center rounded-2xl border border-bearish/30 bg-bearish/5 text-center px-4">
            <p className="text-sm font-medium text-bearish mb-2">Failed to connect to Radar backend</p>
            <p className="text-xs text-muted mb-4">Please ensure the FastAPI server is running on localhost:8000</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-surface-2 text-xs font-bold hover:bg-surface-3">Retry</button>
          </div>
        )}

        {/* Hero card */}
        {!isLoading && !error && heroSignal && <HeroSignalCard signal={heroSignal} />}

        {/* Market Mood */}
        {!isLoading && !error && signals.length > 0 && <MarketMoodBar signals={signals} />}

        {/* Signal Feed */}
        {!isLoading && !error && (
          <section>
          <div className="flex items-center justify-between px-4 mb-1">
            <h2 className="text-base font-bold text-foreground">Today&apos;s Signals</h2>
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="flex items-center gap-1.5 text-xs text-accent font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
              Live
            </motion.span>
          </div>

          <FilterChips active={filter} onChange={setFilter} />

          <motion.div layout className="mt-3 space-y-2.5">
            {feedSignals.length === 0 ? (
              <div className="mx-4 py-14 flex flex-col items-center justify-center text-center rounded-2xl bg-surface border border-border-subtle">
                <span className="text-3xl mb-3">📡</span>
                <p className="text-sm font-medium text-foreground">No signals match this filter</p>
                <p className="text-xs text-muted mt-1">Try switching to &quot;All&quot;</p>
              </div>
            ) : (
              feedSignals.map((signal, i) => (
                <CompactSignalCard
                  key={signal.id}
                  signal={signal}
                  index={i}
                />
              ))
            )}
          </motion.div>
        </section>
        )}

        {/* Sector Snapshot */}
        <SectorSnapshot sectors={MOCK_SECTORS} />

        <p className="text-center text-[10px] text-muted pb-2">
          Signals refresh every 15 minutes · NSE market data via Angel One
        </p>
      </div>
    </div>
  );
}
