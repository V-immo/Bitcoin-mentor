import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

// Gebruik Edge-safe authConfig — geen db/bcrypt imports
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as { role?: string })?.role;

  // Publieke paden — geen login vereist
  // Marketing pages (nieuws, brokers, help) zijn publiek om bezoekers te trekken
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/auth/") ||
    pathname === "/nieuws" ||
    pathname === "/brokers" ||
    pathname === "/help" ||
    pathname === "/leren" ||
    pathname === "/pro" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/me/unsubscribe-reminders" ||
    pathname.startsWith("/api/stats/") ||
    pathname.startsWith("/invite/") ||
    pathname === "/b2b/register" ||
    pathname.startsWith("/b2b/join/") ||
    pathname.startsWith("/api/b2b/accept/") ||
    pathname.startsWith("/api/users/public/") ||
    pathname === "/api/alerts/check" ||
    pathname === "/api/briefing" ||
    pathname.startsWith("/api/market-scan") ||
    pathname.startsWith("/api/sentiment") ||
    pathname.startsWith("/api/community") ||
    pathname.startsWith("/api/news") ||
    pathname.startsWith("/api/price") ||
    pathname.startsWith("/api/btc") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/icon" ||
    pathname === "/apple-icon";

  if (!isPublic && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Admin routes vereisen admin rol
  if (pathname.startsWith("/admin") && isLoggedIn && role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // API admin routes vereisen admin rol
  if (pathname.startsWith("/api/admin") && isLoggedIn && role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
