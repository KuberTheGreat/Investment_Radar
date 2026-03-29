"use client";

import { motion } from "framer-motion";

interface LiveCountProps {
  count: number;
}

export function LiveCount({ count }: LiveCountProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle bg-surface">
      <motion.span
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="w-2 h-2 rounded-full bg-accent inline-block"
      />
      <span className="text-xs font-medium text-muted">
        <motion.span
          key={count}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-bold text-foreground inline-block"
        >
          {count.toLocaleString()}
        </motion.span>
        {" "}signals · Live · Updates every 15 min
      </span>
    </div>
  );
}
