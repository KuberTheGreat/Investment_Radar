import React from "react";
import { cn } from "./cn";

type BadgeVariant =
  | "bullish"
  | "bearish"
  | "accent"
  | "amber"
  | "muted"
  | "pattern"
  | "opportunity";

const variantStyles: Record<BadgeVariant, string> = {
  bullish:
    "bg-bullish/10 border border-bullish/30 text-bullish",
  bearish:
    "bg-bearish/10 border border-bearish/30 text-bearish",
  accent:
    "bg-accent/10 border border-accent/30 text-accent",
  amber:
    "bg-amber/10 border border-amber/30 text-amber",
  muted:
    "bg-surface-3 border border-border text-muted",
  pattern:
    "bg-amber/10 border border-amber/30 text-amber",
  opportunity:
    "bg-accent/10 border border-accent/30 text-accent",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({
  variant = "muted",
  children,
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            variant === "bullish"
              ? "bg-bullish"
              : variant === "bearish"
              ? "bg-bearish"
              : variant === "accent"
              ? "bg-accent"
              : variant === "amber" || variant === "pattern"
              ? "bg-amber"
              : "bg-muted-2"
          }`}
        />
      )}
      {children}
    </span>
  );
}
