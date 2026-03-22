"use client";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Zap, TrendingUp, Clock } from "lucide-react";
import type { Signal } from "@/lib/api";

function WinRateBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-slate-500">N/A</span>;
  const color = value >= 65 ? "#10b981" : value >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: `${color}20`, color }}
      title="Historical win rate at 15 days"
    >
      <TrendingUp size={10} />
      {value.toFixed(1)}%
    </span>
  );
}

function ConfluenceBadge({ score }: { score: number }) {
  if (score === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: "#8b5cf620", color: "#8b5cf6" }}
      title={`Confluence score: ${score}/3 — co-occurrence with corporate events`}
    >
      <Zap size={10} />
      {score}/3
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SignalCard({ signal }: { signal: Signal }) {
  const direction = signal.one_liner?.toLowerCase().includes("bear") ? "bearish" : "bullish";

  return (
    <Link href={`/stock/${signal.symbol}?signal=${signal.id}`}>
      <div
        className="card-hover rounded-xl p-5 border cursor-pointer h-full flex flex-col"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-100">{signal.symbol}</span>
              {signal.low_confidence && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded text-amber-400 border border-amber-400/30"
                  title="Low confidence — fewer than 5 historical samples"
                >
                  Low Conf
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
              <Clock size={10} />
              {timeAgo(signal.created_at)}
            </div>
          </div>

          {/* Direction arrow */}
          <div
            className="flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-lg"
            style={
              direction === "bullish"
                ? { background: "#10b98120", color: "#10b981" }
                : { background: "#ef444420", color: "#ef4444" }
            }
          >
            {direction === "bullish" ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {direction}
          </div>
        </div>

        {/* Pattern name */}
        {signal.signal_type === "pattern" && (
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
            {signal.signal_type}
          </p>
        )}

        {/* One-liner */}
        <p className="text-sm text-slate-300 leading-relaxed mb-4 flex-1">
          {signal.one_liner || "Analysis generating…"}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-auto">
          <WinRateBadge value={signal.win_rate_15d} />
          {signal.high_confluence && <ConfluenceBadge score={signal.confluence_score} />}
          {signal.signal_rank !== null && (
            <span className="text-xs text-slate-500 ml-auto">
              Rank {signal.signal_rank.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
