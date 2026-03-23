import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/ui/QueryProvider";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "InvestorRadar — AI-Powered Market Intelligence",
  description:
    "Real-time AI-powered trading signals, pattern detection, and corporate event analysis for Indian equity markets.",
  keywords: ["stock market", "trading signals", "AI investing", "NSE", "BSE", "India"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <QueryProvider>
          <Sidebar />
          <div className="min-h-screen">{children}</div>
        </QueryProvider>
      </body>
    </html>
  );
}
