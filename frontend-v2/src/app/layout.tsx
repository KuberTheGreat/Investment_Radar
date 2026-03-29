import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SideNav } from "@/components/layout/side-nav";
import { Providers } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "Investment Radar — AI Stock Intelligence",
  description: "AI-powered stock signals for Indian retail investors. Pattern detection, confluence scoring, and plain-English explanations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased font-sans">
        <Providers>
          {/* Global Navigation */}
          <SideNav />
          <BottomNav />

          {/* Main App Container */}
          <main className="max-w-lg mx-auto md:max-w-4xl relative min-h-screen md:ml-64">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
