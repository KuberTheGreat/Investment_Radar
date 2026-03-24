import {
  Building2,
  TrendingUp,
  TrendingDown,
  Users,
} from "lucide-react";
import { CorporateEvent } from "@/lib/api";
import { formatDate, getEventTypeLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";

const EVENT_TYPE_ICONS: Record<string, React.ElementType> = {
  insider_buy: TrendingUp,
  insider_sell: TrendingDown,
  promoter_buy: TrendingUp,
  promoter_sell: TrendingDown,
  bulk_deal: Users,
  block_deal: Building2,
};

interface CorporateEventItemProps {
  event: CorporateEvent;
}

export function CorporateEventItem({ event }: CorporateEventItemProps) {
  const Icon = EVENT_TYPE_ICONS[event.event_type] ?? Building2;
  const isBuy = event.event_type.includes("buy");
  const isSell = event.event_type.includes("sell");

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
        event.is_anomaly
          ? "bg-amber/5 border-amber/20"
          : "bg-surface-2 border-border-subtle"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          isBuy
            ? "bg-bullish/10 border border-bullish/20"
            : isSell
            ? "bg-bearish/10 border border-bearish/20"
            : "bg-surface-3 border border-border"
        )}
      >
        <Icon
          className={cn(
            "w-4 h-4",
            isBuy ? "text-bullish" : isSell ? "text-bearish" : "text-muted"
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-semibold text-foreground">
            {getEventTypeLabel(event.event_type)}
          </span>
          {event.is_anomaly && (
            <Badge variant="amber" dot>
              Anomaly
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted truncate">{event.party_name}</p>
        <p className="text-[10px] text-muted-2 mt-0.5">{formatDate(event.event_date)}</p>
      </div>

      {event.total_value_cr != null && (
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-semibold text-foreground">
            ₹{event.total_value_cr.toFixed(2)} Cr
          </p>
        </div>
      )}
    </div>
  );
}
