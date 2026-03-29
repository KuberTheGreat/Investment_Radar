import { cn } from "@/components/ui/cn";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <main
      className={cn(
        "min-h-screen pt-[var(--topbar-height)] pl-[var(--sidebar-width)]",
        "transition-[padding-left] duration-300"
      )}
    >
      <div className={cn("p-6 max-w-screen-2xl mx-auto", className)}>
        {children}
      </div>
    </main>
  );
}
