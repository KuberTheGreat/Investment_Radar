"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radio, Star, Bot, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/",           label: "Discover",  Icon: Home      },
  { href: "/radar",      label: "Radar",     Icon: Radio     },
  { href: "/watchlist",  label: "Watchlist", Icon: Star      },
  { href: "/advisor",    label: "AI",        Icon: Bot       },
  { href: "/portfolio",  label: "Portfolio", Icon: Briefcase },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Spacer so page content doesn't hide behind nav */}
      <div className="h-20 md:hidden" />

      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bottom-nav-safe
                      bg-surface/90 backdrop-blur-xl border-t border-border-subtle">
        <div className="flex items-stretch justify-around px-2 pt-2 pb-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 flex-1 py-1 group relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-accent" : "text-muted group-hover:text-foreground"
                )} />
                <span className={cn(
                  "text-[10px] font-semibold transition-colors",
                  isActive ? "text-accent" : "text-muted group-hover:text-foreground"
                )}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
