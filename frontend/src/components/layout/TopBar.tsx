"use client";
import { Bell, BellRing } from "lucide-react";
import { useAlerts } from "@/lib/hooks";
import { cn } from "@/components/ui/cn";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { alerts, connected } = useAlerts(5);
  const hasAlerts = alerts.length > 0;

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-20 flex items-center justify-between",
        "px-6 h-[var(--topbar-height)] border-b border-border-subtle bg-background/80 backdrop-blur-md",
        "left-[var(--sidebar-width)] transition-[left] duration-300"
      )}
      style={{ left: "var(--sidebar-width)" }}
    >
      <div>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              connected ? "bg-bullish" : "bg-bearish"
            )}
          />
          <span className="hidden sm:block">
            {connected ? "Live" : "Disconnected"}
          </span>
        </div>

        {/* Alert bell */}
        <div className="relative">
          {hasAlerts ? (
            <BellRing
              className={cn(
                "w-5 h-5",
                hasAlerts ? "text-amber animate-pulse" : "text-muted"
              )}
            />
          ) : (
            <Bell className="w-5 h-5 text-muted" />
          )}
          {hasAlerts && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-bearish text-[10px] font-bold text-white">
              {alerts.length > 9 ? "9+" : alerts.length}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
