"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

const LINKS = [
  { href: "/dashboard",    key: "nav_link_scanner",  icon: "⚡" },
  { href: "/trade",        key: "nav_link_trade",    icon: "📈" },
  { href: "/leren",        key: "nav_link_learn",    icon: "🎓" },
  { href: "/agenda",       key: "nav_link_agenda",   icon: "📅" },
  { href: "/stats",        key: "nav_link_stats",    icon: "📊" },
  { href: "/profiel",      key: "nav_link_profile",  icon: "👤" },
  { href: "/instellingen", key: "nav_link_settings", icon: "⚙️" },
  { href: "/help",         key: "nav_link_help",     icon: "❓" },
] as const;

export default function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
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
    ? [...LINKS, { href: "/admin", key: "Admin" as const, icon: "🛡️" }]
    : LINKS;

  return (
    <>
      <nav className="app-nav">
        <Link href="/" className="app-nav-brand" style={{ textDecoration: "none" }}>
          <span className="app-nav-logo" style={{ fontFamily: "Arial, sans-serif" }}>₿</span>
          <span className="app-nav-name">Bitcoin Mentor</span>
        </Link>

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
                <span className="app-nav-label">{l.key.startsWith("nav_") ? t(l.key as Parameters<typeof t>[0]) : l.key}</span>
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
              onClick={toggleTheme}
              title={theme === "dark" ? "Schakel naar licht" : "Schakel naar donker"}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: "0 4px", lineHeight: 1 }}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              className="app-nav-logout"
              onClick={async () => { await signOut({ redirect: false }); window.location.href = "/auth/login"; }}
            >
              {t("nav_logout")}
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
              <button
                onClick={toggleTheme}
                title={theme === "dark" ? "Licht" : "Donker"}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: "0 4px", lineHeight: 1 }}
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
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
                    <span>{l.key.startsWith("nav_") ? t(l.key as Parameters<typeof t>[0]) : l.key}</span>
                  </Link>
                );
              })}
            </div>

            {session?.user && (
              <button
                className="nav-mobile-logout"
                onClick={async () => { await signOut({ redirect: false }); window.location.href = "/auth/login"; }}
              >
                {t("nav_logout")}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
