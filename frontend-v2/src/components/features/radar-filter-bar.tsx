"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ConfidenceFilter = "all" | "high" | "medium" | "low";
export type DirectionFilter = "all" | "bullish" | "bearish";
export type SortOption = "newest" | "confidence" | "winrate";

interface RadarFilterBarProps {
  confidence: ConfidenceFilter;
  direction: DirectionFilter;
  sort: SortOption;
  onConfidenceChange: (v: ConfidenceFilter) => void;
  onDirectionChange: (v: DirectionFilter) => void;
  onSortChange: (v: SortOption) => void;
}

const CONFIDENCE_OPTS: { value: ConfidenceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "high", label: "●●● High" },
  { value: "medium", label: "●●○ Med" },
  { value: "low", label: "●○○ Low" },
];

const DIRECTION_OPTS: { value: DirectionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bullish", label: "🟢 Bullish" },
  { value: "bearish", label: "🔴 Bearish" },
];

const SORT_OPTS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "confidence", label: "Confidence" },
  { value: "winrate", label: "Win Rate" },
];

function ChipGroup<T extends string>({
  label, options, active, onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted min-w-fit">{label}</span>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200",
              active === o.value
                ? "border-accent text-accent bg-accent/10"
                : "border-border-subtle text-muted bg-surface-2 hover:bg-surface-3"
            )}
          >
            {active === o.value && (
              <motion.span
                layoutId={`radar-chip-${label}`}
                className="absolute inset-0 rounded-full bg-accent/10 border border-accent"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function RadarFilterBar({ confidence, direction, sort, onConfidenceChange, onDirectionChange, onSortChange }: RadarFilterBarProps) {
  return (
    <div className="bg-surface border-b border-border-subtle px-4 py-3 space-y-2.5 sticky top-0 z-30">
      <ChipGroup label="Conf." options={CONFIDENCE_OPTS} active={confidence} onChange={onConfidenceChange} />
      <div className="flex items-center justify-between gap-3">
        <ChipGroup label="Dir." options={DIRECTION_OPTS} active={direction} onChange={onDirectionChange} />
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Sort</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="text-xs bg-surface-2 border border-border-subtle text-foreground rounded-lg px-2 py-1 focus:outline-none focus:border-accent"
          >
            {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
