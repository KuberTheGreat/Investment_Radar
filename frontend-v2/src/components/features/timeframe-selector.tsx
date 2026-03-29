"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "1d";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "1d"];

interface TimeframeSelectorProps {
  active: Timeframe;
  onChange: (tf: Timeframe) => void;
}

export function TimeframeSelector({ active, onChange }: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-surface-2 rounded-xl p-1 mx-4 my-3">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={cn(
            "relative flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors duration-150",
            active === tf ? "text-background" : "text-muted hover:text-foreground"
          )}
        >
          {active === tf && (
            <motion.span
              layoutId="tf-pill"
              className="absolute inset-0 rounded-lg bg-accent"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative">{tf}</span>
        </button>
      ))}
    </div>
  );
}
