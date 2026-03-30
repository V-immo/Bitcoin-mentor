import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Publieke routes — geen login vereist
  if (
    pathname.startsWith("/auth/") ||
    pathname === "/api/alerts/check" ||
    pathname.startsWith("/api/auth/")
  ) {
    return;
  }

  // Niet ingelogd → redirect naar login
  if (!req.auth) {
    const loginUrl = new URL("/auth/login", req.url);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)"],
};
