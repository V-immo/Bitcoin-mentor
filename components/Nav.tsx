"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef, type ComponentType } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Home, GraduationCap, Newspaper, Radar, TrendingUp, User,
  Calendar, BarChart3, Building2, FlaskConical, Trophy,
  Settings, HelpCircle, ShieldCheck, LogOut, Sun, Moon, Flame, X, Video, Users,
  type LucideProps,
} from "lucide-react";

type NavIcon = ComponentType<LucideProps>;

const PRIMARY_LINKS: { href: string; key: string; Icon: NavIcon }[] = [
  { href: "/dashboard", key: "nav_link_dashboard", Icon: Home },
  { href: "/leren",     key: "nav_link_learn",     Icon: GraduationCap },
  { href: "/nieuws",    key: "nav_link_news",      Icon: Newspaper },
  { href: "/scanner",   key: "nav_link_scanner",   Icon: Radar },
  { href: "/trade",     key: "nav_link_trade",     Icon: TrendingUp },
  { href: "/profiel",   key: "nav_link_profile",   Icon: User },
];

const EXTRA_LINKS: { href: string; key: string; Icon: NavIcon }[] = [
  { href: "/agenda",       key: "nav_link_agenda",   Icon: Calendar },
  { href: "/stats",        key: "nav_link_stats",    Icon: BarChart3 },
  { href: "/brokers",      key: "nav_link_brokers",  Icon: Building2 },
  { href: "/testnet",      key: "more_menu_testnet", Icon: FlaskConical },
  { href: "/leaderboard",  key: "more_menu_ranking", Icon: Trophy },
  { href: "/content",      key: "nav_link_content",  Icon: Video },
  { href: "/partner",      key: "nav_link_partner",  Icon: Users },
];

const ACCOUNT_LINKS: { href: string; key: string; Icon: NavIcon }[] = [
  { href: "/instellingen", key: "nav_link_settings", Icon: Settings },
  { href: "/help",         key: "nav_link_help",     Icon: HelpCircle },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  const isCompanyAdmin = (session?.user as { companyRole?: string })?.companyRole === "admin";
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const [streak, setStreak] = useState<number>(0);
  const [isPro, setIsPro]   = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/me/nudge")
      .then(r => r.json())
      .then(d => { if (d.streak) setStreak(d.streak); })
      .catch(() => {});
    fetch("/api/me/pro")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.isPro) setIsPro(true); })
      .catch(() => {});
  }, [session]);

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
  if (pathname === "/") return null;

  const rl = (key: string) => key.startsWith("nav_") ? t(key as Parameters<typeof t>[0]) : key;

  const accountActive = [...ACCOUNT_LINKS, ...(isAdmin ? [{ href: "/admin" }] : [])]
    .some(l => pathname === l.href || pathname.startsWith(l.href + "/"));
  const username = session?.user?.name?.split(" ")[0] ?? "Account";

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
                <l.Icon size={17} className="app-nav-icon" />
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
              <Settings size={17} className="app-nav-icon" />
              <span className="app-nav-label">
                {username}
                {streak >= 2 && <span className="nav-streak-inline"><Flame size={11} />{streak}</span>}
                {" "}{dropOpen ? "▴" : "▾"}
              </span>
            </button>

            {dropOpen && (
              <div className="app-nav-dropdown">
                {EXTRA_LINKS.map((l) => {
                  const active = pathname === l.href || pathname.startsWith(l.href + "/");
                  return (
                    <Link key={l.href} href={l.href} className={`app-nav-dd-item${active ? " active" : ""}`}>
                      <l.Icon size={15} />
                      <span>{rl(l.key)}</span>
                    </Link>
                  );
                })}
                <div className="app-nav-dd-divider" />
                {ACCOUNT_LINKS.map((l) => {
                  const active = pathname === l.href || pathname.startsWith(l.href + "/");
                  return (
                    <Link key={l.href} href={l.href} className={`app-nav-dd-item${active ? " active" : ""}`}>
                      <l.Icon size={15} />
                      <span>{rl(l.key)}</span>
                    </Link>
                  );
                })}
                {isAdmin && (
                  <Link href="/admin" className={`app-nav-dd-item app-nav-dd-admin${pathname.startsWith("/admin") ? " active" : ""}`}>
                    <ShieldCheck size={15} />
                    <span>Admin</span>
                  </Link>
                )}
                {isCompanyAdmin && (
                  <Link href="/b2b/dashboard" className={`app-nav-dd-item${pathname.startsWith("/b2b") ? " active" : ""}`}>
                    <Building2 size={15} />
                    <span>Bedrijfsdashboard</span>
                  </Link>
                )}
                <div className="app-nav-dd-divider" />
                <button
                  className="app-nav-dd-item app-nav-dd-logout"
                  onClick={async () => { await signOut({ redirect: false }); window.location.href = "/"; }}
                >
                  <LogOut size={15} />
                  <span>{t("nav_logout")}</span>
                </button>
              </div>
            )}
          </div>

          {/* Pro badge */}
          {isPro && (
            <div className="nav-pro-badge" title="Marcus Pro">✦ Pro</div>
          )}

          {/* Thema toggle — altijd helemaal rechts, los van streak */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Lichtmodus" : "Donkermodus"}
            className="nav-theme-toggle"
            aria-label="Thema wisselen"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
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
                className="nav-mobile-icon-btn"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button className="nav-mobile-close" onClick={() => setMenuOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {session?.user && (
              <div className="nav-mobile-user">
                <span className="nav-mobile-username">{session.user.name}</span>
                {isAdmin && <span className="app-nav-badge-admin">Admin</span>}
                {streak >= 2 && (
                  <span className="nav-streak-badge" title={`${streak} dagen op rij`}><Flame size={14} /> {streak}</span>
                )}
              </div>
            )}

            <div className="nav-mobile-links">
              <div className="nav-mobile-section-title">Menu</div>
              {PRIMARY_LINKS.map((l) => {
                const active = pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link key={l.href} href={l.href} className={`nav-mobile-link${active ? " active" : ""}`}>
                    <l.Icon size={18} className="nav-mobile-link-icon" />
                    <span>{rl(l.key)}</span>
                  </Link>
                );
              })}

              <div className="nav-mobile-section-title" style={{ marginTop: 12 }}>Extra</div>
              {EXTRA_LINKS.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link key={l.href} href={l.href} className={`nav-mobile-link${active ? " active" : ""}`}>
                    <l.Icon size={18} className="nav-mobile-link-icon" />
                    <span>{rl(l.key)}</span>
                  </Link>
                );
              })}

              <div className="nav-mobile-section-title" style={{ marginTop: 12 }}>Account</div>
              {ACCOUNT_LINKS.map((l) => {
                const active = pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link key={l.href} href={l.href} className={`nav-mobile-link${active ? " active" : ""}`}>
                    <l.Icon size={18} className="nav-mobile-link-icon" />
                    <span>{rl(l.key)}</span>
                  </Link>
                );
              })}
              {isAdmin && (
                <Link href="/admin" className={`nav-mobile-link nav-mobile-admin${pathname.startsWith("/admin") ? " active" : ""}`}>
                  <ShieldCheck size={18} className="nav-mobile-link-icon" />
                  <span>Admin</span>
                </Link>
              )}
              {isCompanyAdmin && (
                <Link href="/b2b/dashboard" className={`nav-mobile-link${pathname.startsWith("/b2b") ? " active" : ""}`}>
                  <Building2 size={18} className="nav-mobile-link-icon" />
                  <span>Bedrijfsdashboard</span>
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
