"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrokerConnectSlide() {
  const queryClient = useQueryClient();

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/broker/connect", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Connection failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broker-status"] });
    },
  });

  const handleConnect = () => {
    connectMutation.mutate();
  };

  const status = connectMutation.isPending ? "connecting" : connectMutation.isSuccess ? "success" : connectMutation.isError ? "error" : "idle";

  return (
    <div className="flex flex-col h-full justify-center px-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-[320px] mx-auto mb-8 relative"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />

        {/* Integration Card */}
        <div className="relative bg-surface rounded-3xl p-6 border border-border shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border-subtle flex items-center justify-center shrink-0 overflow-hidden">
              <span className="text-xl font-bold italic pr-1">R</span>
            </div>

            <div className="flex-1 flex items-center justify-center px-2">
              <motion.div
                animate={status === "connecting" ? { x: [-10, 10, -10] } : {}}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-full h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent relative"
              >
                {status === "connecting" && (
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                )}
              </motion.div>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-[#002f6c] border border-border-subtle flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs uppercase text-center leading-tight tracking-tight">Angel<br/>One</span>
            </div>
          </div>

          <div className="text-center space-y-1 mb-6">
            <h3 className="text-base font-bold text-foreground">Angel One</h3>
            <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Official Integration</p>
          </div>

          <button
            onClick={status === "idle" ? handleConnect : undefined}
            disabled={status !== "idle"}
            className={cn(
              "w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 flex justify-center items-center gap-2",
              status === "success"
                ? "bg-bullish/10 text-bullish border border-bullish/20"
                : "bg-foreground text-background hover:bg-foreground/90"
            )}
          >
            {status === "idle" && "Connect via SmartAPI"}
            {status === "connecting" && (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-background/20 border-t-background animate-spin" />
                Connecting...
              </>
            )}
            {status === "success" && (
              <>
                <CheckCircle2 className="w-5 h-5" /> Connected Successfully
              </>
            )}
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <h2 className="text-2xl font-black text-foreground tracking-tight mb-3">
          Execute directly.
        </h2>
        <p className="text-sm text-muted leading-relaxed font-medium mb-6">
          Link your broker to place trades directly from radar signals in just one tap.
        </p>

        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted">
          <ShieldCheck className="w-4 h-4 text-accent" />
          Bank-grade 256-bit encryption
        </div>
      </motion.div>
    </div>
  );
}
