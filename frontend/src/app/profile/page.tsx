"use client";
import { useState } from "react";
import {
  User, Mail, Shield, LogOut, ArrowRight, Zap, Star,
  TrendingUp, TrendingDown, Wallet, BarChart2, BookOpen,
  Activity, RefreshCw, Wifi, WifiOff, ChevronRight,
  DollarSign, Briefcase, Clock, CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/lib/authContext";
import { useWatchlist, useBrokerStatus } from "@/lib/hooks";
import { signOut, signIn, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

// ── Data fetching hooks ──────────────────────────────────────────────────────

function useBrokerPortfolio(enabled: boolean) {
  return useQuery({
    queryKey: ["brokerPortfolio"],
    queryFn: async () => {
      const res = await fetch("/api/broker/portfolio");
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      return res.json();
    },
    enabled,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

function useBrokerPositions(enabled: boolean) {
  return useQuery({
    queryKey: ["brokerPositions"],
    queryFn: async () => {
      const res = await fetch("/api/broker/positions");
      if (!res.ok) throw new Error("Failed to fetch positions");
      return res.json();
    },
    enabled,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

function useBrokerOrders(enabled: boolean) {
  return useQuery({
    queryKey: ["brokerOrders"],
    queryFn: async () => {
      const res = await fetch("/api/broker/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

// ── Helper components ────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon: Icon, color = "text-foreground", trend }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color?: string; trend?: "up" | "down" | null;
}) {
  return (
    <div className="p-5 rounded-xl bg-surface border border-border-subtle glass-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</span>
        <div className="p-2 rounded-lg bg-surface-2 border border-border-subtle">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <div>
        <div className={`text-2xl font-extrabold tracking-tight ${color}`}>{value}</div>
        {sub && (
          <div className={`text-xs mt-1 flex items-center gap-1 ${trend === "up" ? "text-bullish" : trend === "down" ? "text-bearish" : "text-muted"}`}>
            {trend === "up" && <TrendingUp className="w-3 h-3" />}
            {trend === "down" && <TrendingDown className="w-3 h-3" />}
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, badge }: { icon: React.ElementType; title: string; badge?: string | number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2.5 bg-surface-2 rounded-lg border border-border-subtle">
        <Icon className="w-4 h-4 text-accent" />
      </div>
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {badge !== undefined && (
        <span className="ml-auto px-2.5 py-0.5 rounded-full bg-surface-2 border border-border-subtle text-xs font-bold text-muted">{badge}</span>
      )}
    </div>
  );
}

function PnLBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${positive ? "bg-bullish/10 text-bullish" : "bg-bearish/10 text-bearish"}`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? "+" : ""}₹{value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
    </span>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "complete") return <span className="flex items-center gap-1 text-bullish text-xs font-bold"><CheckCircle className="w-3 h-3" /> Complete</span>;
  if (s === "rejected") return <span className="flex items-center gap-1 text-bearish text-xs font-bold"><XCircle className="w-3 h-3" /> Rejected</span>;
  if (s === "open" || s === "pending") return <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold"><Clock className="w-3 h-3" /> Pending</span>;
  return <span className="flex items-center gap-1 text-muted text-xs font-bold"><AlertCircle className="w-3 h-3" /> {status}</span>;
}

function BrokerConnectBanner({ onConnect }: { onConnect: () => void }) {
  const [loading, setLoading] = useState(false);
  const handleConnect = async () => {
    setLoading(true);
    await onConnect();
    setLoading(false);
  };
  return (
    <div className="p-5 rounded-xl bg-surface border border-amber-500/30 glass-card flex items-center gap-4">
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <WifiOff className="w-5 h-5 text-amber-400" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-foreground text-sm">Angel One not connected</p>
        <p className="text-xs text-muted mt-0.5">Connect your brokerage to see live portfolio, P&L and order history.</p>
      </div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition flex items-center gap-2 shrink-0"
      >
        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
        {loading ? "Connecting..." : "Connect"}
      </button>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { token } = useAuth();
  const { data: session } = useSession();
  const { data: watchlist } = useWatchlist();
  const { data: brokerStatus, refetch: refetchBrokerStatus } = useBrokerStatus();

  const isConnected = brokerStatus?.is_authenticated === true;

  const { data: portfolio, isLoading: portfolioLoading, refetch: refetchPortfolio } = useBrokerPortfolio(isConnected);
  const { data: positionsData, isLoading: positionsLoading } = useBrokerPositions(isConnected);
  const { data: ordersData, isLoading: ordersLoading } = useBrokerOrders(isConnected);

  const handleConnect = async () => {
    await fetch("/api/broker/connect", { method: "POST" });
    await refetchBrokerStatus();
    await refetchPortfolio();
  };

  const rms = portfolio?.rms ?? {};
  const holdings: any[] = portfolio?.holdings ?? [];
  const positions: any[] = positionsData?.positions ?? [];
  const orders: any[] = ordersData?.orders ?? [];
  const totalPnL = portfolio?.total_pnl ?? 0;
  const estimatedValue = portfolio?.estimated_value ?? 0;

  // ── Not signed in ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <>
        <TopBar title="My Profile" subtitle="Account Settings & Preferences" />
        <PageWrapper>
          <div className="p-8 mt-12 text-center bg-surface border border-border-subtle rounded-xl flex flex-col items-center glass-card max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-6 border border-border-subtle shadow-sm">
              <User className="w-8 h-8 text-muted" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Guest Account</h2>
            <p className="text-sm text-muted mb-6 max-w-sm">Sign in to sync your Watchlist and access your live Angel One portfolio dashboard.</p>
            <button
              onClick={() => signIn("google")}
              className="px-6 py-3 bg-foreground text-surface rounded-lg font-bold transition hover:bg-foreground/90 shadow-md flex items-center gap-2"
            >
              Sign in with Google <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </PageWrapper>
      </>
    );
  }

  return (
    <>
      <TopBar title="My Profile" subtitle="Account & Portfolio Dashboard" />
      <PageWrapper>

        {/* ── Profile Hero Card ──────────────────────────────────────────── */}
        <div className="mb-6 p-6 md:p-8 rounded-2xl bg-surface border border-border-subtle shadow-sm relative overflow-hidden glass-card flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 z-0" />

          <div className="relative z-10">
            {session?.user?.image ? (
              <img src={session.user.image} alt="Profile" className="w-24 h-24 rounded-full border-4 border-surface shadow-md" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-linear-to-br from-accent to-bullish flex items-center justify-center border-4 border-surface shadow-md">
                <span className="text-3xl font-bold text-white tracking-tight">{session?.user?.name?.[0] || "I"}</span>
              </div>
            )}
          </div>

          <div className="relative z-10 flex-1">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-1">{session?.user?.name || "Investor"}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-muted mb-4">
              <Mail className="w-4 h-4" /><span>{session?.user?.email}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <span className="px-3 py-1 bg-surface-2 border border-border-subtle rounded-full text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Shield className="w-3.5 h-3.5 text-accent" /> Secured by Google OAuth
              </span>
              <span className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-xs font-semibold flex items-center gap-1.5 text-accent">
                <Zap className="w-3.5 h-3.5" /> Radar Active
              </span>
              {isConnected && (
                <span className="px-3 py-1 bg-bullish/10 border border-bullish/20 rounded-full text-xs font-semibold flex items-center gap-1.5 text-bullish">
                  <Activity className="w-3.5 h-3.5" /> Angel One Live
                </span>
              )}
            </div>
          </div>

          <div className="relative z-10 w-full md:w-auto flex flex-col gap-2">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full px-5 py-2.5 bg-surface-2 hover:bg-surface-3 transition-colors border border-border-subtle rounded-lg text-sm font-bold text-red-500 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
            {isConnected && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-bullish font-semibold">
                <Wifi className="w-3 h-3" /> {brokerStatus?.client_code}
              </div>
            )}
          </div>
        </div>

        {/* ── Broker Connection Banner (when not connected) ──────────────── */}
        {!isConnected && (
          <div className="mb-6">
            <BrokerConnectBanner onConnect={handleConnect} />
          </div>
        )}

        {/* ── Margin / Funds Overview ────────────────────────────────────── */}
        {isConnected && (
          <div className="mb-6">
            <SectionHeader icon={Wallet} title="Funds & Margins" />
            {portfolioLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-5 rounded-xl bg-surface border border-border-subtle animate-pulse h-28" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Net Balance"
                  value={`₹${rms.net?.toLocaleString("en-IN") ?? "–"}`}
                  icon={DollarSign}
                  color="text-foreground"
                />
                <MetricCard
                  label="Available Cash"
                  value={`₹${rms.available_cash?.toLocaleString("en-IN") ?? "–"}`}
                  icon={Wallet}
                  color="text-bullish"
                />
                <MetricCard
                  label="Used Margin"
                  value={`₹${rms.used_margin?.toLocaleString("en-IN") ?? "–"}`}
                  icon={BarChart2}
                  color="text-amber-400"
                />
                <MetricCard
                  label="Portfolio Value"
                  value={`₹${estimatedValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                  sub={totalPnL !== 0 ? (totalPnL >= 0 ? `+₹${totalPnL.toFixed(2)} total P&L` : `-₹${Math.abs(totalPnL).toFixed(2)} total P&L`) : undefined}
                  icon={Briefcase}
                  color="text-accent"
                  trend={totalPnL > 0 ? "up" : totalPnL < 0 ? "down" : null}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Holdings Table ─────────────────────────────────────────────── */}
        {isConnected && (
          <div className="mb-6 p-6 rounded-2xl bg-surface border border-border-subtle glass-card">
            <SectionHeader icon={TrendingUp} title="Equity Holdings" badge={holdings.length} />
            {portfolioLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-surface-2 animate-pulse" />)}
              </div>
            ) : holdings.length === 0 ? (
              <div className="py-12 text-center text-muted text-sm flex flex-col items-center gap-3">
                <Briefcase className="w-10 h-10 text-muted/40" />
                <p>No holdings found in your demat account.</p>
                <p className="text-xs opacity-70">Holdings appear here once you purchase equities via Angel One.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted border-b border-border-subtle">
                      <th className="pb-3 font-semibold">Symbol</th>
                      <th className="pb-3 font-semibold text-right">Qty</th>
                      <th className="pb-3 font-semibold text-right">Avg Price</th>
                      <th className="pb-3 font-semibold text-right">LTP</th>
                      <th className="pb-3 font-semibold text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {holdings.map((h: any, i: number) => (
                      <tr key={i} className="hover:bg-surface-2/50 transition-colors">
                        <td className="py-3.5">
                          <Link href={`/stock/${h.symbol?.replace("-EQ", "")}`} className="font-bold text-foreground hover:text-accent flex items-center gap-1.5 group">
                            {h.symbol?.replace("-EQ", "")}
                            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          {h.isin && <span className="text-xs text-muted">{h.isin}</span>}
                        </td>
                        <td className="py-3.5 text-right font-semibold">{h.quantity}</td>
                        <td className="py-3.5 text-right text-muted">₹{h.avg_price?.toFixed(2)}</td>
                        <td className="py-3.5 text-right font-bold">₹{h.ltp?.toFixed(2)}</td>
                        <td className="py-3.5 text-right"><PnLBadge value={h.pnl} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Intraday Positions ─────────────────────────────────────────── */}
        {isConnected && (
          <div className="mb-6 p-6 rounded-2xl bg-surface border border-border-subtle glass-card">
            <SectionHeader icon={Activity} title="Open Positions" badge={positions.length} />
            {positionsLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-surface-2 animate-pulse" />)}
              </div>
            ) : positions.length === 0 ? (
              <div className="py-10 text-center text-muted text-sm flex flex-col items-center gap-3">
                <Activity className="w-10 h-10 text-muted/40" />
                <p>No open intraday positions.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted border-b border-border-subtle">
                      <th className="pb-3 font-semibold">Symbol</th>
                      <th className="pb-3 font-semibold">Type</th>
                      <th className="pb-3 font-semibold text-right">Qty</th>
                      <th className="pb-3 font-semibold text-right">Avg Price</th>
                      <th className="pb-3 font-semibold text-right">LTP</th>
                      <th className="pb-3 font-semibold text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {positions.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-surface-2/50 transition-colors">
                        <td className="py-3 font-bold text-foreground">{p.symbol}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-surface-2 text-muted border border-border-subtle">{p.product_type}</span>
                        </td>
                        <td className="py-3 text-right font-semibold">{p.quantity}</td>
                        <td className="py-3 text-right text-muted">₹{p.avg_price?.toFixed(2)}</td>
                        <td className="py-3 text-right font-bold">₹{p.ltp?.toFixed(2)}</td>
                        <td className="py-3 text-right"><PnLBadge value={p.pnl} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Order Book ─────────────────────────────────────────────────── */}
        {isConnected && (
          <div className="mb-6 p-6 rounded-2xl bg-surface border border-border-subtle glass-card">
            <SectionHeader icon={BookOpen} title="Today's Orders" badge={orders.length} />
            {ordersLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-surface-2 animate-pulse" />)}
              </div>
            ) : orders.length === 0 ? (
              <div className="py-10 text-center text-muted text-sm flex flex-col items-center gap-3">
                <BookOpen className="w-10 h-10 text-muted/40" />
                <p>No orders placed today.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted border-b border-border-subtle">
                      <th className="pb-3 font-semibold">Symbol</th>
                      <th className="pb-3 font-semibold">Side</th>
                      <th className="pb-3 font-semibold text-right">Qty</th>
                      <th className="pb-3 font-semibold text-right">Price</th>
                      <th className="pb-3 font-semibold">Type</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {orders.map((o: any, i: number) => (
                      <tr key={i} className="hover:bg-surface-2/50 transition-colors">
                        <td className="py-3">
                          <div className="font-bold text-foreground">{o.symbol}</div>
                          <div className="text-xs text-muted">{o.order_id?.slice(-8)}</div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${o.transaction_type === "BUY" ? "bg-bullish/10 text-bullish" : "bg-bearish/10 text-bearish"}`}>
                            {o.transaction_type}
                          </span>
                        </td>
                        <td className="py-3 text-right font-semibold">{o.quantity}</td>
                        <td className="py-3 text-right">₹{o.price > 0 ? o.price.toFixed(2) : o.ltp?.toFixed(2)}</td>
                        <td className="py-3">
                          <span className="text-xs text-muted">{o.order_type}</span>
                        </td>
                        <td className="py-3"><OrderStatusBadge status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Watchlist + Settings Row ────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-surface border border-border-subtle glass-card flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-surface-2 rounded-lg border border-border-subtle">
                <Star className="w-4 h-4 text-foreground" />
              </div>
              <h3 className="text-lg font-bold">Watchlist Sync</h3>
            </div>
            <p className="text-sm text-muted mb-6 flex-1">
              Tracking <strong className="text-foreground">{Array.isArray(watchlist) ? watchlist.length : 0}</strong> equities in your private cloud matrix. These assets receive accelerated ML polling and live WebSocket tick feeds via Angel One.
            </p>
            <Link
              href="/watchlist"
              className="px-4 py-2 bg-foreground text-surface text-center rounded-lg text-sm font-bold shadow-sm transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              Manage Watchlist <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isConnected && (
            <div className="p-6 rounded-xl bg-surface border border-border-subtle glass-card flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-surface-2 rounded-lg border border-border-subtle">
                  <Activity className="w-4 h-4 text-bullish" />
                </div>
                <h3 className="text-lg font-bold">Live Feed Status</h3>
              </div>
              <p className="text-sm text-muted mb-4 flex-1">
                Angel One <strong className="text-bullish">WebSocket connected</strong>. Your watchlist is receiving live tick-by-tick prices during market hours (9:15 AM – 3:30 PM IST).
              </p>
              <div className="flex flex-col gap-2 text-xs text-muted">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2 border border-border-subtle">
                  <span>Client ID</span>
                  <span className="font-bold text-foreground">{brokerStatus?.client_code}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2 border border-border-subtle">
                  <span>Feed Token</span>
                  <span className="font-bold text-bullish">{brokerStatus?.has_feed_token ? "Active ✓" : "None"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </PageWrapper>
    </>
  );
}
