import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { JetBrains_Mono } from "next/font/google"
import { AuthProvider } from "@/context/AuthContext"
import "./globals.css"

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "ZENTO - Каталог Агентств Будущего",
  description: "Супер-современный каталог агентств и компаний с футуристичным дизайном",
  generator: "v0.dev",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ZENTO",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e1b4b",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
