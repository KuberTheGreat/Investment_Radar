"use client";
import { User, Mail, Shield, LogOut, ArrowRight, Zap, Star } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/lib/authContext";
import { useWatchlist } from "@/lib/hooks";
import { signOut, signIn, useSession } from "next-auth/react";
import Link from "next/link";

export default function ProfilePage() {
  const { token } = useAuth();
  const { data: session } = useSession();
  const { data: watchlist } = useWatchlist();

  if (!token) {
    return (
      <>
        <TopBar title="My Profile" subtitle="Account Settings & Preferences" />
        <PageWrapper>
          <div className="p-8 mt-12 text-center bg-surface border border-border-subtle rounded-xl flex flex-col items-center glass-card max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-6 border border-border-subtle shadow-sm">
              <User className="w-8 h-8 text-muted" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Guest Account</h2>
            <p className="text-sm text-muted mb-6 max-w-sm">Sign in to sync your custom Watchlist across devices and enable personalized real-time market pipelines.</p>
            <button 
              onClick={() => signIn("google")} 
              className="px-6 py-3 bg-foreground text-surface rounded-lg font-bold transition hover:bg-foreground/90 shadow-md flex items-center gap-2"
            >
              Sign in with Google <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </PageWrapper>
      </>
    );
  }

  return (
    <>
      <TopBar title="My Profile" subtitle="Account Settings & Tracking Frameworks" />
      <PageWrapper>
        {/* Profile Card */}
        <div className="mb-8 p-6 md:p-8 rounded-2xl bg-surface border border-border-subtle shadow-sm relative overflow-hidden glass-card flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 z-0"></div>
          
          <div className="relative z-10">
            {session?.user?.image ? (
              <img src={session.user.image} alt="Profile" className="w-24 h-24 rounded-full border-4 border-surface shadow-md" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-bullish flex items-center justify-center border-4 border-surface shadow-md">
                <span className="text-3xl font-bold text-white tracking-tight">{session?.user?.name?.[0] || session?.user?.email?.[0] || <User className="w-10 h-10" />}</span>
              </div>
            )}
          </div>
          
          <div className="relative z-10 flex-1">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-1">{session?.user?.name || "Investor"}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-muted mb-4">
              <Mail className="w-4 h-4" /> <span>{session?.user?.email}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <span className="px-3 py-1 bg-surface-2 border border-border-subtle rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm text-foreground">
                <Shield className="w-3.5 h-3.5 text-accent" /> Secured by Google OAuth
              </span>
              <span className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm text-accent">
                <Zap className="w-3.5 h-3.5" /> Background Radar Live
              </span>
            </div>
          </div>

          <div className="relative z-10 w-full md:w-auto mt-4 md:mt-0">
            <button 
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full md:w-auto px-5 py-2.5 bg-surface-2 hover:bg-surface-3 transition-colors border border-border-subtle rounded-lg text-sm font-bold text-red-500 shadow-sm flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>

        {/* Account Assets Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-surface border border-border-subtle glass-card flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-surface-2 rounded-lg text-foreground shadow-sm border border-border-subtle">
                <Star className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Watchlist Sync</h3>
            </div>
            <p className="text-sm text-muted mb-6 flex-1">
              You are currently tracking {Array.isArray(watchlist) ? <strong className="text-foreground">{watchlist.length}</strong> : 0} native Indian equities in your private cloud matrix. These assets receive accelerated ML polling natively across all background instances.
            </p>
            <Link 
              href="/watchlist" 
              className="px-4 py-2 bg-foreground text-surface text-center rounded-lg text-sm font-bold shadow-sm transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 w-full md:w-auto align-self-start"
            >
              Manage Watchlist <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </PageWrapper>
    </>
  );
}
