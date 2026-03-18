"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

const LINKS = [
  { href: "/",             label: "Scanner",       icon: "⚡" },
  { href: "/trade",        label: "Traden",        icon: "📈" },
  { href: "/leren",        label: "Leren",         icon: "🎓" },
  { href: "/stats",        label: "Statistieken",  icon: "📊" },
  { href: "/profiel",      label: "Profiel",       icon: "👤" },
  { href: "/instellingen", label: "Instellingen",  icon: "⚙️" },
  { href: "/help",         label: "Help",          icon: "❓" },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  const [menuOpen, setMenuOpen] = useState(false);

  // Sluit menu bij navigatie
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Voorkom scroll van body als menu open is
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  if (pathname.startsWith("/auth/")) return null;

  const allLinks = isAdmin
    ? [...LINKS, { href: "/admin", label: "Admin", icon: "🛡️" }]
    : LINKS;

  return (
    <>
      <nav className="app-nav">
        <div className="app-nav-brand">
          <span className="app-nav-logo">₿</span>
          <span className="app-nav-name">Bitcoin Mentor</span>
        </div>

        {/* Desktop links */}
        <div className="app-nav-links desktop-nav-links">
          {allLinks.map((l) => {
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
        </div>

        {/* Desktop user */}
        {session?.user && (
          <div className="app-nav-user desktop-nav-links">
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

        {/* Mobiel: hamburger knop */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Menu openen"
        >
          <span className={`nav-hamburger-icon${menuOpen ? " open" : ""}`}>
            <span /><span /><span />
          </span>
        </button>
      </nav>

      {/* Mobiel menu overlay */}
      {menuOpen && (
        <div className="nav-mobile-overlay" onClick={() => setMenuOpen(false)}>
          <div className="nav-mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="nav-mobile-header">
              <span className="app-nav-logo" style={{ fontSize: 24 }}>₿</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>Bitcoin Mentor</span>
              <button className="nav-mobile-close" onClick={() => setMenuOpen(false)}>✕</button>
            </div>

            {session?.user && (
              <div className="nav-mobile-user">
                <span className="nav-mobile-username">{session.user.name}</span>
                {isAdmin && <span className="app-nav-badge-admin">Admin</span>}
              </div>
            )}

            <div className="nav-mobile-links">
              {allLinks.map((l) => {
                const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`nav-mobile-link${active ? " active" : ""}`}
                  >
                    <span className="nav-mobile-link-icon">{l.icon}</span>
                    <span>{l.label}</span>
                  </Link>
                );
              })}
            </div>

            {session?.user && (
              <button
                className="nav-mobile-logout"
                onClick={async () => { await signOut({ redirect: false }); window.location.href = "/auth/login"; }}
              >
                Uitloggen
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
