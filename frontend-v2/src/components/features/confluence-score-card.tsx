import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ConfluenceScoreCardProps {
  score: 0 | 1 | 2 | 3;
  patternName: string;
  className?: string;
}

const LABELS = ["No Signal", "Low", "Medium", "High"] as const;
const DESCRIPTIONS = [
  "No signals aligned",
  "Pattern only — proceed with caution",
  "Pattern + historical accuracy confirmed",
  "Pattern + history + corporate event aligned",
] as const;

export function ConfluenceScoreCard({ score, patternName, className }: ConfluenceScoreCardProps) {
  const isHigh = score === 3;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={cn(
        "mx-4 rounded-2xl border p-5",
        isHigh
          ? "border-accent/30 bg-accent/5 animate-glow-pulse"
          : "border-border-subtle bg-surface",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Confluence Score</p>
        <span className="text-[10px] text-muted">{patternName}</span>
      </div>

      {/* Large dots */}
      <div className="flex items-center gap-3 mb-3">
        {[1, 2, 3].map((dot) => (
          <motion.span
            key={dot}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 + dot * 0.08, type: "spring", stiffness: 400 }}
            className={cn(
              "rounded-full transition-all duration-300",
              "w-5 h-5",
              dot <= score
                ? "bg-accent shadow-[0_0_12px_2px_hsl(var(--accent)/0.4)]"
                : "bg-surface-3 border border-border"
            )}
          />
        ))}
        <span className={cn(
          "ml-2 text-xl font-black",
          score === 3 ? "text-accent" : score === 2 ? "text-foreground" : "text-muted"
        )}>
          {LABELS[score]}
        </span>
      </div>

      <p className="text-xs text-muted leading-relaxed">{DESCRIPTIONS[score]}</p>

      {isHigh && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-3 flex items-center gap-1.5 text-xs text-accent font-medium"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          All 3 confirmation factors present
        </motion.div>
      )}
    </motion.div>
  );
}
