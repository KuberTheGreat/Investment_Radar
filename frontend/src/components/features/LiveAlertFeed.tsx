"use client";
import { Radio, Wifi, WifiOff, X } from "lucide-react";
import { useAlerts, AlertItem } from "@/lib/hooks";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatTimeAgo } from "@/lib/utils";
import { cn } from "@/components/ui/cn";
import Link from "next/link";

export function LiveAlertFeed() {
  const { alerts, connected, error, clearAlerts } = useAlerts(15);

  return (
    <div className="glass-card flex flex-col h-full min-h-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Live Alerts</span>
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
              connected
                ? "bg-bullish/10 border-bullish/30 text-bullish"
                : "bg-bearish/10 border-bearish/30 text-bearish"
            )}
          >
            {connected ? (
              <Wifi className="w-2.5 h-2.5" />
            ) : (
              <WifiOff className="w-2.5 h-2.5" />
            )}
            {connected ? "Connected" : "Disconnected"}
          </div>
        </div>
        {alerts.length > 0 && (
          <button
            onClick={clearAlerts}
            className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 text-xs text-amber border-b border-amber/20 bg-amber/5">
          {error}
        </div>
      )}

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="Waiting for signals"
            description="New signals will appear here in real-time as the pipeline detects them."
            className="py-8"
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  return (
    <li className="animate-slide-in-right">
      <Link
        href={`/signals/${alert.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
          {alert.symbol.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {alert.symbol}
          </p>
          <p className="text-xs text-muted capitalize truncate">
            {alert.signal_type}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-muted">{formatTimeAgo(alert.created_at)}</p>
          {alert.signal_rank > 0 && (
            <p className="text-[10px] text-bullish font-medium">
              Rank {alert.signal_rank.toFixed(0)}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
