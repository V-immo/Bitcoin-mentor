import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

// Volledige config met Credentials provider (draait alleen in Node.js runtime)
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Gebruikersnaam", type: "text" },
        password: { label: "Wachtwoord", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // Lazy imports — draait alleen in Node.js (sign-in callback), nooit in Edge
        const { getDb } = await import("@/db/db");
        const bcrypt = await import("bcryptjs");

        const db = getDb();
        const user = db
          .prepare("SELECT * FROM users WHERE username = ?")
          .get(credentials.username as string) as {
            id: number;
            username: string;
            email: string;
            password_hash: string;
            role: string;
            start_capital: number;
          } | undefined;

        if (!user) return null;

        const ok = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );
        if (!ok) return null;

        // Laatste login bijwerken
        db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(
          new Date().toISOString(),
          user.id
        );

        return {
          id: String(user.id),
          name: user.username,
          email: user.email,
          role: user.role,
          startCapital: user.start_capital,
        };
      },
    }),
  ],
});
