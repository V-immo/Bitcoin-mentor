import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SessionWrapper from "@/components/SessionWrapper";
import { LanguageProvider } from "@/contexts/LanguageContext";
import LanguagePicker from "@/components/LanguagePicker";

export const metadata: Metadata = {
  title: "Bitcoin Mentor",
  description: "Leer traden met een AI partner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
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
