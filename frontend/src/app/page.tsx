"use client";
import { TrendingUp, Zap, BarChart2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { TopBar } from "@/components/layout/TopBar";
import { HealthIndicator } from "@/components/features/HealthIndicator";
import { LiveAlertFeed } from "@/components/features/LiveAlertFeed";
import { SignalList } from "@/components/features/SignalList";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { usePipelineHealth } from "@/lib/hooks";

export default function DashboardPage() {
  const { data: health } = usePipelineHealth();

  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle="Real-time market intelligence"
      />
      <PageWrapper>
        {/* Hero row */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold gradient-text mb-1">
              Command Center
            </h2>
            <p className="text-sm text-muted">
              AI-driven signals for the Indian equity market
            </p>
          </div>
          <ErrorBoundary context="HealthIndicator">
            <HealthIndicator />
          </ErrorBoundary>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={Zap}
            label="Active Signals"
            value={health?.active_signal_count?.toString() ?? "—"}
            accent
          />
          <StatCard
            icon={TrendingUp}
            label="Pipeline"
            value={health ? (health.data_stale ? "Stale" : "Live") : "…"}
            positive={health ? !health.data_stale : undefined}
          />
          <StatCard
            icon={BarChart2}
            label="Version"
            value={health?.version ?? "—"}
          />
        </div>

        {/* Main content: Signals + Live Feed */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Top opportunities */}
          <div className="xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                Top Opportunities
              </h3>
              <Link
                href="/signals"
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <ErrorBoundary context="SignalList">
              <SignalList
                filters={{ min_win_rate: 50 }}
                pageSize={6}
                layout="grid"
                deduplicateBySymbol
              />
            </ErrorBoundary>
          </div>

          {/* Live alert feed */}
          <div className="xl:col-span-1">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                Live Radar
              </h3>
            </div>
            <ErrorBoundary context="LiveAlertFeed">
              <LiveAlertFeed />
            </ErrorBoundary>
          </div>
        </div>
      </PageWrapper>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  positive,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon
          className={`w-4 h-4 ${accent ? "text-accent" : "text-muted"}`}
        />
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p
        className={`text-2xl font-bold ${
          positive === true
            ? "text-bullish"
            : positive === false
            ? "text-amber"
            : accent
            ? "gradient-text"
            : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
