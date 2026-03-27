"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Zap,
  Star,
  User,
} from "lucide-react";
import { cn } from "@/components/ui/cn";
import { usePipelineHealth } from "@/lib/hooks";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/watchlist", icon: Star, label: "My Watchlist" },
  { href: "/signals", icon: Radio, label: "Signal Radar" },
  { href: "/profile", icon: User, label: "My Profile" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: health } = usePipelineHealth();

  const statusDot = !health
    ? "status-dot bg-muted-2"
    : health.data_stale
    ? "status-dot-amber"
    : health.status === "healthy"
    ? "status-dot-green"
    : "status-dot-red";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen z-30 flex flex-col transition-all duration-300",
        "bg-surface border-r border-border-subtle",
        collapsed ? "w-16" : "w-[var(--sidebar-width)]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-2.5 px-4 border-b border-border-subtle",
          "h-[var(--topbar-height)] flex-shrink-0"
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-bullish flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold gradient-text whitespace-nowrap">
            InvestorRadar
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                isActive ? "nav-link-active" : "nav-link",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm truncate">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Pipeline health */}
      {!collapsed && (
        <div className="p-3 border-t border-border-subtle">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-surface-2">
            <span className={statusDot} />
            <div className="min-w-0">
              <p className="text-xs text-muted truncate">
                {health
                  ? health.data_stale
                    ? "Data stale"
                    : "Pipeline live"
                  : "Connecting..."}
              </p>
              {health && (
                <p className="text-xs text-muted-2 truncate">
                  {health.active_signal_count} active signals
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={cn(
          "flex items-center justify-center p-2 mx-3 mb-3 rounded-lg",
          "text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
        )}
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
