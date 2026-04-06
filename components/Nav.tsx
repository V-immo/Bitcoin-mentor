"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

const PRIMARY_LINKS = [
  { href: "/dashboard",    key: "nav_link_scanner",  icon: "⚡" },
  { href: "/trade",        key: "nav_link_trade",    icon: "📈" },
  { href: "/leren",        key: "nav_link_learn",    icon: "🎓" },
  { href: "/stats",        key: "nav_link_stats",    icon: "📊" },
] as const;

const TRADE_LINKS = [
  { href: "/testnet",      key: "more_menu_testnet", icon: "🔬" },
  { href: "/live",         key: "more_menu_live",    icon: "💶" },
  { href: "/leaderboard",  key: "more_menu_ranking", icon: "🏆" },
] as const;

const ACCOUNT_LINKS = [
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
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMenuOpen(false); setDropOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);
  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropOpen]);

  if (pathname.startsWith("/auth/")) return null;
  if (pathname === "/" && !session) return null;

  const rl = (key: string) => key.startsWith("nav_") ? t(key as Parameters<typeof t>[0]) : key;

  const accountActive = [...ACCOUNT_LINKS, ...(isAdmin ? [{ href: "/admin" }] : [])]
    .some(l => pathname === l.href || pathname.startsWith(l.href + "/"));

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
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link key={l.href} href={l.href} className={`app-nav-link${active ? " active" : ""}`}>
                <span className="app-nav-icon">{l.icon}</span>
                <span className="app-nav-label">{rl(l.key)}</span>
              </Link>
            );
          })}

          {/* Account dropdown */}
          <div ref={dropRef} style={{ position: "relative" }}>
            <button
              className={`app-nav-link app-nav-account-btn${accountActive || dropOpen ? " active" : ""}`}
              onClick={() => setDropOpen(v => !v)}
            >
              <span className="app-nav-icon">👤</span>
              <span className="app-nav-label">
                {session?.user?.name ?? "Account"} {dropOpen ? "▴" : "▾"}
              </span>
            </button>

            {dropOpen && (
              <div className="app-nav-dropdown">
                {ACCOUNT_LINKS.map((l) => {
                  const active = pathname === l.href || pathname.startsWith(l.href + "/");
                  return (
                    <Link key={l.href} href={l.href} className={`app-nav-dd-item${active ? " active" : ""}`}>
                      <span>{l.icon}</span>
                      <span>{rl(l.key)}</span>
                    </Link>
                  );
                })}
                {isAdmin && (
                  <Link href="/admin" className={`app-nav-dd-item app-nav-dd-admin${pathname.startsWith("/admin") ? " active" : ""}`}>
                    <span>🛡️</span>
                    <span>Admin</span>
                  </Link>
                )}
                <div className="app-nav-dd-divider" />
                <button
                  className="app-nav-dd-item app-nav-dd-logout"
                  onClick={async () => { await signOut({ redirect: false }); window.location.href = "/"; }}
                >
                  <span>🚪</span>
                  <span>{t("nav_logout")}</span>
                </button>
              </div>
            )}
          </div>

          {/* Thema toggle */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Lichtmodus" : "Donkermodus"}
            className="app-nav-link app-nav-theme-btn"
          >
            <span className="app-nav-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
          </button>
        </div>

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
              <div className="nav-mobile-section-title">Menu</div>
              {PRIMARY_LINKS.map((l) => {
                const active = pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link key={l.href} href={l.href} className={`nav-mobile-link${active ? " active" : ""}`}>
                    <span className="nav-mobile-link-icon">{l.icon}</span>
                    <span>{rl(l.key)}</span>
                  </Link>
                );
              })}

              <div className="nav-mobile-section-title" style={{ marginTop: 12 }}>Trading</div>
              {TRADE_LINKS.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link key={l.href} href={l.href} className={`nav-mobile-link${active ? " active" : ""}`}>
                    <span className="nav-mobile-link-icon">{l.icon}</span>
                    <span>{rl(l.key)}</span>
                  </Link>
                );
              })}

              <div className="nav-mobile-section-title" style={{ marginTop: 12 }}>Account</div>
              {ACCOUNT_LINKS.map((l) => {
                const active = pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link key={l.href} href={l.href} className={`nav-mobile-link${active ? " active" : ""}`}>
                    <span className="nav-mobile-link-icon">{l.icon}</span>
                    <span>{rl(l.key)}</span>
                  </Link>
                );
              })}
              {isAdmin && (
                <Link href="/admin" className={`nav-mobile-link nav-mobile-admin${pathname.startsWith("/admin") ? " active" : ""}`}>
                  <span className="nav-mobile-link-icon">🛡️</span>
                  <span>Admin</span>
                </Link>
              )}
            </div>

            {session?.user && (
              <button
                className="nav-mobile-logout"
                onClick={async () => { await signOut({ redirect: false }); window.location.href = "/"; }}
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
