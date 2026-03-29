import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  userName?: string;
  notificationCount?: number;
  className?: string;
}

export function TopBar({ userName = "Vedant", notificationCount = 3, className }: TopBarProps) {
  return (
    <header className={cn("flex items-center justify-between px-4 py-4 w-full", className)}>
      <div className="flex flex-col">
        <span className="text-xs text-muted font-medium uppercase tracking-wider">Welcome back</span>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Good morning, {userName} <span className="inline-block origin-bottom-right hover:animate-pulse-slow">👋</span>
        </h1>
      </div>
      
      <button className="relative p-2 rounded-full bg-surface-2 hover:bg-surface-3 transition-colors border border-border-subtle group">
        <Bell className="w-5 h-5 text-muted group-hover:text-foreground transition-colors" />
        {notificationCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-bearish ring-2 ring-surface-2" />
        )}
      </button>
    </header>
  );
}
