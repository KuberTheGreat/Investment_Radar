"use client";

import { motion } from "framer-motion";
import { Radar, Sparkles } from "lucide-react";

export function WelcomeSlide() {
  return (
    <div className="flex flex-col h-full justify-center px-6">
      {/* Animated Hero Graphic */}
      <div className="relative w-full aspect-square max-w-[280px] mx-auto mb-10 flex items-center justify-center">
        {/* Radar concentric rings */}
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: [0.1, 0.3, 0.1] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: ring * 0.4,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-full border border-accent/40 bg-accent/5"
            style={{ margin: `${ring * 12}%` }}
          />
        ))}

        {/* Center Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="relative z-10 w-20 h-20 rounded-3xl bg-surface border border-border-subtle shadow-2xl flex items-center justify-center bg-gradient-to-br from-surface to-surface-2"
        >
          <Radar className="w-10 h-10 text-accent animate-pulse" />
        </motion.div>

        {/* Floating Sparkles */}
        <motion.div
          animate={{ y: [-10, 10, -10], rotate: [0, 15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 right-10 z-20"
        >
          <Sparkles className="w-6 h-6 text-warning" />
        </motion.div>
      </div>

      {/* Typography */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <span className="inline-block px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-accent text-[10px] font-bold uppercase tracking-widest mb-4">
          Investment Radar 2.0
        </span>
        <h1 className="text-3xl font-black text-foreground tracking-tight mb-4 leading-tight">
          Your AI Trading <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-500">
            Co-pilot
          </span>
        </h1>
        <p className="text-sm text-muted leading-relaxed max-w-[280px] mx-auto font-medium">
          Get real-time pattern detection, institutional flow tracking, and personalized AI signals.
        </p>
      </motion.div>
    </div>
  );
}
