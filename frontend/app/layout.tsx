import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'InvestorRadar',
  description: 'AI-powered market intelligence for the Indian Investor',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
