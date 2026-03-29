"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";

interface AnalysisData {
  directional_bias: string;
  confidence_score: number;
  retail_sentiment: string;
  institutional_sentiment: string;
  rationale: string;
  invalidation_point: string;
}

interface AiAnalysisProps {
  ticker: string;
}

export default function AiAnalysis({ ticker }: AiAnalysisProps) {
  const { data, isLoading, isError } = useQuery<AnalysisData, Error>({
    queryKey: ["ai-analysis", ticker],
    queryFn: async () => {
      const response = await fetch(`http://localhost:8000/api/v1/analysis/${ticker}`);
      if (!response.ok) {
        throw new Error("Failed to fetch analysis data");
      }
      return response.json();
    },
    // Cache the response to limit repeated LLM API calls
    staleTime: 1000 * 60 * 5, 
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full animate-pulse flex flex-col gap-6 min-h-[340px]">
        {/* Skeleton Header */}
        <div className="flex justify-between items-center mb-2">
          <div className="h-6 w-48 bg-gray-800 rounded"></div>
          <div className="h-8 w-32 bg-gray-800 rounded-full"></div>
        </div>
        {/* Skeleton Rationale */}
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-800 rounded"></div>
          <div className="h-4 w-11/12 bg-gray-800 rounded"></div>
          <div className="h-4 w-full bg-gray-800 rounded"></div>
        </div>
        {/* Skeleton Sentiment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="h-20 w-full bg-gray-800/80 rounded"></div>
          <div className="h-20 w-full bg-gray-800/80 rounded"></div>
        </div>
        {/* Skeleton Risk Box */}
        <div className="h-16 w-full bg-red-950/20 border border-red-950/50 rounded mt-2"></div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col items-center justify-center text-gray-500 min-h-[100px]">
        <svg className="w-8 h-8 mb-2 opacity-50 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm font-medium">AI Analysis currently unavailable</p>
      </div>
    );
  }

  // Determine badge styling based on directional bias
  const bias = data.directional_bias?.toUpperCase() || "NEUTRAL";
  let badgeClasses = "bg-gray-800 text-gray-300 border-gray-700";
  let dotColor = "bg-gray-400";
  
  if (bias.includes("BULL")) {
    badgeClasses = "bg-green-500/20 text-green-400 border border-green-500/30";
    dotColor = "bg-green-400";
  } else if (bias.includes("BEAR")) {
    badgeClasses = "bg-red-500/20 text-red-400 border border-red-500/30";
    dotColor = "bg-red-400";
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col gap-6 shadow-xl w-full">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI Strategy Engine
        </h2>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-sm pr-4 shadow-sm ${badgeClasses}`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${dotColor}`}></div>
          <span className="tracking-wide">{data.directional_bias}</span>
          <span className="opacity-40 ml-1">|</span>
          <span className="ml-1 font-semibold">{data.confidence_score}% Conf</span>
        </div>
      </div>

      {/* Rationale */}
      <div className="mt-1">
        <p className="text-gray-300 leading-relaxed text-base tracking-wide whitespace-pre-line">
          {data.rationale}
        </p>
      </div>

      {/* Sentiment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-4 transition duration-300 hover:bg-gray-800/60">
          <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Retail Sentiment</h3>
          <p className="text-sm text-gray-300 leading-snug">{data.retail_sentiment}</p>
        </div>
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-4 transition duration-300 hover:bg-gray-800/60">
          <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Institutional Sentiment</h3>
          <p className="text-sm text-gray-300 leading-snug">{data.institutional_sentiment}</p>
        </div>
      </div>

      {/* Risk Management / Invalidation Box */}
      <div className="bg-red-950/30 border border-red-900/60 rounded-lg p-4 flex flex-col gap-1.5 mt-2 shadow-inner">
        <h3 className="text-[11px] uppercase tracking-wider text-red-500/90 font-bold flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Risk Management / Invalidation
        </h3>
        <p className="text-sm text-red-200/90 leading-relaxed font-medium">
          {data.invalidation_point}
        </p>
      </div>
    </div>
  );
}
