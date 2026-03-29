"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Flame, Activity, Shield } from "lucide-react";

const PROFILES = [
  {
    id: "aggressive",
    title: "Aggressive",
    description: "High risk, high reward. Options & Momentum.",
    icon: Flame,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
  },
  {
    id: "moderate",
    title: "Moderate",
    description: "Balanced approach. Swing trades & value.",
    icon: Activity,
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/30",
  },
  {
    id: "conservative",
    title: "Conservative",
    description: "Capital preservation. Blue chips & dividends.",
    icon: Shield,
    color: "text-bullish",
    bg: "bg-bullish/10",
    border: "border-bullish/30",
  },
];

export function RiskProfileSlide() {
  const [selected, setSelected] = useState<string>("moderate");

  return (
    <div className="flex flex-col h-full justify-center px-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">
          Tailor your radar.
        </h2>
        <p className="text-sm text-muted leading-relaxed font-medium">
          Select your trading style. AI will filter and score signals based on your profile.
        </p>
      </motion.div>

      <div className="space-y-3">
        {PROFILES.map((p, i) => {
          const isSelected = selected === p.id;
          const Icon = p.icon;

          return (
            <motion.button
              key={p.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(p.id)}
              className={cn(
                "w-full p-4 rounded-2xl flex items-center gap-4 text-left border transition-all duration-200 relative overflow-hidden",
                isSelected
                  ? `bg-surface-2 ${p.border}`
                  : "bg-surface border-border-subtle hover:bg-surface-2"
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="profileHighlight"
                  className={cn("absolute inset-y-0 left-0 w-1", p.bg)}
                />
              )}

              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", p.bg)}>
                <Icon className={cn("w-6 h-6", p.color)} />
              </div>

              <div>
                <h3 className={cn("text-base font-bold mb-0.5", isSelected ? "text-foreground" : "text-foreground/80")}>
                  {p.title}
                </h3>
                <p className="text-xs text-muted font-medium pr-2">
                  {p.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
