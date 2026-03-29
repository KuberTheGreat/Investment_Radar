"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";

interface AiAnalysisProps {
  ticker: string;
}

interface SignalAnalysisOutput {
  directional_bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence_score: number;
  retail_sentiment: string;
  institutional_sentiment: string;
  rationale: string;
  invalidation_point: string;
}

export default function AiAnalysis({ ticker }: AiAnalysisProps) {
  const { data, isLoading, isError, error } = useQuery<SignalAnalysisOutput>({
    queryKey: ["aiAnalysis", ticker],
    queryFn: async () => {
      const res = await fetch(`http://localhost:8000/api/v1/analysis/${ticker}`);
      if (!res.ok) {
        throw new Error("Failed to fetch analysis");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 rounded-xl bg-slate-900 border border-slate-800 animate-pulse">
        <div className="h-6 w-32 bg-slate-700 rounded mb-4"></div>
        <div className="h-4 w-full bg-slate-700 rounded mb-2"></div>
        <div className="h-4 w-5/6 bg-slate-700 rounded mb-6"></div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="h-20 bg-slate-800 rounded"></div>
          <div className="h-20 bg-slate-800 rounded"></div>
        </div>
        
        <div className="h-16 bg-slate-800 rounded-lg"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 rounded-xl bg-slate-900 border border-red-900/50 text-red-400">
        <p>Error loading AI Analysis: {error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    );
  }

  if (!data) return null;

  const biasColors = {
    BULLISH: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    BEARISH: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    NEUTRAL: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden relative">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Quant AI Analysis</h2>
          <p className="text-slate-400 text-sm">Real-time synthesis for {ticker}</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              biasColors[data.directional_bias]
            }`}
          >
            {data.directional_bias} BIAS
          </span>
          <span className="text-xs text-slate-400 font-medium">
            Confidence: <span className="text-white">{data.confidence_score}%</span>
          </span>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Rationale</h3>
        <p className="text-slate-300 text-sm leading-relaxed">{data.rationale}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
          <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Retail Sentiment</h4>
          <p className="text-slate-200 text-sm">{data.retail_sentiment}</p>
        </div>
        
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
          <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Institutional Sentiment</h4>
          <p className="text-slate-200 text-sm">{data.institutional_sentiment}</p>
        </div>
      </div>

      <div className="mt-4 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 flex gap-3 items-start">
        <div className="mt-0.5 text-orange-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <div>
          <h4 className="text-xs font-bold text-orange-400 uppercase mb-1">Invalidation Point</h4>
          <p className="text-orange-200/80 text-sm">{data.invalidation_point}</p>
        </div>
      </div>
    </div>
  );
}
