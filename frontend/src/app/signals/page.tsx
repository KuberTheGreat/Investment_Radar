"use client";
import { useState } from "react";
import { Radio, LayoutGrid, List } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { TopBar } from "@/components/layout/TopBar";
import { FilterBar } from "@/components/features/FilterBar";
import { SignalList } from "@/components/features/SignalList";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { SignalFilters } from "@/lib/api";
import { cn } from "@/components/ui/cn";

export default function SignalsPage() {
  const [filters, setFilters] = useState<SignalFilters>({ limit: 20 });
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  const handleFilterChange = (newFilters: SignalFilters) => {
    setFilters({ ...newFilters, limit: 20 });
  };

  return (
    <>
      <TopBar
        title="Signal Radar"
        subtitle="Browse and filter all generated trading signals"
      />
      <PageWrapper>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold text-foreground">Signal Discovery Hub</h2>
          </div>
          {/* Layout toggle */}
          <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1 border border-border-subtle">
            <button
              onClick={() => setLayout("grid")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                layout === "grid"
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground"
              )}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout("list")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                layout === "list"
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground"
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sticky filters */}
        <div className="sticky top-[var(--topbar-height)] z-10 bg-background/90 backdrop-blur-sm -mx-6 px-6 -mt-2 pt-2 pb-0">
          <FilterBar filters={filters} onChange={handleFilterChange} />
        </div>

        {/* Signal list */}
        <ErrorBoundary context="SignalsPage/SignalList">
          <SignalList
            filters={{
              symbol: filters.symbol,
              signal_type: filters.signal_type,
              direction: filters.direction,
              min_confluence: filters.min_confluence,
              high_confluence_only: filters.high_confluence_only,
              deduplicate_symbol: true,
            }}
            pageSize={20}
            layout={layout}
          />
        </ErrorBoundary>
      </PageWrapper>
    </>
  );
}
