"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Plus, Loader2 } from "lucide-react";
import { radarApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AddStockSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (symbol: string) => void;
  watchlistSymbols?: string[];
}

export function AddStockSheet({ isOpen, onClose, onAdd, watchlistSymbols = [] }: AddStockSheetProps) {
  const [query, setQuery] = useState("");

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => radarApi.searchSuggestions(query),
    enabled: query.trim().length > 1,
    staleTime: 60 * 1000,
  });

  const filteredResults = results.filter((s: { symbol: string }) => !watchlistSymbols.includes(s.symbol));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-surface border-t border-border max-w-lg mx-auto"
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-border mx-auto mt-3 mb-4" />

            <div className="px-4 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Add to Watchlist</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-3 transition-colors">
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>

              {/* Search input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search Zomato, SBIN, Reliance..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-10 py-3 rounded-xl bg-surface-2 border border-border-subtle text-foreground
                             text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                />
                {isLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted animate-spin" />
                )}
              </div>

              {/* Results */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-hide">
                {query.trim().length > 1 && !isLoading && filteredResults.length === 0 ? (
                  <p className="text-center text-sm text-muted py-6">No stocks found for "{query}"</p>
                ) : query.trim().length <= 1 ? (
                  <p className="text-center text-sm text-muted py-6">Type at least 2 characters to search</p>
                ) : (
                  filteredResults.map((s: { symbol: string; name: string; exchange: string }) => (
                    <button
                      key={s.symbol}
                      onClick={() => { onAdd(s.symbol); onClose(); }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-2
                                 hover:bg-surface-3 transition-colors text-left group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{s.symbol.replace("-EQ", "")}</span>
                          <span className="text-[10px] text-muted bg-surface-3 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                            {s.exchange}
                          </span>
                        </div>
                        <p className="text-xs text-muted truncate max-w-[200px]">{s.name}</p>
                      </div>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-3 group-hover:bg-accent/10 transition-colors">
                        <Plus className="w-4 h-4 text-muted group-hover:text-accent" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
