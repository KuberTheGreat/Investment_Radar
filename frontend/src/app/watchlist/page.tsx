"use client";
import { Search, PlusCircle, ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { TopBar } from "@/components/layout/TopBar";
import { useWatchlist } from "@/lib/hooks";
import { useAuth } from "@/lib/authContext";
import { signIn } from "next-auth/react";

export default function WatchlistPage() {
  const { data: watchlist, isLoading } = useWatchlist();
  const { token } = useAuth();

  return (
    <>
      <TopBar title="My Watchlist" subtitle="Track your active Indian equities" />
      <PageWrapper>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 p-6 rounded-2xl bg-surface border border-border-subtle shadow-sm relative overflow-hidden glass-card">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Active Tracking</h1>
              <div className="p-2 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                <Star className="w-5 h-5 fill-current" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted">Background ML processing pipelines are exclusively scanning these assets.</p>
          </div>
        </div>

        <div className="space-y-4 min-h-[400px]">
          {!token ? (
            <div className="p-8 mt-12 text-center bg-surface border border-border-subtle rounded-xl flex flex-col items-center glass-card max-w-lg mx-auto">
              <p className="text-sm text-muted mb-4 max-w-sm">Sign in to track your favorite Indian equities and receive personalized background AI processing pipelines.</p>
              <button 
                onClick={() => signIn("google")} 
                className="px-5 py-2.5 bg-accent text-white rounded font-semibold transition hover:bg-accent/90"
              >
                Sign In Securely
              </button>
            </div>
          ) : isLoading ? (
            <div className="p-12 flex justify-center w-full">
              <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
            </div>
          ) : !Array.isArray(watchlist) || watchlist.length === 0 ? (
            <div className="p-8 mt-12 text-center bg-surface border border-border-subtle rounded-xl glass-card max-w-lg mx-auto">
              <p className="text-sm font-semibold text-foreground mb-1">Your Watchlist is empty.</p>
              <p className="text-xs text-muted mt-2 mb-6 max-w-sm mx-auto">Search for any NSE stock, navigate to its analysis page, and click the Star icon to configure background tracking.</p>
              <button 
                onClick={() => (document.querySelector('input[placeholder="Search stock (e.g., ZOMATO)"]') as HTMLInputElement)?.focus()} 
                className="px-5 py-2.5 bg-accent text-white rounded font-semibold transition hover:bg-accent/90 inline-flex items-center gap-2 text-sm shadow-md"
              >
                <Search className="w-4 h-4" /> Search Stocks to Add
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button 
                  onClick={() => (document.querySelector('input[placeholder="Search stock (e.g., ZOMATO)"]') as HTMLInputElement)?.focus()}
                  className="text-xs font-semibold text-accent hover:text-accent/80 flex items-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Add Stock
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in zoom-in-95 duration-300">
                {watchlist.map((symbol: string) => (
                  <Link
                    key={symbol}
                    href={`/stock/${symbol.replace(".NS", "")}`}
                    className="p-4 bg-surface hover:bg-surface-2 transition-colors border border-border-subtle rounded-xl flex items-center justify-between group glass-card shadow-sm"
                  >
                    <span className="font-bold text-sm tracking-tight whitespace-nowrap overflow-hidden text-ellipsis mr-2">
                      {symbol.replace(".NS", "")}
                    </span>
                    <ArrowRight className="w-4 h-4 flex-shrink-0 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  );
}
