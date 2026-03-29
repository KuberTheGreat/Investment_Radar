"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Star, ArrowRight } from "lucide-react";
import { ConfluenceDots } from "@/components/ui/confluence-dots";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/mock-data";
import { useRouter } from "next/navigation";

interface SignalDetailSheetProps {
  signal: Signal | null;
  isOpen: boolean;
  onClose: () => void;
  onWatchlist?: (symbol: string) => void;
}

export function SignalDetailSheet({ signal, isOpen, onClose, onWatchlist }: SignalDetailSheetProps) {
  const router = useRouter();
  if (!signal) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-surface border-t border-border rounded-t-3xl max-w-lg mx-auto max-h-[80vh] overflow-y-auto scrollbar-hide"
          >
            {/* Drag handle */}
            <div className="sticky top-0 bg-surface pt-3 pb-2 px-4 flex items-center justify-between border-b border-border-subtle">
              <div className="w-10 h-1 rounded-full bg-border mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
              <div className="mt-4">
                <h2 className="text-lg font-black text-foreground">{signal.symbol} Signal</h2>
                <p className="text-xs text-muted">{signal.pattern} · {signal.timeframe}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-3 mt-4">
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Direction + Confluence */}
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold",
                  signal.direction === "bullish" ? "badge-bullish" : "badge-bearish"
                )}>
                  {signal.direction === "bullish" ? "↑" : "↓"} {signal.direction.charAt(0).toUpperCase() + signal.direction.slice(1)}
                </span>
                <ConfluenceDots score={signal.confluenceScore} />
              </div>

              {/* AI Quote */}
              <blockquote className="border-l-2 border-accent pl-4">
                <p className="text-sm text-muted italic leading-relaxed">{signal.oneLiner}</p>
              </blockquote>

              {/* Win rates */}
              <div className="grid grid-cols-2 gap-3">
                {[{ label: "5-Day Win Rate", rate: signal.winRate5d }, { label: "15-Day Win Rate", rate: signal.winRate15d }].map(({ label, rate }) => (
                  <div key={label} className="bg-surface-2 rounded-xl p-3 border border-border-subtle">
                    <p className="text-[10px] text-muted uppercase tracking-wider font-bold mb-1">{label}</p>
                    <p className={cn("text-xl font-black font-mono", rate >= 65 ? "text-bullish" : "text-foreground")}>{rate}%</p>
                  </div>
                ))}
              </div>

              {/* Event highlight */}
              {signal.eventHighlight && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-accent/5 border border-accent/20">
                  <span className="text-lg">📦</span>
                  <div>
                    <p className="text-xs font-bold text-accent">Corporate Event</p>
                    <p className="text-xs text-foreground">{signal.eventHighlight}</p>
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { router.push(`/advisor?symbol=${signal.symbol}`); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-background font-bold text-sm hover:bg-accent/90 transition-colors"
                >
                  🤖 Ask AI <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { onWatchlist?.(signal.symbol); onClose(); }}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-border-subtle bg-surface-2 hover:bg-surface-3 text-sm font-semibold text-foreground transition-colors"
                >
                  <Star className="w-4 h-4 text-warning" /> Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
