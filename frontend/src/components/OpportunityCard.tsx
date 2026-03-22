"use client";
import { ExternalLink, AlertTriangle } from "lucide-react";
import type { Signal } from "@/lib/api";

const ANOMALY_LABELS: Record<string, string> = {
  promoter_buy: "Promoter buy during decline",
  insider_buy: "Insider buying spree",
  block_deal: "Block deal at premium",
  promoter_pledge_reduction: "Promoter pledge reduction",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function OpportunityCard({ signal }: { signal: Signal }) {
  return (
    <div
      className="card-hover rounded-xl p-5 border cursor-pointer h-full flex flex-col"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-subtle)",
        borderLeft: "3px solid #f59e0b",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} color="#f59e0b" />
            <span className="font-bold text-base text-slate-100">{signal.symbol}</span>
          </div>
          <p className="text-xs text-amber-400 font-medium mt-0.5">
            {ANOMALY_LABELS[signal.source_reference?.split("_")[0] ?? ""] ?? "Market Anomaly"}
          </p>
        </div>
        <span className="text-xs text-slate-500">{timeAgo(signal.created_at)}</span>
      </div>

      {/* One-liner */}
      <p className="text-sm text-slate-300 leading-relaxed mb-4 flex-1">
        {signal.one_liner || "Generating analysis…"}
      </p>

      {/* Source link */}
      {signal.source_reference && signal.source_reference.startsWith("http") && (
        <a
          href={signal.source_reference}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors mt-auto"
        >
          <ExternalLink size={11} />
          View BSE / SEBI filing
        </a>
      )}
    </div>
  );
}
