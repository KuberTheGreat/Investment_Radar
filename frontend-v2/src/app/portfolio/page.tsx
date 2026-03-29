"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, TrendingUp, TrendingDown, Zap, RefreshCw, Link2, Lock, ArrowUpRight } from "lucide-react";
import { radarApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const API = "/api/broker";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BrokerStatus {
  is_authenticated: boolean;
  client_code: string | null;
  has_feed_token: boolean;
}

interface Holding {
  symbol: string;
  quantity: number;
  avg_price: number;
  ltp: number;
  pnl: number;
  pnl_pct: number;
}

interface Position {
  symbol: string;
  exchange: string;
  product_type: string;
  quantity: number;
  avg_price: number;
  ltp: number;
  pnl: number;
  day_change_pct: number;
}

interface Order {
  order_id: string;
  symbol: string;
  transaction_type: string;
  quantity: number;
  price: number;
  ltp: number;
  status: string;
  product_type: string;
  order_type: string;
  timestamp: string;
  exchange: string;
}

interface Portfolio {
  holdings: Holding[];
  total_holdings: number;
  estimated_value: number;
  total_pnl: number;
  rms: {
    available_cash: number;
    available_margin: number;
    used_margin: number;
    net: number;
  };
}

// ── Small components ──────────────────────────────────────────────────────────

function FundCard({ label, value, isPositive }: { label: string; value: string; isPositive?: boolean }) {
  return (
    <div className="bg-surface-2 rounded-xl p-3.5 border border-border-subtle">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">{label}</p>
      <p className={cn("text-base font-bold font-mono", isPositive === undefined ? "text-foreground" : isPositive ? "text-bullish" : "text-bearish")}>
        {value}
      </p>
    </div>
  );
}

function ConnectPrompt({ onConnect, isConnecting }: { onConnect: () => void; isConnecting: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-8 rounded-2xl border border-border-subtle bg-surface overflow-hidden"
    >
      <div className="p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <Link2 className="w-5 h-5 text-accent" />
        </div>
        <h2 className="text-base font-bold text-foreground mb-2">Connect Your Broker</h2>
        <p className="text-xs text-muted leading-relaxed mb-5">
          See your live portfolio, real-time P&amp;L, and get AI signals for stocks you already own.
          Currently supporting Angel One. Make sure your credentials are set in the backend <code className="bg-surface-3 px-1 rounded">.env</code> file.
        </p>
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className="w-full py-3 rounded-xl bg-accent text-background font-bold text-sm hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isConnecting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          {isConnecting ? "Connecting…" : "Connect Angel One"}
        </button>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <Lock className="w-3 h-3 text-muted" />
          <p className="text-[10px] text-muted">Credentials from your server .env — never stored in plain text</p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Holdings tab ──────────────────────────────────────────────────────────────

function HoldingsTab({ holdings, signals }: { holdings: Holding[]; signals: any[] }) {
  const router = useRouter();
  const signalMap = new Map(signals.map(s => [s.symbol, s]));

  if (holdings.length === 0) {
    return (
      <div className="mx-4 py-16 flex flex-col items-center justify-center rounded-2xl bg-surface border border-border-subtle">
        <Briefcase className="w-8 h-8 text-muted mb-3" />
        <p className="text-sm font-semibold text-foreground">No holdings found</p>
        <p className="text-xs text-muted mt-1">Your Angel One demat holdings will appear here</p>
      </div>
    );
  }

  return (
    <div className="mx-4 space-y-2.5">
      {holdings.map((h, i) => {
        const isUp = h.pnl >= 0;
        const liveSignal = signalMap.get(h.symbol.replace("-EQ", "").replace("-BE", ""));
        const pnlPct = h.avg_price > 0 ? ((h.ltp - h.avg_price) / h.avg_price) * 100 : 0;

        return (
          <motion.div
            key={h.symbol}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => router.push(`/stock/${h.symbol.replace("-EQ", "").replace("-BE", "")}`)}
            className="rounded-2xl border border-border-subtle bg-surface p-4 hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg text-foreground">{h.symbol.replace("-EQ", "")}</span>
                  {liveSignal && liveSignal.confluenceScore > 0 && (
                    <span className={cn(
                      "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                      liveSignal.confluenceScore === 3 ? "text-accent bg-accent/10" : "text-muted bg-surface-3"
                    )}>
                      <Zap className="w-2.5 h-2.5" />
                      {liveSignal.confluenceScore === 3 ? "HIGH signal" : "MED signal"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">{h.quantity} shares · Avg ₹{h.avg_price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold font-mono text-foreground">
                  {h.ltp > 0 ? `₹${h.ltp.toFixed(2)}` : "—"}
                </p>
                {h.ltp > 0 && (
                  <p className={cn("text-xs font-semibold flex items-center justify-end gap-0.5", isUp ? "text-bullish" : "text-bearish")}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isUp ? "+" : ""}₹{Math.abs(h.pnl).toFixed(0)} ({isUp ? "+" : ""}{pnlPct.toFixed(2)}%)
                  </p>
                )}
              </div>
            </div>

            {liveSignal && liveSignal.confluenceScore === 3 && (
              <div className="mt-2 pt-2 border-t border-border-subtle flex items-center justify-between">
                <p className="text-xs text-accent truncate flex-1">&ldquo;{liveSignal.oneLiner}&rdquo;</p>
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/stock/${liveSignal.symbol}`); }}
                  className="text-[10px] text-accent flex items-center gap-1 ml-2 shrink-0 hover:underline"
                >
                  View Signal <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Positions tab ─────────────────────────────────────────────────────────────

function PositionsTab({ positions }: { positions: Position[] }) {
  if (positions.length === 0) {
    return (
      <div className="mx-4 py-16 text-center rounded-2xl bg-surface border border-border-subtle">
        <p className="text-sm font-medium text-foreground">No open positions today</p>
        <p className="text-xs text-muted mt-1">Markets are open 9:15 AM – 3:30 PM IST</p>
      </div>
    );
  }

  return (
    <div className="mx-4 space-y-2.5">
      {positions.map((p, i) => {
        const isUp = p.pnl >= 0;
        return (
          <motion.div
            key={`${p.symbol}-${i}`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-border-subtle bg-surface p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-black text-lg text-foreground">{p.symbol.replace("-EQ", "")}</span>
                <p className="text-xs text-muted">{p.quantity} × {p.product_type} · {p.exchange}</p>
                <p className="text-xs text-muted">Avg ₹{p.avg_price.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold font-mono text-foreground">₹{p.ltp.toFixed(2)}</p>
                <p className={cn("text-xs font-semibold", isUp ? "text-bullish" : "text-bearish")}>
                  {isUp ? "+" : ""}₹{p.pnl.toFixed(0)} ({isUp ? "+" : ""}{p.day_change_pct.toFixed(2)}%)
                </p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Orders tab ────────────────────────────────────────────────────────────────

function OrdersTab({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="mx-4 py-16 text-center rounded-2xl bg-surface border border-border-subtle">
        <p className="text-sm font-medium text-foreground">No orders today</p>
        <p className="text-xs text-muted mt-1">Your order history will appear here</p>
      </div>
    );
  }

  return (
    <div className="mx-4 space-y-2.5">
      {orders.map((o, i) => {
        const statusColor = o.status === "complete" ? "text-bullish" : o.status === "rejected" ? "text-bearish" : "text-muted";
        return (
          <motion.div
            key={o.order_id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border-subtle bg-surface p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-base text-foreground">{o.symbol.replace("-EQ", "")}</span>
                  <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", o.transaction_type === "BUY" ? "bg-bullish/10 text-bullish" : "bg-bearish/10 text-bearish")}>
                    {o.transaction_type}
                  </span>
                </div>
                <p className="text-xs text-muted">{o.quantity} shares · {o.order_type}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold font-mono text-foreground">₹{o.price > 0 ? o.price.toFixed(2) : "MARKET"}</p>
                <p className={cn("text-[10px] font-bold uppercase", statusColor)}>{o.status}</p>
              </div>
            </div>
            {o.timestamp && (
              <p className="text-[10px] text-muted mt-1">{o.timestamp}</p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<"holdings" | "positions" | "orders">("holdings");
  const queryClient = useQueryClient();

  // Check broker connection status
  const { data: brokerStatus, isLoading: statusLoading } = useQuery<BrokerStatus>({
    queryKey: ["broker-status"],
    queryFn: async () => {
      const res = await fetch(`${API}/status`);
      return res.json();
    },
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });

  const connected = brokerStatus?.is_authenticated ?? false;

  // Fetch portfolio (only when connected)
  const { data: portfolio, isLoading: portfolioLoading, refetch: refetchPortfolio } = useQuery<Portfolio>({
    queryKey: ["broker-portfolio"],
    queryFn: async () => {
      const res = await fetch(`${API}/portfolio`);
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      return res.json();
    },
    enabled: connected,
    staleTime: 30 * 1000,
  });

  const { data: positionsData, isLoading: posLoading } = useQuery<{ positions: Position[] }>({
    queryKey: ["broker-positions"],
    queryFn: async () => {
      const res = await fetch(`${API}/positions`);
      if (!res.ok) throw new Error("Failed to fetch positions");
      return res.json();
    },
    enabled: connected && activeTab === "positions",
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ["broker-orders"],
    queryFn: async () => {
      const res = await fetch(`${API}/orders`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: connected && activeTab === "orders",
  });

  // Enrich holdings with live signals
  const { data: signals = [] } = useQuery({
    queryKey: ["signals"],
    queryFn: radarApi.getSignals,
    staleTime: 60 * 1000,
  });

  // Connect broker mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/connect`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Connection failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broker-status"] });
      queryClient.invalidateQueries({ queryKey: ["broker-portfolio"] });
    },
  });

  const holdings = portfolio?.holdings ?? [];
  const rms = portfolio?.rms;
  const positions = positionsData?.positions ?? [];
  const orders = ordersData?.orders ?? [];

  const estimatedValue = portfolio?.estimated_value ?? 0;
  const totalPnl = portfolio?.total_pnl ?? 0;

  const TABS = [
    { id: "holdings" as const, label: "Holdings" },
    { id: "positions" as const, label: "Positions" },
    { id: "orders" as const, label: "Orders" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border-subtle">
        <div className="flex items-center justify-between px-4 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-accent" />
            <div>
              <h1 className="text-xl font-black tracking-tight text-foreground">Portfolio</h1>
              <p className={cn("text-xs font-medium flex items-center gap-1", connected ? "text-bullish" : "text-muted")}>
                <span className={cn("w-1.5 h-1.5 rounded-full inline-block", connected ? "bg-bullish" : "bg-muted")} />
                {connected ? `Angel One · Live · ${brokerStatus?.client_code}` : "Not connected"}
              </p>
            </div>
          </div>
          {connected && (
            <button
              onClick={() => refetchPortfolio()}
              className="p-2 rounded-full hover:bg-surface-3 transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4 text-muted", portfolioLoading ? "animate-spin" : "")} />
            </button>
          )}
        </div>
      </div>

      {statusLoading ? (
        <div className="mx-4 mt-8 h-40 rounded-2xl bg-surface border border-border-subtle animate-pulse" />
      ) : !connected ? (
        <>
          <ConnectPrompt
            onConnect={() => connectMutation.mutate()}
            isConnecting={connectMutation.isPending}
          />
          {connectMutation.isError && (
            <p className="mx-4 mt-3 text-xs text-center text-bearish">
              ⚠️ {(connectMutation.error as Error).message}
            </p>
          )}
        </>
      ) : (
        <div className="space-y-4 mt-4">
          {/* Funds summary */}
          {portfolioLoading ? (
            <div className="mx-4 grid grid-cols-2 gap-2.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-surface animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="mx-4 grid grid-cols-2 gap-2.5">
              <FundCard label="Available Cash" value={rms?.available_cash ? `₹${rms.available_cash.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"} />
              <FundCard label="Holdings Value" value={estimatedValue > 0 ? `₹${estimatedValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"} />
              <FundCard
                label="Total P&L"
                value={totalPnl !== 0 ? `${totalPnl >= 0 ? "▲ +" : "▼ "}₹${Math.abs(totalPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
                isPositive={totalPnl >= 0}
              />
              <FundCard label="Available Margin" value={rms?.available_margin ? `₹${rms.available_margin.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"} />
            </div>
          )}

          {/* Tab bar */}
          <div className="mx-4 flex border-b border-border-subtle">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex-1 py-2.5 text-sm font-semibold transition-colors",
                  activeTab === tab.id ? "text-accent" : "text-muted hover:text-foreground"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="portfolio-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "holdings" && (
              <motion.div key="holdings" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                {portfolioLoading ? (
                  <div className="mx-4 space-y-2.5">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-surface animate-pulse" />)}
                  </div>
                ) : (
                  <HoldingsTab holdings={holdings} signals={signals} />
                )}
              </motion.div>
            )}

            {activeTab === "positions" && (
              <motion.div key="positions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                {posLoading ? (
                  <div className="mx-4 space-y-2.5">
                    {[...Array(2)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />)}
                  </div>
                ) : (
                  <PositionsTab positions={positions} />
                )}
              </motion.div>
            )}

            {activeTab === "orders" && (
              <motion.div key="orders" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                {ordersLoading ? (
                  <div className="mx-4 space-y-2.5">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />)}
                  </div>
                ) : (
                  <OrdersTab orders={orders} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
