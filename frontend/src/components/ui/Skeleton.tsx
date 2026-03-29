import { cn } from "./cn";

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skeleton h-4", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-4 space-y-3 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-card p-3 flex items-center gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24 flex-1" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
