"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

// Primaire links — altijd zichtbaar in desktop nav
const PRIMARY_LINKS = [
  { href: "/dashboard", key: "nav_link_scanner",  icon: "⚡" },
  { href: "/trade",     key: "nav_link_trade",    icon: "📈" },
  { href: "/leren",     key: "nav_link_learn",    icon: "🎓" },
  { href: "/agenda",    key: "nav_link_agenda",   icon: "📅" },
  { href: "/stats",     key: "nav_link_stats",    icon: "📊" },
] as const;

// Secundaire links — achter "···" dropdown
const SECONDARY_LINKS = [
  { href: "/profiel",      key: "nav_link_profile",  icon: "👤" },
  { href: "/instellingen", key: "nav_link_settings", icon: "⚙️" },
  { href: "/help",         key: "nav_link_help",     icon: "❓" },
] as const;

type AnyLink = { href: string; key: string; icon: string };

export default function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // Sluit dropdown bij klik buiten
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  if (pathname.startsWith("/auth/")) return null;

  const secondaryLinks: AnyLink[] = isAdmin
    ? [...SECONDARY_LINKS, { href: "/admin", key: "Admin", icon: "🛡️" }]
    : [...SECONDARY_LINKS];

  const allLinks: AnyLink[] = [...PRIMARY_LINKS, ...secondaryLinks];

  const isSecondaryActive = secondaryLinks.some(
    l => pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href))
  );

  const renderLabel = (key: string) =>
    key.startsWith("nav_") ? t(key as Parameters<typeof t>[0]) : key;

  return (
    <>
      <nav className="app-nav">
        <Link href="/" className="app-nav-brand" style={{ textDecoration: "none" }}>
          <span className="app-nav-logo" style={{ fontFamily: "Arial, sans-serif" }}>₿</span>
          <span className="app-nav-name">Bitcoin Mentor</span>
        </Link>

        {/* Desktop: primaire links */}
        <div className="app-nav-links desktop-nav-links">
          {PRIMARY_LINKS.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link key={l.href} href={l.href} className={`app-nav-link${active ? " active" : ""}`}>
                <span className="app-nav-icon">{l.icon}</span>
                <span className="app-nav-label">{renderLabel(l.key)}</span>
              </Link>
            );
          })}

          {/* Desktop: ··· meer dropdown */}
          <div ref={moreRef} style={{ position: "relative" }}>
            <button
              className={`app-nav-link app-nav-more-btn${isSecondaryActive ? " active" : ""}${moreOpen ? " open" : ""}`}
              onClick={() => setMoreOpen(v => !v)}
              title="Meer"
            >
              <span className="app-nav-icon">···</span>
              <span className="app-nav-label">Meer</span>
            </button>
            {moreOpen && (
              <div className="app-nav-dropdown">
                {secondaryLinks.map((l) => {
                  const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
                  return (
                    <Link key={l.href} href={l.href} className={`app-nav-dropdown-item${active ? " active" : ""}`}>
                      <span>{l.icon}</span>
                      <span>{renderLabel(l.key)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
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

        {/* Mobiel: hamburger */}
        <button className="nav-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu openen">
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
                  <Link key={l.href} href={l.href} className={`nav-mobile-link${active ? " active" : ""}`}>
                    <span className="nav-mobile-link-icon">{l.icon}</span>
                    <span>{renderLabel(l.key)}</span>
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
