"use client";
import {
  ChevronLeft,
  ChevronRight,
  InboxIcon,
} from "lucide-react";
import { SignalFilters } from "@/lib/api";
import { usePaginatedSignals } from "@/lib/hooks";
import { SignalCard } from "./SignalCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ErrorDisplay } from "@/components/ui/ErrorBoundary";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/components/ui/cn";

interface SignalListProps {
  filters?: Omit<SignalFilters, "skip" | "limit">;
  pageSize?: number;
  layout?: "grid" | "list";
}

export function SignalList({
  filters = {},
  pageSize = 20,
  layout = "grid",
}: SignalListProps) {
  const {
    data,
    isLoading,
    error,
    refetch,
    page,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
  } = usePaginatedSignals(filters, pageSize);

  if (isLoading) {
    return (
      <div
        className={cn(
          layout === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            : "space-y-3"
        )}
      >
        {Array.from({ length: pageSize > 6 ? 6 : pageSize }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error as Error}
        onRetry={() => refetch()}
        message="Failed to load signals"
      />
    );
  }

  const signals = data?.data ?? [];

  if (signals.length === 0) {
    return (
      <EmptyState
        icon={InboxIcon}
        title="No signals found"
        description="Try changing your filters or check back later as the pipeline generates new signals."
      />
    );
  }

  return (
    <div>
      {/* Grid/List */}
      <div
        className={cn(
          layout === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            : "space-y-3"
        )}
      >
        {signals.map((signal) => (
          <SignalCard
            key={signal.id}
            signal={signal}
            compact={layout === "list"}
          />
        ))}
      </div>

      {/* Pagination */}
      {(hasPrevPage || hasNextPage) && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-subtle">
          <button
            onClick={prevPage}
            disabled={!hasPrevPage}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors",
              hasPrevPage
                ? "border-border text-foreground hover:border-accent/50 hover:text-accent"
                : "border-border-subtle text-muted-2 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-xs text-muted">
            Page {page + 1}
          </span>
          <button
            onClick={nextPage}
            disabled={!hasNextPage}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors",
              hasNextPage
                ? "border-border text-foreground hover:border-accent/50 hover:text-accent"
                : "border-border-subtle text-muted-2 cursor-not-allowed"
            )}
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
