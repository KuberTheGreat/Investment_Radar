"use client";

import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { createChart } from "lightweight-charts";

export default function StockDetail({ params }: { params: { symbol: string } }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [explanation, setExplanation] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize lightweight-charts
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0a0a0a' },
        textColor: '#d4d4d4',
      },
      grid: {
        vertLines: { color: '#262626' },
        horzLines: { color: '#262626' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 450,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#4ade80',
      downColor: '#f87171',
      borderVisible: false,
      wickUpColor: '#4ade80',
      wickDownColor: '#f87171',
    });

    // Mock data for display
    const data = [
      { time: '2026-03-10', open: 1500, high: 1520, low: 1490, close: 1510 },
      { time: '2026-03-11', open: 1515, high: 1540, low: 1510, close: 1530 },
      { time: '2026-03-12', open: 1525, high: 1535, low: 1480, close: 1490 },
      { time: '2026-03-13', open: 1485, high: 1500, low: 1450, close: 1460 },
      { time: '2026-03-16', open: 1470, high: 1495, low: 1460, close: 1490 }, // Pattern trigger
      { time: '2026-03-17', open: 1500, high: 1550, low: 1490, close: 1545 },
    ];
    candleSeries.setData(data);

    // Mock pattern marker
    candleSeries.setMarkers([
      {
        time: '2026-03-16',
        position: 'belowBar',
        color: '#4ade80',
        shape: 'arrowUp',
        text: 'Morning Star',
      },
    ]);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  const streamExplanation = () => {
    setIsGenerating(true);
    setExplanation("");
    
    // Connect to SSE Endpoint
    const eventSource = new EventSource(`/api/explain/${params.symbol}`);
    
    eventSource.onmessage = (event) => {
      setExplanation((prev) => prev + event.data);
    };

    eventSource.onerror = (error) => {
      console.error("SSE streaming error", error);
      eventSource.close();
      setIsGenerating(false);
    };

    eventSource.addEventListener("end", () => {
      eventSource.close();
      setIsGenerating(false);
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-6">
      <Head>
        <title>{params.symbol} | InvestorRadar</title>
      </Head>

      <div className="max-w-7xl mx-auto">
        <a href="/" className="text-sm font-medium text-neutral-400 hover:text-white mb-6 inline-block">
          ← Back to Feed
        </a>

        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">{params.symbol}</h1>
            <div className="flex gap-3 text-sm">
              <span className="bg-neutral-900 border border-neutral-800 px-3 py-1 rounded">Financial Services</span>
              <span className="bg-neutral-900 border border-neutral-800 text-neutral-400 px-3 py-1 rounded">NSE</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold mb-1">₹ 1,545.00</div>
            <div className="text-green-400 text-sm font-medium">+55.00 (3.69%)</div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-neutral-900 p-1 rounded-xl border border-neutral-800 shadow-2xl">
              {/* Chart Container */}
              <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden" />
            </div>

            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[100px] rounded-full pointer-events-none"></div>
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-2 h-6 bg-green-500 rounded-sm inline-block"></span>
                  AI Analysis (Deep Dive)
                </h3>
                <button 
                  onClick={streamExplanation}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded shadow-lg shadow-green-500/20 hover:shadow-green-500/40 disabled:opacity-50 transition-all"
                >
                  {isGenerating ? "Generating..." : "Generate Analysis"}
                </button>
              </div>
              
              <div className="min-h-[150px] text-neutral-300 leading-relaxed font-normal text-[15px]">
                {explanation ? (
                  <p>{explanation}</p>
                ) : (
                  <p className="text-neutral-500 italic">Click Generate Analysis to stream the AI breakdown.</p>
                )}
                {isGenerating && <span className="inline-block w-2 h-4 ml-1 bg-green-400 animate-pulse"></span>}
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-800/50">
                <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
                  Disclaimer: This is not financial advice. Past patterns do not guarantee future results. Please consult a registered financial advisor before making investment decisions.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 p-6 rounded-xl border border-neutral-800">
              <h3 className="text-lg font-bold mb-4 text-neutral-200">Backtest Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
                  <span className="text-neutral-400 text-sm">Win Rate (15d)</span>
                  <span className="text-green-400 font-bold text-lg">73.2%</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
                  <span className="text-neutral-400 text-sm">Avg Gain (15d)</span>
                  <span className="text-white font-medium">4.8%</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
                  <span className="text-neutral-400 text-sm">Historical Samples</span>
                  <span className="text-white font-medium">41</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none"></div>
              <h3 className="text-lg font-bold mb-4 text-neutral-200 flex items-center justify-between">
                Confluence Events
                <span className="bg-amber-500/20 text-amber-500 text-xs px-2 py-1 rounded font-bold border border-amber-500/30">
                  Score: 3
                </span>
              </h3>
              
              <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800/50 mb-3 hover:border-amber-500/30 transition-colors">
                <div className="flex justify-between text-xs text-neutral-400 mb-2">
                  <span>Mar 17, 2026</span>
                  <a href="#" className="underline hover:text-white">BSE Filing</a>
                </div>
                <div className="text-sm font-medium text-white mb-1">Promoter Buy</div>
                <div className="text-sm text-neutral-300">Net acquisition of ₹45.2 Cr during declining price action.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
