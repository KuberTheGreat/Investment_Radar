"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bot, ArrowRight } from "lucide-react";

interface AskAIButtonProps {
  symbol: string;
}

export function AskAIButton({ symbol }: AskAIButtonProps) {
  const router = useRouter();

  return (
    <>
      {/* Space for sticky bar */}
      <div className="h-20" />

      <div className="fixed bottom-20 md:bottom-6 left-0 right-0 px-4 z-40 max-w-lg mx-auto">
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push(`/advisor?symbol=${symbol}`)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl
                     bg-surface/90 backdrop-blur-xl border border-accent/25
                     hover:border-accent/50 hover:bg-surface-2 transition-all duration-200
                     shadow-lg shadow-black/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-accent" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-foreground">Ask AI anything</p>
              <p className="text-[10px] text-muted">about {symbol}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-accent">
            <span className="text-xs font-semibold">Ask</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </motion.button>
      </div>
    </>
  );
}
