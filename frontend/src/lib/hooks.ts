"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  fetchSignals,
  fetchSignalDetail,
  fetchOHLCV,
  fetchPatterns,
  fetchEvents,
  fetchPipelineHealth,
  createSSEConnection,
  SignalFilters,
  triggerOnDemandAnalysis,
  fetchWatchlist,
} from "./api";
import { useAuth } from "./authContext";
import { logger } from "./utils";

// ─── Query key factory ────────────────────────────────────────────────────────

export const queryKeys = {
  signals: (filters?: SignalFilters) => ["signals", filters] as const,
  signalDetail: (id: string) => ["signal", id] as const,
  ohlcv: (symbol: string, timeframe: string) => ["ohlcv", symbol, timeframe] as const,
  patterns: (symbol: string) => ["patterns", symbol] as const,
  events: (symbol: string) => ["events", symbol] as const,
  pipelineHealth: () => ["pipelineHealth"] as const,
};

// ─── Data hooks ───────────────────────────────────────────────────────────────

export function usePipelineHealth() {
  return useQuery({
    queryKey: queryKeys.pipelineHealth(),
    queryFn: fetchPipelineHealth,
    refetchInterval: 30_000, // refresh every 30s
    staleTime: 20_000,
  });
}

export function useSignals(filters?: SignalFilters) {
  return useQuery({
    queryKey: queryKeys.signals(filters),
    queryFn: () => fetchSignals(filters),
    staleTime: 15_000,
  });
}

export function useSignalDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.signalDetail(id),
    queryFn: () => fetchSignalDetail(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useOHLCV(symbol: string, timeframe: string) {
  return useQuery({
    queryKey: queryKeys.ohlcv(symbol, timeframe),
    queryFn: () => fetchOHLCV(symbol, timeframe),
    enabled: !!symbol,
    staleTime: 60_000,
  });
}

export function usePatterns(symbol: string) {
  return useQuery({
    queryKey: queryKeys.patterns(symbol),
    queryFn: () => fetchPatterns(symbol),
    enabled: !!symbol,
    staleTime: 60_000,
  });
}

export function useEvents(symbol: string) {
  return useQuery({
    queryKey: queryKeys.events(symbol),
    queryFn: () => fetchEvents(symbol),
    enabled: !!symbol,
    staleTime: 60_000,
  });
}

export function useWatchlist() {
  const { token } = useAuth();
  return useQuery<string[]>({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
    enabled: !!token, // Only fetch if authenticated natively
    staleTime: 10_000,
  });
}

export function useOnDemandAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => triggerOnDemandAnalysis(symbol),
    onSuccess: (_, symbol) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ohlcv(symbol, "15m") });
      queryClient.invalidateQueries({ queryKey: queryKeys.ohlcv(symbol, "1d") });
      queryClient.invalidateQueries({ queryKey: queryKeys.patterns(symbol) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events(symbol) });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
    },
  });
}

// ─── Broker status hook ───────────────────────────────────────────────────────

export function useBrokerStatus() {
  return useQuery({
    queryKey: ["brokerStatus"],
    queryFn: async () => {
      const res = await fetch("/api/broker/status");
      if (!res.ok) return { is_authenticated: false };
      return res.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

// ─── Angel One Live Price SSE hook ────────────────────────────────────────────

export interface LiveTick {
  symbol: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change_pct: number;
  timestamp: string;
}

/**
 * Subscribes to the Angel One WebSocket live price stream for a symbol.
 * Opens an SSE connection to /api/broker/stream/{symbol} and returns
 * the latest tick. Falls back to null when feed is not active.
 *
 * @param symbol - NSE symbol (e.g. "RELIANCE", without .NS suffix)
 * @param enabled - set to false to skip subscription (e.g. when not authenticated)
 */
export function useLivePrice(symbol: string, enabled = true) {
  const [tick, setTick] = useState<LiveTick | null>(null);
  const [connected, setConnected] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !symbol) return;

    const sym = symbol.toUpperCase().replace(".NS", "");
    logger.info("useLivePrice", `Opening SSE stream for ${sym}`);

    // First subscribe the symbol to the Angel One feed
    fetch("/api/broker/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: [sym] }),
    }).catch((e) => logger.warn("useLivePrice", "Subscribe call failed:", e));

    // Then open SSE stream
    const es = new EventSource(`/api/broker/stream/${sym}`);

    es.onopen = () => {
      setConnected(true);
      logger.info("useLivePrice", `SSE connected for ${sym}`);
    };

    es.onmessage = (event) => {
      try {
        const data: LiveTick = JSON.parse(event.data);
        setTick(data);
      } catch (e) {
        logger.warn("useLivePrice", "Failed to parse tick:", e);
      }
    };

    es.onerror = () => {
      setConnected(false);
      logger.warn("useLivePrice", `SSE stream error for ${sym}`);
    };

    cleanupRef.current = () => {
      es.close();
      setConnected(false);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [symbol, enabled]);

  return { tick, connected };
}

// ─── Live Alerts SSE hook ─────────────────────────────────────────────────────

export interface AlertItem {
  id: string;
  symbol: string;
  signal_type: string;
  signal_rank: number;
  created_at: string;
}

export function useAlerts(maxItems = 20) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    logger.info("useAlerts", "Initializing SSE alerts connection");
    let errorTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = createSSEConnection("/alerts", {
      onOpen: () => {
        if (errorTimer) clearTimeout(errorTimer);
        setConnected(true);
        setError(null);
        logger.info("useAlerts", "SSE connected");
      },
      onMessage: (data) => {
        // Filter out heartbeat pings
        if (data.trim() === "" || data.includes("ping")) return;

        try {
          const alert: AlertItem = JSON.parse(data);
          logger.info("useAlerts", "New alert received:", alert);
          setAlerts((prev) => [alert, ...prev].slice(0, maxItems));
        } catch (e) {
          logger.warn("useAlerts", "Failed to parse alert message:", data, e);
        }
      },
      onError: () => {
        setConnected(false);
        // Delay showing error to avoid flicker on quick reconnects (StrictMode, etc.)
        errorTimer = setTimeout(() => {
          setError("Connection to live alerts lost. Retrying...");
        }, 3000);
        logger.warn("useAlerts", "SSE connection interrupted, browser will retry.");
      },
    });

    cleanupRef.current = cleanup;

    return () => {
      logger.info("useAlerts", "Cleaning up SSE connection");
      if (errorTimer) clearTimeout(errorTimer);
      cleanup();
    };
  }, [maxItems]);

  const clearAlerts = useCallback(() => setAlerts([]), []);

  return { alerts, connected, error, clearAlerts };
}

// ─── LLM Explainer SSE hook ───────────────────────────────────────────────────

export function useExplainer(signalId: string | null) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const start = useCallback(() => {
    if (!signalId) {
      logger.warn("useExplainer", "No signalId provided");
      return;
    }

    // Reset state
    setText("");
    setDone(false);
    setError(null);
    setStreaming(true);

    // Close any existing connection
    cleanupRef.current?.();

    logger.info("useExplainer", `Starting stream for signal ${signalId}`);

    // Track whether we've received [DONE] so we can ignore the
    // automatic onerror that fires when the server closes the SSE connection.
    let receivedDone = false;

    const cleanup = createSSEConnection(`/explain/${signalId}`, {
      onOpen: () => logger.info("useExplainer", "Stream opened"),
      onMessage: (data) => {
        // Safety: strip any accidental "data: " prefix (shouldn't happen
        // with EventSource but good defensive coding)
        const clean = data.startsWith("data: ") ? data.slice(6) : data;

        if (clean.trim() === "[DONE]") {
          receivedDone = true;
          setStreaming(false);
          setDone(true);
          cleanup();
          return;
        }

        // Only append non-empty chunks
        if (clean.trim()) {
          setText((prev) => (prev ? prev + "\n\n" + clean.trim() : clean.trim()));
        }
      },
      onError: (err) => {
        // When the server closes the SSE stream after [DONE], the browser
        // fires onerror. We ignore it if we already received the done signal.
        if (receivedDone) {
          logger.info("useExplainer", "SSE closed after [DONE] — expected, ignoring.");
          return;
        }
        logger.error("useExplainer", "Stream error:", err);
        setStreaming(false);
        setError("Failed to stream explanation. Please try again.");
      },
    });

    cleanupRef.current = cleanup;
  }, [signalId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const reset = useCallback(() => {
    cleanupRef.current?.();
    setText("");
    setStreaming(false);
    setDone(false);
    setError(null);
  }, []);

  return { text, streaming, done, error, start, reset };
}

// ─── Custom hook for paginated signals ───────────────────────────────────────

export function usePaginatedSignals(
  baseFilters: Omit<SignalFilters, "skip" | "limit">,
  pageSize = 20
) {
  const [page, setPage] = useState(0);

  const filters: SignalFilters = {
    ...baseFilters,
    skip: page * pageSize,
    limit: pageSize,
  };

  const query = useSignals(filters);

  const hasNextPage =
    query.data
      ? query.data.total > (page + 1) * pageSize
      : false;

  const hasPrevPage = page > 0;

  return {
    ...query,
    page,
    hasNextPage,
    hasPrevPage,
    nextPage: () => setPage((p) => p + 1),
    prevPage: () => setPage((p) => Math.max(0, p - 1)),
    resetPage: () => setPage(0),
  };
}
