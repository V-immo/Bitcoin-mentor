import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Nav from "@/components/Nav";
import FloatingMarcus from "@/components/FloatingMarcus";
import AppWalkthrough from "@/components/AppWalkthrough";
import MarcusDailyBrief from "@/components/MarcusDailyBrief";
import Toaster from "@/components/Toaster";
import BadgeUnlock from "@/components/BadgeUnlock";
import MarcusDebrief from "@/components/MarcusDebrief";
import LuckyXPToast from "@/components/LuckyXPToast";
import SessionWrapper from "@/components/SessionWrapper";
import DevtoolsBlocker from "@/components/DevtoolsBlocker";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ProProvider } from "@/contexts/ProContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
  preload: false,
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Bitcoin Mentor",
  description: "Leer traden met Marcus, jouw persoonlijke mentor — Bitcoin Mentor",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BTC Mentor",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0610" },
    { media: "(prefers-color-scheme: light)", color: "#e91e63" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){var t=localStorage.getItem('app_theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');})();
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        `}} />
      </head>
      <body className={inter.className}>
        <SessionWrapper>
          <ThemeProvider>
            <LanguageProvider>
              <CurrencyProvider>
                <ProProvider>
                  <Nav />
                  <div className="app-content">{children}</div>
                  <FloatingMarcus />
                  <MarcusDailyBrief />
                  <AppWalkthrough />
                  <BadgeUnlock />
                  <MarcusDebrief />
                  <LuckyXPToast />
                  <Toaster />
                  <DevtoolsBlocker />
                </ProProvider>
              </CurrencyProvider>
            </LanguageProvider>
          </ThemeProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
