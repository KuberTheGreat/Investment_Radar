"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, TrendingUp, Activity } from "lucide-react";
import { fetchPipelineHealth } from "@/lib/api";

export default function Navbar() {
  const [newAlert, setNewAlert] = useState(false);
  const [health, setHealth] = useState<{ data_stale: boolean; last_refresh_at: string | null } | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Live market status (9:15–15:30 IST weekday)
  const isMarketOpen = () => {
    const now = new Date();
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const day = ist.getDay(); // 0 = Sun, 6 = Sat
    const h = ist.getHours(), m = ist.getMinutes();
    const mins = h * 60 + m;
    return day >= 1 && day <= 5 && mins >= 555 && mins <= 930; // 9:15–15:30
  };

  // SSE alerts subscription
  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    esRef.current = new EventSource(`${api}/alerts`);
    esRef.current.onmessage = (e) => {
      if (e.data && !e.data.startsWith(":")) setNewAlert(true);
    };
    return () => esRef.current?.close();
  }, []);

  // Pipeline health poll
  useEffect(() => {
    const poll = async () => {
      try { setHealth(await fetchPipelineHealth()); } catch {}
    };
    poll();
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, []);

  const open = isMarketOpen();

  return (
    <>
      {/* Stale data banner */}
      {health?.data_stale && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-900/80 text-amber-200 text-xs text-center py-1 backdrop-blur-sm">
          ⚠ Data may be delayed — last updated{" "}
          {health.last_refresh_at ? new Date(health.last_refresh_at).toLocaleTimeString() : "unknown"}
        </div>
      )}

      <nav
        className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-4 md:px-8"
        style={{ background: "rgba(6,8,15,0.85)", borderBottom: "1px solid #1f2937", backdropFilter: "blur(12px)" }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}>
            <TrendingUp size={16} color="white" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-slate-100">
            Investor<span className="text-emerald-400">Radar</span>
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Market status */}
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${open ? "bg-emerald-400" : "bg-red-500"}`}
              style={open ? { boxShadow: "0 0 6px #10b981" } : {}}
            />
            <span className={open ? "text-emerald-400" : "text-slate-500"}>
              {open ? "Market Open" : "Market Closed"}
            </span>
          </div>

          {/* Last refresh */}
          {health?.last_refresh_at && (
            <span className="hidden md:block text-xs text-slate-500">
              <Activity size={11} className="inline mr-1" />
              {new Date(health.last_refresh_at).toLocaleTimeString()}
            </span>
          )}

          {/* Alert bell */}
          <button
            onClick={() => setNewAlert(false)}
            className={`relative text-slate-400 hover:text-emerald-400 transition-colors ${newAlert ? "pulse" : ""}`}
            title="New signal alerts"
          >
            <Bell size={20} />
            {newAlert && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
