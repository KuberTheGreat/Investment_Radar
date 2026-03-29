"use client";
import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logger } from "@/lib/utils";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  context?: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error(
      `ErrorBoundary[${this.props.context ?? "unknown"}]`,
      error.message,
      info.componentStack
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="glass-card p-6 flex flex-col items-center gap-4 text-center my-4">
          <div className="w-12 h-12 rounded-full bg-bearish/10 border border-bearish/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-bearish" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Something went wrong
            </p>
            <p className="text-xs text-muted max-w-xs">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-2 border border-border hover:border-accent/40 text-sm text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Functional error display (for query errors, not crash boundaries) ────────

interface ErrorDisplayProps {
  error: Error | null;
  onRetry?: () => void;
  message?: string;
}

export function ErrorDisplay({
  error,
  onRetry,
  message,
}: ErrorDisplayProps) {
  if (!error) return null;
  return (
    <div className="glass-card p-5 flex flex-col items-center gap-3 text-center animate-fade-in">
      <AlertTriangle className="w-8 h-8 text-bearish" />
      <div>
        <p className="text-sm font-semibold text-foreground mb-1">
          {message ?? "Failed to load data"}
        </p>
        <p className="text-xs text-muted">{error.message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border hover:border-accent/40 text-xs text-foreground transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  );
}
