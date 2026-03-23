import { cn } from "@/components/ui/cn";

interface ConfluenceScoreProps {
  score: number | null | undefined;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const MAX_SCORE = 3;

export function ConfluenceScore({
  score,
  showLabel = true,
  size = "md",
}: ConfluenceScoreProps) {
  const safeScore = score ?? 0;

  const getColor = () => {
    if (safeScore >= 3) return "text-bullish";
    if (safeScore >= 2) return "text-amber";
    if (safeScore >= 1) return "text-muted";
    return "text-muted-2";
  };

  const getDiamondFill = (index: number) =>
    index < safeScore ? "opacity-100" : "opacity-20";

  const getLabel = () => {
    if (safeScore >= 3) return "High";
    if (safeScore >= 2) return "Medium";
    if (safeScore >= 1) return "Low";
    return "None";
  };

  const diamondSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: MAX_SCORE }).map((_, i) => (
          <div
            key={i}
            className={cn(
              diamondSize,
              "rotate-45 rounded-sm transition-all",
              getColor(),
              getDiamondFill(i),
              safeScore >= 3 && i < safeScore
                ? "bg-current shadow-[0_0_6px_currentColor]"
                : "bg-current"
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className={cn("text-xs font-medium", getColor())}>
          {getLabel()}
        </span>
      )}
    </div>
  );
}
