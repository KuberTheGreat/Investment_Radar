"use client";
import { TrendingUp, Zap, BarChart2, ArrowRight, Search, PlusCircle } from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { TopBar } from "@/components/layout/TopBar";
import { HealthIndicator } from "@/components/features/HealthIndicator";
import { LiveAlertFeed } from "@/components/features/LiveAlertFeed";
import { SignalList } from "@/components/features/SignalList";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { usePipelineHealth, useWatchlist } from "@/lib/hooks";
import { useAuth } from "@/lib/authContext";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function DashboardPage() {
  const { data: health } = usePipelineHealth();
  const [activeTab, setActiveTab] = useState<"discover" | "watchlist">("discover");
  const { data: watchlist } = useWatchlist();
  const { token } = useAuth();

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex bg-surface-2 p-1 rounded-lg w-fit border border-border-subtle">
                <button 
                  onClick={() => setActiveTab("discover")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === "discover" ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground"}`}
                >
                  Discover
                </button>
                <button 
                  onClick={() => setActiveTab("watchlist")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === "watchlist" ? "bg-surface shadow-sm text-foreground flex items-center gap-1.5" : "text-muted hover:text-foreground flex items-center gap-1.5"}`}
                >
                  My Watchlist
                  {token && Array.isArray(watchlist) && <span className="text-[10px] bg-accent/20 text-accent px-1.5 rounded">{watchlist.length}</span>}
                </button>
              </div>
              <Link
                href="/signals"
                className="flex items-center gap-1 text-xs text-accent hover:underline mb-2 sm:mb-0"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            {activeTab === "discover" ? (
              <ErrorBoundary context="SignalList">
                <SignalList
                  filters={{ min_win_rate: 50, deduplicate_symbol: true }}
                  pageSize={10}
                  layout="grid"
                />
              </ErrorBoundary>
            ) : (
              <div className="space-y-4 min-h-[400px]">
                {!token ? (
                  <div className="p-8 mt-12 text-center bg-surface border border-border-subtle rounded-xl flex flex-col items-center glass-card max-w-lg mx-auto">
                    <p className="text-sm text-muted mb-4 max-w-sm">Sign in to track your favorite Indian equities and receive personalized background AI processing pipelines.</p>
                    <button onClick={() => signIn("google")} className="px-5 py-2.5 bg-accent text-white rounded font-semibold transition hover:bg-accent/90">Sign In Securely</button>
                  </div>
                ) : !Array.isArray(watchlist) || watchlist.length === 0 ? (
                  <div className="p-8 mt-12 text-center bg-surface border border-border-subtle rounded-xl glass-card max-w-lg mx-auto">
                    <p className="text-sm font-semibold text-foreground mb-1">Your Watchlist is empty.</p>
                    <p className="text-xs text-muted mt-2 mb-6 max-w-sm mx-auto">Search for any NSE stock, navigate to its analysis page, and click the Star icon to configure background tracking.</p>
                    <button 
                      onClick={() => (document.querySelector('input[placeholder="Search stock (e.g., ZOMATO)"]') as HTMLInputElement)?.focus()} 
                      className="px-5 py-2.5 bg-accent text-white rounded font-semibold transition hover:bg-accent/90 inline-flex items-center gap-2 text-sm shadow-md"
                    >
                      <Search className="w-4 h-4" /> Search Stocks to Add
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <button 
                        onClick={() => (document.querySelector('input[placeholder="Search stock (e.g., ZOMATO)"]') as HTMLInputElement)?.focus()}
                        className="text-xs font-semibold text-accent hover:text-accent/80 flex items-center gap-1.5 transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Add Stock
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in zoom-in-95 duration-300">
                    {watchlist.map((symbol: string) => (
                      <Link
                        key={symbol}
                        href={`/stock/${symbol.replace(".NS", "")}`}
                        className="p-4 bg-surface hover:bg-surface-2 transition-colors border border-border-subtle rounded-xl flex items-center justify-between group glass-card shadow-sm"
                      >
                        <span className="font-bold text-sm tracking-tight whitespace-nowrap overflow-hidden text-ellipsis mr-2">{symbol.replace(".NS", "")}</span>
                        <ArrowRight className="w-4 h-4 flex-shrink-0 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    ))}
                  </div>
                </div>
                )}
              </div>
            )}
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
