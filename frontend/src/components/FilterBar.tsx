"use client";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { SignalFilters } from "@/lib/api";

interface FilterBarProps {
  filters: SignalFilters;
  onChange: (f: SignalFilters) => void;
}

const BTN = "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors";
const ACTIVE = "text-slate-900 bg-emerald-400";
const INACTIVE = "text-slate-400 hover:text-slate-200 border border-slate-700";

function Toggle({
  value,
  options,
  onChange,
}: {
  value: string | undefined;
  options: { label: string; val: string | undefined }[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.label}
          className={`${BTN} ${value === o.val ? ACTIVE : INACTIVE}`}
          onClick={() => onChange(o.val)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6">
      {/* Top row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Signal type */}
        <Toggle
          value={filters.signal_type}
          options={[
            { label: "All", val: undefined },
            { label: "Pattern", val: "pattern" },
            { label: "Opportunity", val: "opportunity" },
          ]}
          onChange={(v) => onChange({ ...filters, signal_type: v })}
        />

        {/* Direction */}
        <Toggle
          value={filters.direction}
          options={[
            { label: "All", val: undefined },
            { label: "Bullish", val: "bullish" },
            { label: "Bearish", val: "bearish" },
          ]}
          onChange={(v) => onChange({ ...filters, direction: v })}
        />

        {/* Confluence */}
        <Toggle
          value={filters.min_confluence !== undefined ? String(filters.min_confluence) : undefined}
          options={[
            { label: "Any", val: undefined },
            { label: "≥1", val: "1" },
            { label: "≥2", val: "2" },
            { label: "High", val: "3" },
          ]}
          onChange={(v) => onChange({ ...filters, min_confluence: v !== undefined ? Number(v) : undefined })}
        />

        {/* Advanced toggle */}
        <button
          className={`${BTN} ${INACTIVE} flex items-center gap-1`}
          onClick={() => setOpen((o) => !o)}
          title="Advanced filters"
        >
          <SlidersHorizontal size={12} />
          Advanced
        </button>
      </div>

      {/* Advanced row */}
      {open && (
        <div className="mt-3 flex flex-wrap gap-4 items-center p-3 rounded-xl border"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          {/* Min win rate */}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Min win rate (%)</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.min_win_rate ?? 0}
              onChange={(e) => onChange({ ...filters, min_win_rate: Number(e.target.value) || undefined })}
              className="w-32 accent-emerald-400"
            />
            <span className="text-xs text-emerald-400 font-medium">{filters.min_win_rate ?? 0}%+</span>
          </label>

          {/* Show low confidence */}
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-emerald-400"
              checked={filters.archived ?? false}
              onChange={(e) => onChange({ ...filters, archived: e.target.checked })}
            />
            Include archived signals
          </label>

          {/* Reset */}
          <button
            className="text-xs text-slate-500 hover:text-slate-200 transition-colors ml-auto"
            onClick={() => onChange({})}
          >
            Reset all
          </button>
        </div>
      )}
    </div>
  );
}
