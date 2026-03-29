"use client";
import { Activity, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { usePipelineHealth } from "@/lib/hooks";
import { formatTimeAgo } from "@/lib/utils";
import { cn } from "@/components/ui/cn";

export function HealthIndicator() {
  const { data, isLoading, error } = usePipelineHealth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg glass-card text-xs text-muted">
        <Activity className="w-3.5 h-3.5 animate-pulse" />
        <span>Checking pipeline...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg glass-card text-xs text-bearish">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Pipeline unavailable</span>
      </div>
    );
  }

  const isHealthy = data.status === "healthy" && !data.data_stale;
  const isStale = data.status === "healthy" && data.data_stale;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg glass-card",
        "animate-fade-in"
      )}
    >
      <div className="flex items-center gap-2">
        {isHealthy ? (
          <>
            <span className="status-dot-green" />
            <CheckCircle className="w-3.5 h-3.5 text-bullish" />
          </>
        ) : isStale ? (
          <>
            <span className="status-dot-amber" />
            <Clock className="w-3.5 h-3.5 text-amber" />
          </>
        ) : (
          <>
            <span className="status-dot-red" />
            <AlertCircle className="w-3.5 h-3.5 text-bearish" />
          </>
        )}
        <span
          className={cn(
            "text-xs font-medium",
            isHealthy ? "text-bullish" : isStale ? "text-amber" : "text-bearish"
          )}
        >
          {isHealthy ? "Live" : isStale ? "Stale" : "Degraded"}
        </span>
      </div>

      <div className="h-3 w-px bg-border" />

      <div className="text-xs text-muted">
        <span className="font-semibold text-foreground">
          {data.active_signal_count}
        </span>{" "}
        signals
      </div>

      <div className="h-3 w-px bg-border" />

      <div className="text-xs text-muted">
        Refreshed{" "}
        <span className="text-foreground">
          {formatTimeAgo(data.last_refresh_at)}
        </span>
      </div>
    </div>
  );
}
