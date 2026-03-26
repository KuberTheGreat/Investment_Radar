import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, BellRing, Loader2, UserCircle, LogOut } from "lucide-react";
import { useAlerts } from "@/lib/hooks";
import { useAuth } from "@/lib/authContext";
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const { token, login, logout } = useAuth();
  
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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL || "/api" + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Authentication failed");
      }
      const data = await res.json();
      login(data.access_token, data.user_id);
      setShowAuthModal(false);
      setAuthPassword("");
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
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
          {token ? (
            <button
              onClick={logout}
              className="flex items-center justify-center p-1.5 rounded bg-surface border border-border-subtle hover:bg-surface-2 transition-colors group"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-muted group-hover:text-bearish" />
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-accent text-white hover:bg-accent/90 transition-colors text-xs font-semibold"
            >
              <UserCircle className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </div>
      
      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-subtle rounded-xl p-6 w-full max-w-sm shadow-2xl glass-card relative">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-muted hover:text-foreground text-sm font-semibold"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold text-foreground mb-4">
              {authMode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Email</label>
                <input 
                  type="email" 
                  autoFocus
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded bg-surface-2 border border-border-subtle text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  placeholder="investor@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded bg-surface-2 border border-border-subtle text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  placeholder="••••••••"
                />
              </div>
              {authError && <p className="text-xs text-bearish font-semibold">{authError}</p>}
              <button 
                type="submit" 
                disabled={authLoading}
                className="w-full h-10 rounded bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {authMode === "login" ? "Sign In" : "Register"}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button 
                onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                className="text-xs text-muted hover:text-accent font-medium transition-colors"
              >
                {authMode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
