"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Radio, Star, Bot, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",           label: "Discover",  Icon: Home      },
  { href: "/radar",      label: "Radar",     Icon: Radio     },
  { href: "/watchlist",  label: "Watchlist", Icon: Star      },
  { href: "/advisor",    label: "AI Advisor",Icon: Bot       },
  { href: "/portfolio",  label: "Portfolio", Icon: Briefcase },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-64 bg-surface/50 border-r border-border-subtle backdrop-blur-xl hidden md:flex flex-col z-50">
      <div className="p-6 pb-2 shrink-0">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <Radio className="w-5 h-5 text-background" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-foreground">Inv Radar</h1>
            <p className="text-[10px] text-accent font-bold uppercase tracking-wider">AI Intelligence</p>
          </div>
        </Link>
      </div>

      <div className="flex-1 py-8 px-4 flex flex-col gap-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group overflow-hidden",
                isActive ? "bg-accent/10 text-accent font-bold" : "text-muted hover:bg-surface-2 hover:text-foreground font-semibold text-sm"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-accent" : "text-muted group-hover:text-foreground")} />
              <span className="relative z-10">{label}</span>
              
              {isActive && (
                <motion.div
                  layoutId="desktop-nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-6 shrink-0 text-xs font-semibold text-muted text-center">
        v2.0 · Live
      </div>
    </nav>
  );
}
