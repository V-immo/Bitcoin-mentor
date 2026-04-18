import type { NextAuthConfig } from "next-auth";

// Edge-safe config — geen Node.js modules (db, bcrypt) hier
// Wordt gebruikt door middleware voor sessie-check
export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [], // Credentials provider zit in auth.ts (alleen Node.js runtime)
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
        token.startCapital = (user as { startCapital?: number }).startCapital ?? 10000;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { startCapital?: number }).startCapital = token.startCapital as number;
      }
      return session;
    },
    authorized({ auth: session }) {
      // Basis check — uitgebreide logica zit in middleware.ts
      return !!session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dagen
  },
};
