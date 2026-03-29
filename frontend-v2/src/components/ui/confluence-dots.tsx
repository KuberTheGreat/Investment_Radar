import { cn } from "@/lib/utils";

interface ConfluenceDotsProps {
  score: 0 | 1 | 2 | 3;
  className?: string;
  size?: "sm" | "md";
}

export function ConfluenceDots({ score, className, size = "md" }: ConfluenceDotsProps) {
  const dots = [1, 2, 3];
  
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {dots.map((dot) => (
        <span
          key={dot}
          className={cn(
            "rounded-full transition-colors",
            size === "sm" ? "w-1.5 h-1.5" : "w-2.5 h-2.5",
            dot <= score ? "bg-accent shadow-[0_0_8px_hsla(var(--accent)/0.5)]" : "bg-surface-3"
          )}
        />
      ))}
      <span className={cn(
        "ml-1.5 font-medium tracking-wide",
        size === "sm" ? "text-[10px]" : "text-xs",
        score === 3 ? "text-accent" : "text-muted"
      )}>
        {score === 3 ? "HIGH" : score === 2 ? "MED" : score === 1 ? "LOW" : "NONE"}
      </span>
    </div>
  );
}
