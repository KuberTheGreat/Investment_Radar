import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, BellRing, Loader2, UserCircle, LogOut } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useAlerts } from "@/lib/hooks";
import { cn } from "@/components/ui/cn";
import { searchStock, fetchSearchSuggestions, SearchSuggestion } from "@/lib/api";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { alerts, connected } = useAlerts(5);
  const hasAlerts = alerts.length > 0;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { data: session } = useSession();
  
  const router = useRouter();

  // Handle typing with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetchSearchSuggestions(searchQuery.trim());
        setSuggestions(res || []);
        setShowSuggestions(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSuggestionClick = (symbol: string) => {
    const cleanSymbol = symbol.toUpperCase().replace(/\.(NS|BO)$/, "");
    router.push(`/stock/${cleanSymbol}`);
    setSearchQuery("");
    setShowSuggestions(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Direct submission uses the top suggestion if available
      if (suggestions.length > 0) {
        handleSuggestionClick(suggestions[0].symbol);
        return;
      }
      try {
        const res = await searchStock(searchQuery.trim());
        if (res && res.symbol) {
          const cleanSymbol = res.symbol.toUpperCase().replace(/\.(NS|BO)$/, "");
          router.push(`/stock/${cleanSymbol}`);
        } else {
          router.push(`/stock/${searchQuery.trim().toUpperCase()}`);
        }
      } catch (err) {
        router.push(`/stock/${searchQuery.trim().toUpperCase()}`);
      }
      setSearchQuery("");
      setShowSuggestions(false);
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-20 flex items-center justify-between",
        "px-6 h-[var(--topbar-height)] border-b border-border-subtle bg-background/80 backdrop-blur-md",
        "left-[var(--sidebar-width)] transition-[left] duration-300"
      )}
      style={{ left: "var(--sidebar-width)" }}
    >
      <div>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Search Bar with Autocomplete */}
        <div className="relative hidden md:block">
          <form onSubmit={handleSearch}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search stock (e.g., ZOMATO)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchQuery.trim()) setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="h-8 w-64 pl-8 pr-3 rounded bg-surface border border-border-subtle text-xs text-foreground placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && (
            <div className="absolute top-full left-0 mt-1 w-full max-h-72 overflow-y-auto bg-surface-2 border border-border-subtle rounded-md shadow-lg z-50 flex flex-col glass-card">
              {isSearching ? (
                <div className="py-4 text-xs text-muted flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  Searching...
                </div>
              ) : suggestions.length > 0 ? (
                <ul className="py-1">
                  {suggestions.map((s, i) => (
                    <li
                      key={`${s.symbol}-${i}`}
                      className="px-4 py-2 text-xs flex items-center justify-between hover:bg-surface cursor-pointer border-b border-border-subtle/50 last:border-0"
                      onMouseDown={(e) => {
                         // Prevent blur from hiding dropdown before click registers
                         e.preventDefault();
                         handleSuggestionClick(s.symbol);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{s.symbol.replace(/\.(NS|BO)$/, "")}</span>
                        <span className="text-muted truncate max-w-[140px]">{s.name}</span>
                      </div>
                      {s.exchange && s.exchange !== 'Custom' && (
                        <span className="text-[10px] font-medium bg-accent/10 text-accent px-1.5 py-0.5 rounded ml-2">
                          {s.exchange}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-4 text-xs text-muted text-center">No results found</div>
              )}
            </div>
          )}
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              connected ? "bg-bullish" : "bg-bearish"
            )}
          />
          <span className="hidden sm:block">
            {connected ? "Live" : "Disconnected"}
          </span>
        </div>

        {/* Alert bell */}
        <div className="relative">
          {hasAlerts ? (
            <BellRing
              className={cn(
                "w-5 h-5",
                hasAlerts ? "text-amber animate-pulse" : "text-muted"
              )}
            />
          ) : (
            <Bell className="w-5 h-5 text-muted" />
          )}
          {hasAlerts && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-bearish text-[10px] font-bold text-white">
              {alerts.length > 9 ? "9+" : alerts.length}
            </span>
          )}
        </div>
        
        {/* Auth User */}
        <div className="relative">
          {session ? (
            <button
              onClick={() => signOut()}
              className="flex items-center justify-center p-1.5 rounded bg-surface border border-border-subtle hover:bg-surface-2 transition-colors group"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-muted group-hover:text-bearish" />
            </button>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-accent text-white hover:bg-accent/90 transition-colors text-xs font-semibold"
            >
              <UserCircle className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
