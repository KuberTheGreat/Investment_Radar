"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Filter = "all" | "bullish" | "bearish" | "high";

interface FilterChipsProps {
  active: Filter;
  onChange: (f: Filter) => void;
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bullish", label: "🟢 Bullish" },
  { value: "bearish", label: "🔴 Bearish" },
  { value: "high", label: "⚡ High Conf." },
];

export function FilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            "relative flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium",
            "border transition-all duration-200",
            active === f.value
              ? "border-accent text-accent bg-accent/10"
              : "border-border-subtle text-muted bg-surface-2 hover:bg-surface-3"
          )}
        >
          {active === f.value && (
            <motion.span
              layoutId="filter-pill"
              className="absolute inset-0 rounded-full bg-accent/10 border border-accent"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative">{f.label}</span>
        </button>
      ))}
    </div>
  );
}
