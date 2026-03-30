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
  const isPublic =
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/alerts/check" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

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
