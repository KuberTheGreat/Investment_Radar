"use client";
import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { SignalFilters } from "@/lib/api";
import { cn } from "@/components/ui/cn";

interface FilterBarProps {
  filters: SignalFilters;
  onChange: (filters: SignalFilters) => void;
}

const SIGNAL_TYPES = [
  { value: "", label: "All Types" },
  { value: "pattern", label: "Pattern" },
  { value: "opportunity", label: "Opportunity" },
];

const DIRECTIONS = [
  { value: "", label: "All Directions" },
  { value: "bullish", label: "Bullish" },
  { value: "bearish", label: "Bearish" },
];

const CONFLUENCE_OPTIONS = [
  { value: "", label: "Any Confluence" },
  { value: "1", label: "1+ (Low)" },
  { value: "2", label: "2+ (Medium)" },
  { value: "3", label: "3 (High)" },
];

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [symbolInput, setSymbolInput] = useState(filters.symbol ?? "");

  const hasActiveFilters =
    !!filters.signal_type ||
    !!filters.direction ||
    filters.min_confluence != null ||
    !!filters.symbol;

  const clearAll = () => {
    setSymbolInput("");
    onChange({ limit: filters.limit, skip: 0 });
  };

  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange({ ...filters, symbol: symbolInput.trim().toUpperCase() || undefined, skip: 0 });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 glass-card mb-6">
      <SlidersHorizontal className="w-4 h-4 text-muted flex-shrink-0" />

      {/* Symbol search */}
      <form onSubmit={handleSymbolSubmit} className="flex items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-2" />
          <input
            type="text"
            placeholder="Symbol (e.g. RELIANCE)"
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
            className="input-base pl-8 w-44 text-xs"
          />
        </div>
      </form>

      {/* Signal type */}
      <select
        value={filters.signal_type ?? ""}
        onChange={(e) =>
          onChange({ ...filters, signal_type: e.target.value || undefined, skip: 0 })
        }
        className="input-base text-xs"
      >
        {SIGNAL_TYPES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Direction */}
      <select
        value={filters.direction ?? ""}
        onChange={(e) =>
          onChange({ ...filters, direction: e.target.value || undefined, skip: 0 })
        }
        className="input-base text-xs"
      >
        {DIRECTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Confluence */}
      <select
        value={filters.min_confluence?.toString() ?? ""}
        onChange={(e) =>
          onChange({
            ...filters,
            min_confluence: e.target.value ? Number(e.target.value) : undefined,
            skip: 0,
          })
        }
        className="input-base text-xs"
      >
        {CONFLUENCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* High confluence only toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div
          onClick={() =>
            onChange({
              ...filters,
              high_confluence_only: !filters.high_confluence_only,
              skip: 0,
            })
          }
          className={cn(
            "w-9 h-5 rounded-full relative transition-colors",
            filters.high_confluence_only ? "bg-accent" : "bg-surface-3 border border-border"
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
              filters.high_confluence_only ? "left-[18px]" : "left-0.5"
            )}
          />
        </div>
        <span className="text-xs text-muted">High only</span>
      </label>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-xs text-muted hover:text-bearish transition-colors ml-auto"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
