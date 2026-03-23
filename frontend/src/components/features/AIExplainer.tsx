"use client";
import { useState } from "react";
import { Sparkles, RotateCcw, StopCircle } from "lucide-react";
import { useExplainer } from "@/lib/hooks";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/components/ui/cn";

interface AIExplainerProps {
  signalId: string;
}

export function AIExplainer({ signalId }: AIExplainerProps) {
  const { text, streaming, done, error, start, reset } = useExplainer(signalId);
  const [started, setStarted] = useState(false);

  const handleStart = () => {
    setStarted(true);
    start();
  };

  const handleReset = () => {
    setStarted(false);
    reset();
  };

  return (
    <div className="glass-card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent to-bullish/70 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">AI Explainer</span>
        </div>
        {started && (
          <button
            onClick={handleReset}
            className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {!started ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-bullish/10 border border-accent/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                Deep Dive Analysis
              </p>
              <p className="text-xs text-muted max-w-[200px]">
                Get an AI-generated, in-depth explanation of why this signal was triggered.
              </p>
            </div>
            <button
              onClick={handleStart}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium",
                "bg-gradient-to-r from-accent to-accent/80 text-white",
                "hover:from-accent-hover hover:to-accent transition-all duration-200",
                "shadow-glow"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Generate Explanation
            </button>
          </div>
        ) : (
          <div className="h-full">
            {/* Streaming indicator */}
            {streaming && (
              <div className="flex items-center gap-2 mb-3 text-xs text-accent">
                <Spinner size="sm" />
                <span>Generating analysis...</span>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-bearish/10 border border-bearish/20 text-xs text-bearish">
                {error}
              </div>
            )}

            {/* Streamed text */}
            <div
              className={cn(
                "font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words",
                "bg-surface-2 rounded-lg p-4 border border-border-subtle min-h-[120px]"
              )}
            >
              {text || (
                <span className="text-muted-2 italic">
                  Waiting for response...
                </span>
              )}
              {streaming && (
                <span className="inline-block w-1.5 h-3.5 bg-accent ml-0.5 animate-pulse align-middle" />
              )}
            </div>

            {done && (
              <div className="mt-3 flex justify-center">
                <span className="text-[10px] text-muted flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Analysis complete
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
