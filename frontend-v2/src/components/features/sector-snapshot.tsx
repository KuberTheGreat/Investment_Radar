import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectorData } from "@/lib/mock-data";

interface SectorSnapshotProps {
  sectors: SectorData[];
}

const trendIcon = (trend: SectorData["trend"]) => {
  if (trend === "up") return <TrendingUp className="w-3 h-3" />;
  if (trend === "down") return <TrendingDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
};

export function SectorSnapshot({ sectors }: SectorSnapshotProps) {
  return (
    <div className="mx-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Sector Snapshot</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sectors.map((sector) => (
          <Link
            key={sector.name}
            href="/radar"
            className="bg-surface rounded-xl border border-border-subtle p-3 flex flex-col gap-1.5 hover:bg-surface-2 transition-colors cursor-pointer block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">{sector.name}</span>
              <span className={cn("flex items-center",
                sector.trend === "up" ? "text-bullish" : sector.trend === "down" ? "text-bearish" : "text-muted"
              )}>
                {trendIcon(sector.trend)}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span className={cn("text-sm font-bold",
                sector.trend === "up" ? "text-bullish" : sector.trend === "down" ? "text-bearish" : "text-muted"
              )}>
                {sector.trend === "up" ? "+" : ""}{sector.changePct.toFixed(2)}%
              </span>
              <span className="text-[10px] text-muted">{sector.signalCount} signals</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
