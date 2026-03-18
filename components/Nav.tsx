"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const LINKS = [
  { href: "/",              label: "Scanner",        icon: "⚡" },
  { href: "/trade",         label: "Traden",         icon: "📈" },
  { href: "/leren",         label: "Leren",          icon: "🎓" },
  { href: "/stats",         label: "Statistieken",   icon: "📊" },
  { href: "/help",          label: "Help",           icon: "❓" },
  { href: "/profiel",       label: "Profiel",        icon: "👤" },
  { href: "/instellingen",  label: "Instellingen",   icon: "⚙️" },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  // Verberg nav op login pagina
  if (pathname.startsWith("/auth/")) return null;

  return (
    <nav className="app-nav">
      <div className="app-nav-brand">
        <span className="app-nav-logo">₿</span>
        <span className="app-nav-name">Bitcoin Mentor</span>
      </div>
      <div className="app-nav-links">
        {LINKS.map((l) => {
          const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`app-nav-link${active ? " active" : ""}`}
            >
              <span className="app-nav-icon">{l.icon}</span>
              <span className="app-nav-label">{l.label}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={`app-nav-link${pathname.startsWith("/admin") ? " active" : ""}`}
          >
            <span className="app-nav-icon">🛡️</span>
            <span className="app-nav-label">Admin</span>
          </Link>
        )}
      </div>
      {session?.user && (
        <div className="app-nav-user">
          <span className="app-nav-username">{session.user.name}</span>
          {isAdmin && <span className="app-nav-badge-admin">Admin</span>}
          <button
            className="app-nav-logout"
            onClick={async () => { await signOut({ redirect: false }); window.location.href = "/auth/login"; }}
          >
            Uitloggen
          </button>
        </div>
      )}
    </nav>
  );
}
