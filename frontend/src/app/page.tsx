"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchSignals } from "@/lib/api";
import type { SignalFilters, Signal } from "@/lib/api";
import SignalCard from "@/components/SignalCard";
import OpportunityCard from "@/components/OpportunityCard";
import FilterBar from "@/components/FilterBar";
import { SkeletonCard } from "@/components/Skeleton";

const LIMIT = 20;

export default function Home() {
  const [tab, setTab] = useState<"signals" | "radar">("signals");
  const [filters, setFilters] = useState<SignalFilters>({});
  const loaderRef = useRef<HTMLDivElement>(null);

  // Change tab via URL hash for shareable links
  useEffect(() => {
    if (window.location.search.includes("tab=radar")) setTab("radar");
  }, []);

  // Active filters for current tab
  const activeFilters: SignalFilters =
    tab === "radar" ? { ...filters, signal_type: "opportunity" } : { ...filters };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteQuery({
      queryKey: ["signals", tab, filters],
      queryFn: ({ pageParam = 0 }) =>
        fetchSignals({ ...activeFilters, skip: pageParam * LIMIT, limit: LIMIT }),
      getNextPageParam: (lastPage, allPages) =>
        lastPage.data.length === LIMIT ? allPages.length : undefined,
      initialPageParam: 0,
    });

  // Infinite scroll sentinel
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allSignals: Signal[] = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100 mb-1">Signal Feed</h1>
        <p className="text-sm text-slate-500">
          AI-powered chart pattern signals and corporate event intelligence for Indian markets.
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        {(["signals", "radar"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              window.history.replaceState(null, "", t === "radar" ? "?tab=radar" : "/");
            }}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              tab === t
                ? { background: t === "radar" ? "#f59e0b" : "#10b981", color: "#0a0a0a" }
                : { color: "#64748b" }
            }
          >
            {t === "signals" ? "📊 Pattern Signals" : "🔦 Opportunity Radar"}
          </button>
        ))}
      </div>

      {/* Filter bar (only on pattern signals tab) */}
      {tab === "signals" && <FilterBar filters={filters} onChange={setFilters} />}

      {/* Error state */}
      {isError && (
        <div className="rounded-xl p-8 text-center border" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          <p className="text-red-400 mb-3">⚠ Failed to load signals. Is the backend running?</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-900 bg-emerald-400 hover:bg-emerald-300 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Signal grid */}
      {!isError && (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : allSignals.map((signal) =>
                  tab === "radar" ? (
                    <OpportunityCard key={signal.id} signal={signal} />
                  ) : (
                    <SignalCard key={signal.id} signal={signal} />
                  )
                )}
          </div>

          {/* Empty state */}
          {!isLoading && allSignals.length === 0 && (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">📭</p>
              <p className="text-slate-400 text-lg font-medium mb-2">No signals found</p>
              <p className="text-slate-500 text-sm mb-4">
                {tab === "radar"
                  ? "No anomaly signals detected yet. Check back after 19:00 IST."
                  : "No pattern signals match your filters."}
              </p>
              <button
                onClick={() => setFilters({})}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-2"
              >
                Reset filters
              </button>
            </div>
          )}

          {/* Infinite scroll sentinel + loading indicator */}
          <div ref={loaderRef} className="mt-6 flex justify-center">
            {isFetchingNextPage && (
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-emerald-400"
                    style={{ animation: `pulse-ring 1s ${i * 0.2}s ease-in-out infinite` }}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-slate-600 text-center mt-12 max-w-2xl mx-auto">
        This is not financial advice. Past patterns do not guarantee future results.
        Please consult a registered financial advisor before making investment decisions.
      </p>
    </div>
  );
}
