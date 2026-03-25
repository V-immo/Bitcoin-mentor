import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SessionWrapper from "@/components/SessionWrapper";
import { LanguageProvider } from "@/contexts/LanguageContext";
import LanguagePicker from "@/components/LanguagePicker";

export const metadata: Metadata = {
  title: "Bitcoin Mentor",
  description: "Leer traden met een AI-coach — Bitcoin Mentor",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BTC Mentor",
  },
  formatDetection: { telephone: false },
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
    <html lang="nl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        `}} />
      </head>
      <body>
        <SessionWrapper>
          <LanguageProvider>
            <LanguagePicker />
            <Nav />
            <div className="app-content">{children}</div>
          </LanguageProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
