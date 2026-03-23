import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Deep space dark palette
        background: "hsl(222, 47%, 4%)",
        surface: "hsl(222, 40%, 7%)",
        "surface-2": "hsl(222, 35%, 10%)",
        "surface-3": "hsl(222, 30%, 14%)",
        border: "hsl(222, 25%, 18%)",
        "border-subtle": "hsl(222, 25%, 13%)",
        // Text
        foreground: "hsl(210, 20%, 95%)",
        muted: "hsl(215, 15%, 55%)",
        "muted-2": "hsl(215, 10%, 40%)",
        // Brand accent
        accent: "hsl(217, 91%, 60%)",
        "accent-dim": "hsl(217, 91%, 60%, 0.15)",
        "accent-hover": "hsl(217, 91%, 68%)",
        // Signal colors
        bullish: "hsl(158, 64%, 52%)",
        "bullish-dim": "hsl(158, 64%, 52%, 0.15)",
        bearish: "hsl(0, 84%, 60%)",
        "bearish-dim": "hsl(0, 84%, 60%, 0.15)",
        // Amber for warnings / stale data
        amber: "hsl(38, 92%, 58%)",
        "amber-dim": "hsl(38, 92%, 58%, 0.15)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(59, 130, 246, 0.15)",
        "glow-bullish": "0 0 20px rgba(52, 211, 153, 0.15)",
        "glow-bearish": "0 0 20px rgba(239, 68, 68, 0.15)",
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
        glass: "inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      keyframes: {
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 6px rgba(59,130,246,0.4)" },
          "50%": { boxShadow: "0 0 16px rgba(59,130,246,0.8)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.35s ease-out",
        "slide-in-up": "slide-in-up 0.3s ease-out",
        shimmer: "shimmer 1.8s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.4s ease-out",
        blink: "blink 1s step-end infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "mesh-dark":
          "radial-gradient(at 40% 20%, hsl(217,91%,12%) 0, transparent 50%), radial-gradient(at 80% 0%, hsl(158,64%,8%) 0, transparent 30%), radial-gradient(at 0% 50%, hsl(222,47%,6%) 0, transparent 50%)",
      },
    },
  },
  plugins: [],
};

export default config;
