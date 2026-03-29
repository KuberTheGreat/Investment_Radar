"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Star, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { WatchlistRow } from "@/components/features/watchlist-row";
import { AddStockSheet } from "@/components/features/add-stock-sheet";
import { radarApi } from "@/lib/api";

const WL_KEY = "investment_radar_watchlist";

function loadWatchlist(): string[] {
  if (typeof window === "undefined") return ["RELIANCE", "TATAMOTORS", "ETERNAL"];
  try {
    const stored = localStorage.getItem(WL_KEY);
    return stored ? JSON.parse(stored) : ["RELIANCE", "TATAMOTORS", "ETERNAL"];
  } catch {
    return ["RELIANCE", "TATAMOTORS", "ETERNAL"];
  }
}

export default function WatchlistPage() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<string[]>(loadWatchlist);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(WL_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  // Fetch live signals to enrich watchlist rows
  const { data: allSignals = [], isLoading } = useQuery({
    queryKey: ["signals"],
    queryFn: () => radarApi.getSignals(),
    staleTime: 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

  // Build a lookup map: symbol -> best signal
  const signalMap = new Map(allSignals.map(s => [s.symbol, s]));

  // For every symbol in watchlist, create an enriched row
  const watchlistRows = watchlist.map(symbol => {
    const live = signalMap.get(symbol);
    return live ?? {
      id: symbol,
      symbol,
      companyName: `${symbol} Ltd`,
      direction: "bullish" as const,
      pattern: "—",
      timeframe: "1D",
      confluenceScore: 0,
      price: 0,
      priceChange: 0,
      priceChangePct: 0,
      oneLiner: "",
      detectedAt: "",
      winRate5d: 0,
      eventHighlight: undefined,
    };
  });

  const signalCount = watchlistRows.filter(s => s.confluenceScore > 0).length;

  const removeStock = (symbol: string) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
  };

  const addStock = (symbol: string) => {
    const clean = symbol.replace(".NS", "").replace(".BO", "").toUpperCase();
    if (!watchlist.includes(clean)) {
      setWatchlist(prev => [...prev, clean]);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border-subtle">
        <div className="flex items-center justify-between px-4 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-warning fill-warning" />
            <div>
              <h1 className="text-xl font-black tracking-tight text-foreground">Watchlist</h1>
              <p className="text-xs text-muted">{watchlist.length} stocks tracked</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-background text-sm font-bold hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add
          </motion.button>
        </div>

        {/* Signal alert banner */}
        <AnimatePresence>
          {signalCount > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mx-4 mb-3 flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-accent/10 border border-accent/25">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-accent shrink-0" />
                  <p className="text-xs font-medium text-accent">
                    <span className="font-bold">{signalCount} new {signalCount === 1 ? "signal" : "signals"}</span> detected on your watchlist stocks today
                  </p>
                </div>
                <button
                  onClick={() => router.push("/radar")}
                  className="text-[10px] font-bold text-accent shrink-0 hover:underline"
                >
                  View all →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      <div className="mt-4 space-y-2.5">
        {isLoading ? (
          <div className="mx-4 space-y-2.5">
            {watchlist.map(sym => (
              <div key={sym} className="h-20 rounded-2xl bg-surface border border-border-subtle animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {watchlistRows.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-4 py-20 flex flex-col items-center justify-center rounded-2xl bg-surface border border-border-subtle"
              >
                <Star className="w-10 h-10 text-muted mb-4" />
                <p className="text-sm font-semibold text-foreground">Your watchlist is empty</p>
                <p className="text-xs text-muted mt-1 text-center max-w-xs">
                  Add stocks to track them and get notified when signals are detected
                </p>
                <button
                  onClick={() => setSheetOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-accent text-background text-sm font-bold hover:bg-accent/90 transition-colors"
                >
                  Add your first stock
                </button>
              </motion.div>
            ) : (
              watchlistRows.map((signal, i) => (
                <WatchlistRow
                  key={signal.symbol}
                  signal={signal}
                  index={i}
                  onRemove={removeStock}
                  onNavigate={(sym) => router.push(`/stock/${sym}`)}
                />
              ))
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Footer note */}
      {watchlistRows.length > 0 && (
        <p className="text-center text-[10px] text-muted mt-6">
          Hover to remove · Tap to view analysis
        </p>
      )}

      {/* Add stock sheet */}
      <AddStockSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={addStock}
        watchlistSymbols={watchlist}
      />
    </div>
  );
}
