"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef, type ComponentType } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { Lang } from "@/lib/translations";
import {
  Home, GraduationCap, Newspaper, Radar, TrendingUp, User,
  Calendar, BarChart3, Building2, FlaskConical, Trophy,
  Settings, HelpCircle, ShieldCheck, LogOut, Sun, Moon, Flame, X, Video, Users, Bot,
  MoreHorizontal,
  type LucideProps,
} from "lucide-react";

type NavIcon = ComponentType<LucideProps>;

const PRIMARY_LINKS: { href: string; key: string; Icon: NavIcon; tour?: string }[] = [
  { href: "/dashboard", key: "nav_link_dashboard", Icon: Home,          tour: "dashboard" },
  { href: "/leren",     key: "nav_link_learn",     Icon: GraduationCap, tour: "leren"     },
  { href: "/scanner",   key: "nav_link_scanner",   Icon: Radar,         tour: "scanner"   },
  { href: "/trade",     key: "nav_link_trade",     Icon: TrendingUp,    tour: "trade"     },
  { href: "/stats",     key: "nav_link_stats",     Icon: BarChart3                        },
];

const MORE_LINKS: { href: string; key: string; Icon: NavIcon }[] = [
  { href: "/nieuws",      key: "nav_link_news",     Icon: Newspaper    },
  { href: "/agenda",      key: "nav_link_agenda",   Icon: Calendar     },
  { href: "/brokers",     key: "nav_link_brokers",  Icon: Building2    },
  { href: "/bots",        key: "nav_link_bots",     Icon: Bot          },
  { href: "/content",     key: "nav_link_content",  Icon: Video        },
  { href: "/partner",     key: "nav_link_partner",  Icon: Users        },
  { href: "/leaderboard", key: "more_menu_ranking", Icon: Trophy       },
  { href: "/testnet",     key: "more_menu_testnet", Icon: FlaskConical },
];

const ACCOUNT_LINKS: { href: string; key: string; Icon: NavIcon }[] = [
  { href: "/profiel",    key: "nav_link_profile",  Icon: User        },
  { href: "/instellingen", key: "nav_link_settings", Icon: Settings  },
  { href: "/help",       key: "nav_link_help",     Icon: HelpCircle  },
];

export default function Nav() {
  const pathname    = usePathname();
  const { data: session } = useSession();
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const isAdmin        = (session?.user as { role?: string })?.role === "admin";
  const isCompanyAdmin = (session?.user as { companyRole?: string })?.companyRole === "admin";

  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);
  const acctRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const [streak, setStreak] = useState(0);
  const [isPro,  setIsPro]  = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/me/nudge").then(r => r.json()).then(d => { if (d.streak) setStreak(d.streak); }).catch(() => {});
    fetch("/api/me/pro").then(r => r.ok ? r.json() : null).then(d => { if (d?.isPro) setIsPro(true); }).catch(() => {});
  }, [session]);

  useEffect(() => { setMenuOpen(false); setMoreOpen(false); setAcctOpen(false); setLangOpen(false); }, [pathname]);
  useEffect(() => { document.body.style.overflow = menuOpen ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [menuOpen]);

  // Click-outside sluit dropdowns
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) setAcctOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const LANGS: { code: Lang; label: string }[] = [
    { code: "nl", label: "NL" }, { code: "en", label: "EN" },
    { code: "es", label: "ES" }, { code: "de", label: "DE" },
    { code: "pt", label: "PT" }, { code: "fr", label: "FR" },
    { code: "ar", label: "AR" },
  ];

  if (pathname.startsWith("/auth/") || pathname === "/") return null;

  const rl = (key: string) => key.startsWith("nav_") ? t(key as Parameters<typeof t>[0]) : key;
  const username  = session?.user?.name?.split(" ")[0] ?? "Account";
  const acctActive = [...ACCOUNT_LINKS, ...(isAdmin ? [{ href: "/admin" }] : [])]
    .some(l => pathname === l.href || pathname.startsWith(l.href + "/"));
  const moreActive = MORE_LINKS.some(l => pathname === l.href || pathname.startsWith(l.href + "/"));

  return (
    <>
      <nav className="app-nav">
        {/* Logo */}
        <Link href="/" className="app-nav-brand" style={{ textDecoration: "none" }}>
          <span className="app-nav-logo" style={{ fontFamily: "Arial, sans-serif" }}>₿</span>
          <span className="app-nav-name">Bitcoin Mentor</span>
        </Link>

        {/* Desktop links */}
        <div className="app-nav-links desktop-nav-links">

          {/* Primaire 5 links */}
          {PRIMARY_LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link key={l.href} href={l.href}
                className={`app-nav-link${active ? " active" : ""}`}
                {...(l.tour ? { "data-tour": l.tour } : {})}>
                <l.Icon size={17} className="app-nav-icon" />
                <span className="app-nav-label">{rl(l.key)}</span>
              </Link>
            );
          })}

          {/* Meer dropdown */}
          <div ref={moreRef} style={{ position: "relative" }}>
            <button
              className={`app-nav-link app-nav-more-btn${moreActive || moreOpen ? " active" : ""}`}
              onClick={() => setMoreOpen(v => !v)}
            >
              <MoreHorizontal size={17} className="app-nav-icon" />
              <span className="app-nav-label">Meer {moreOpen ? "▴" : "▾"}</span>
            </button>
            {moreOpen && (
              <div className="app-nav-dropdown">
                {MORE_LINKS.map((l) => {
                  const active = pathname === l.href || pathname.startsWith(l.href + "/");
                  return (
                    <Link key={l.href} href={l.href} className={`app-nav-dd-item${active ? " active" : ""}`}>
                      <l.Icon size={15} />
                      <span>{rl(l.key)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Scheidingslijn */}
          <div className="app-nav-divider" />

          {/* Taalwisselaar */}
          <div ref={langRef} className="nav-lang-switcher">
            <button className="nav-lang-btn" onClick={() => setLangOpen(v => !v)} aria-label="Taal wisselen">
              {lang.toUpperCase()}
            </button>
            {langOpen && (
              <div className="nav-lang-dropdown">
                {LANGS.map(({ code, label }) => (
                  <button key={code}
                    className={`nav-lang-option${lang === code ? " active" : ""}`}
                    onClick={() => { setLang(code); setLangOpen(false); }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Thema toggle */}
          <button onClick={toggleTheme} title={theme === "dark" ? "Lichtmodus" : "Donkermodus"}
            className="nav-theme-toggle" aria-label="Thema wisselen">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Account dropdown */}
          <div ref={acctRef} style={{ position: "relative" }}>
            <button
              className={`app-nav-link app-nav-account-btn${acctActive || acctOpen ? " active" : ""}`}
              onClick={() => setAcctOpen(v => !v)}
            >
              <User size={17} className="app-nav-icon" />
              <span className="app-nav-label">
                {username}
                {streak >= 2 && <span className="nav-streak-inline"><Flame size={11} />{streak}</span>}
                {isPro && <span className="nav-pro-inline">Pro</span>}
                {" "}{acctOpen ? "▴" : "▾"}
              </span>
            </button>
            {acctOpen && (
              <div className="app-nav-dropdown app-nav-dropdown-right">
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
                    <ShieldCheck size={15} /><span>Admin</span>
                  </Link>
                )}
                {isCompanyAdmin && (
                  <Link href="/b2b/dashboard" className={`app-nav-dd-item${pathname.startsWith("/b2b") ? " active" : ""}`}>
                    <Building2 size={15} /><span>Bedrijfsdashboard</span>
                  </Link>
                )}
                <div className="app-nav-dd-divider" />
                <button className="app-nav-dd-item app-nav-dd-logout"
                  onClick={async () => { await signOut({ redirect: false }); window.location.href = "/"; }}>
                  <LogOut size={15} /><span>{t("nav_logout")}</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Mobiel: hamburger */}
        <button className="nav-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu openen">
          <span className={`nav-hamburger-icon${menuOpen ? " open" : ""}`}>
            <span /><span /><span />
          </span>
        </button>
      </nav>

      {/* Mobiel menu */}
      {menuOpen && (
        <div className="nav-mobile-overlay" onClick={() => setMenuOpen(false)}>
          <div className="nav-mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="nav-mobile-header">
              <span className="app-nav-logo" style={{ fontSize: 24 }}>₿</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>Bitcoin Mentor</span>
              <button onClick={toggleTheme} title={theme === "dark" ? "Licht" : "Donker"} className="nav-mobile-icon-btn">
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button className="nav-mobile-close" onClick={() => setMenuOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {session?.user && (
              <div className="nav-mobile-user">
                <span className="nav-mobile-username">{session.user.name}</span>
                {isPro  && <span className="nav-pro-badge-mobile">Pro</span>}
                {isAdmin && <span className="app-nav-badge-admin">Admin</span>}
                {streak >= 2 && <span className="nav-streak-badge"><Flame size={14} /> {streak}</span>}
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

              <div className="nav-mobile-section-title" style={{ marginTop: 12 }}>Meer</div>
              {MORE_LINKS.map((l) => {
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
                  <ShieldCheck size={18} className="nav-mobile-link-icon" /><span>Admin</span>
                </Link>
              )}
              {isCompanyAdmin && (
                <Link href="/b2b/dashboard" className={`nav-mobile-link${pathname.startsWith("/b2b") ? " active" : ""}`}>
                  <Building2 size={18} className="nav-mobile-link-icon" /><span>Bedrijfsdashboard</span>
                </Link>
              )}

              <div className="nav-mobile-section-title" style={{ marginTop: 12 }}>Taal</div>
              <div className="nav-mobile-lang-row">
                {LANGS.map(({ code, label }) => (
                  <button key={code}
                    className={`nav-mobile-lang-btn${lang === code ? " active" : ""}`}
                    onClick={() => setLang(code)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {session?.user && (
              <button className="nav-mobile-logout"
                onClick={async () => { await signOut({ redirect: false }); window.location.href = "/"; }}>
                {t("nav_logout")}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
