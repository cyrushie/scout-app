import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Scout Dashboard",
  description: "Internal analytics and lead operations for Scout.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
