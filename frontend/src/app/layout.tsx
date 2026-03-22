import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import QueryProvider from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "InvestorRadar — AI for the Indian Investor",
  description:
    "Institutional-grade chart pattern intelligence and corporate event signals for Indian retail investors.",
  openGraph: {
    title: "InvestorRadar",
    description: "AI-powered market intelligence for every Indian investor.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <Navbar />
          <main className="pt-16 min-h-screen">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
