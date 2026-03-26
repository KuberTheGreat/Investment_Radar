// ─── Typed API client for InvestorRadar ──────────────────────────────────────
import { logger } from "./utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Signal {
  id: string;
  symbol: string;
  signal_type: "pattern" | "opportunity";
  pattern_id: string | null;
  win_rate_5d: number | null;
  win_rate_15d: number | null;
  confluence_score: number;
  high_confluence: boolean;
  signal_rank: number | null;
  one_liner: string | null;
  paragraph_explanation: string | null;
  low_confidence: boolean;
  is_active: boolean;
  created_at: string;
  source_reference: string | null;
}

export interface SignalDetail extends Signal {
  pattern?: {
    pattern_name: string;
    signal_direction: "bullish" | "bearish";
    timeframe: string;
    detected_at: string;
  };
  events?: CorporateEvent[];
}

export interface CorporateEvent {
  id: string;
  symbol?: string;
  event_type: string;
  event_date: string;
  party_name: string;
  quantity?: number;
  price_per_share?: number | null;
  total_value_cr: number | null;
  source_reference: string | null;
  is_anomaly: boolean;
}

export interface OHLCCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PatternMarker {
  id: string;
  symbol: string;
  pattern_name: string;
  signal_direction: "bullish" | "bearish";
  timeframe: string;
  detected_at: string;
}

export interface SignalsResponse {
  data: Signal[];
  skip: number;
  limit: number;
  total: number;
}

export interface PipelineHealth {
  status: string;
  last_refresh_at: string | null;
  active_signal_count: number;
  data_stale: boolean;
  version: string;
}

export interface SignalFilters {
  skip?: number;
  limit?: number;
  symbol?: string;
  signal_type?: string;
  direction?: string;
  min_win_rate?: number;
  min_confluence?: number;
  high_confluence_only?: boolean;
  archived?: boolean;
  deduplicate_symbol?: boolean;
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  options: RequestInit = {}
): Promise<T> {
  let urlString = `${API_BASE}${path}`;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) searchParams.set(k, String(v));
    });
    const qs = searchParams.toString();
    if (qs) {
      urlString += `?${qs}`;
    }
  }

  logger.info("api", `Fetching ${urlString}`, options.method || 'GET');

  const res = await fetch(urlString, {
    ...options,
    headers: { Accept: "application/json", ...options.headers },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    logger.error(
      "api",
      `Request failed [${res.status}] for ${path}:`,
      errorText
    );
    throw new Error(`API error ${res.status}: ${errorText}`);
  }

  return res.json();
}

// ─── API functions ────────────────────────────────────────────────────────────

export const fetchSignals = (filters?: SignalFilters) =>
  apiFetch<SignalsResponse>(
    "/signals",
    filters as Record<string, string | number | boolean | undefined>
  );

export const fetchSignalDetail = (id: string) =>
  apiFetch<SignalDetail>(`/signals/${id}`);

export const triggerOnDemandAnalysis = (symbol: string) =>
  apiFetch<{ status: string; message: string }>(`/stock/${symbol}/analyze`, undefined, {
    method: "POST",
  });

export const fetchOHLCV = (
  symbol: string,
  timeframe = "15m",
  from?: string,
  to?: string
) => apiFetch<OHLCCandle[]>(`/stock/${symbol}`, { timeframe, from, to });

export const fetchPatterns = (symbol: string, from?: string, to?: string) =>
  apiFetch<PatternMarker[]>(`/stock/${symbol}/patterns`, { from, to });

export const fetchEvents = (symbol: string) =>
  apiFetch<CorporateEvent[]>(`/stock/${symbol}/events`);

export const searchStock = (query: string) =>
  apiFetch<{ symbol: string; name: string }>(`/search`, { q: query });

export interface SearchSuggestion {
  symbol: string;
  name: string;
  exchange?: string;
}

export const fetchSearchSuggestions = (query: string) =>
  apiFetch<SearchSuggestion[]>(`/search/suggestions`, { q: query });

export const fetchPipelineHealth = () =>
  apiFetch<PipelineHealth>("/health/pipeline");

// ─── SSE connection factory ───────────────────────────────────────────────────

export interface SSEOptions {
  onMessage: (data: string) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
}

/**
 * Opens an EventSource connection to an SSE endpoint.
 * Returns a cleanup function to close the connection.
 */
export function createSSEConnection(path: string, options: SSEOptions): () => void {
  const url = `${API_BASE}${path}`;
  logger.info("SSE", `Connecting to ${url}`);

  const source = new EventSource(url);

  source.onopen = () => {
    logger.info("SSE", `Connected to ${path}`);
    options.onOpen?.();
  };

  source.onmessage = (event) => {
    logger.info("SSE", `Message from ${path}:`, event.data);
    options.onMessage(event.data);
  };

  source.onerror = (err) => {
    logger.error("SSE", `Error on ${path}:`, err);
    options.onError?.(err);
  };

  return () => {
    logger.info("SSE", `Closing connection to ${path}`);
    source.close();
  };
}
