"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/mock-data";

interface AISignalExplanationProps {
  signal: Signal;
}

interface WinRateBarProps {
  label: string;
  rate: number;
  delay?: number;
}

function WinRateBar({ label, rate, delay = 0 }: WinRateBarProps) {
  const isGood = rate >= 60;
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-muted font-bold uppercase tracking-wider">{label}</span>
        <span className={cn("text-base font-black font-mono", isGood ? "text-bullish" : "text-muted")}>
          {rate}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
          className={cn("h-full rounded-full", isGood ? "bg-bullish" : "bg-muted")}
        />
      </div>
    </div>
  );
}

interface EvidenceItem {
  met: boolean;
  text: string;
}

function EvidenceRow({ met, text }: EvidenceItem) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={cn("text-sm mt-0.5 flex-shrink-0", met ? "text-bullish" : "text-muted opacity-50")}>
        {met ? "✅" : "❌"}
      </span>
      <span className={cn("text-xs leading-relaxed", met ? "text-foreground" : "text-muted line-through")}>{text}</span>
    </div>
  );
}

export function AISignalExplanation({ signal }: AISignalExplanationProps) {
  const evidence: EvidenceItem[] = [
    { met: true, text: `${signal.pattern} detected on ${signal.timeframe} chart` },
    { met: true, text: `Historical win rate: ${signal.winRate5d}% over last 50 occurrences` },
    { met: signal.confluenceScore >= 2, text: `Corporate event confirmation within 5 days` },
    { met: signal.confluenceScore === 3, text: `Volume spike confirms institutional activity` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mx-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-base">🤖</span>
        <h2 className="text-sm font-bold text-foreground">AI Explanation</h2>
        <span className="text-[10px] text-muted">Powered by Llama 3.3-70B</span>
      </div>

      {/* Quote block */}
      <blockquote className="border-l-2 border-accent pl-4 py-1">
        <p className="text-sm text-muted leading-relaxed italic">{signal.oneLiner}</p>
      </blockquote>

      {/* Win rates */}
      <div className="rounded-2xl bg-surface border border-border-subtle p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Historical Accuracy</p>
        <div className="flex gap-5">
          <WinRateBar label="5-Day" rate={signal.winRate5d} delay={0.3} />
          <WinRateBar label="15-Day" rate={signal.winRate15d} delay={0.4} />
        </div>
        <p className="text-[10px] text-muted mt-3">
          Based on the last 50 occurrences of {signal.pattern} on {signal.symbol}
        </p>
      </div>

      {/* Evidence checklist */}
      <div className="rounded-2xl bg-surface border border-border-subtle p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Evidence Checklist</p>
        <div className="space-y-2.5">
          {evidence.map((e, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.08 }}
            >
              <EvidenceRow {...e} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
