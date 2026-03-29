"use client";

import { useQuery } from "@tanstack/react-query";
import { radarApi } from "@/lib/api";

/**
 * Hook to retrieve live price over polling REST API.
 * This inherently batches requests for ALL symbols on the screen into a single 
 * high-performance polling interval without touching browser connection limits.
 */
export function useLivePrice(symbol: string, initialPrice: number) {
  const { data: allPrices } = useQuery({
    queryKey: ["live-prices"],
    queryFn: () => radarApi.getLivePrices(),
    refetchInterval: 1500, // Sync prices every 1.5 seconds smoothly and efficiently
    staleTime: 1000,
    gcTime: 10000,
  });

  if (!allPrices) return initialPrice;
  
  // Normalize symbol lookup
  const sym = symbol.replace(".NS", "").replace(".BO", "");
  return allPrices[sym] ?? initialPrice;
}
