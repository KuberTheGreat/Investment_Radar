"use client";

import { useEffect, useState } from "react";
import Head from "next/head";

export default function Home() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch signals from API
    fetch("/api/signals")
      .then((res) => res.json())
      .then((data) => {
        setSignals(data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch signals", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-6">
      <Head>
        <title>InvestorRadar</title>
      </Head>

      <header className="flex justify-between items-center mb-8 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
            InvestorRadar
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Institutional-grade insights. Plain English.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs bg-amber-900/40 text-amber-500 px-3 py-1.5 rounded-full border border-amber-800/50">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Data delayed ~15 min
          </span>
          <span className="flex items-center gap-2 text-xs bg-green-900/40 text-green-400 px-3 py-1.5 rounded-full border border-green-800/50">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Market Open
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-neutral-200">Active Signals Feed</h2>
          
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-sm font-medium rounded border border-neutral-800 transition-colors">
              Patterns
            </button>
            <button className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-sm font-medium rounded border border-amber-800/50 transition-colors text-amber-500">
              Opportunity Radar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse bg-neutral-900/50 rounded-xl p-6 h-48 border border-neutral-800"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {signals.map((sig: any, index: number) => (
              <div key={index} className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 hover:border-green-500/30 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{sig.symbol}</h3>
                    <span className="text-xs text-neutral-400">{sig.pattern}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded font-medium ${sig.direction === 'bullish' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                    {sig.direction.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-sm text-neutral-300 mb-4 line-clamp-2">
                  Generated one-liner explanation from Groq models will appear here referencing the TA pattern and confluence.
                </p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-neutral-800/50">
                  <span className="text-xs text-neutral-500">14 mins ago</span>
                  <a href={`/stock/${sig.symbol}`} className="text-sm text-green-400 group-hover:text-green-300 font-medium">
                    View Detail →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
