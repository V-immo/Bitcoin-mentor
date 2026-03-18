"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/admin",         label: "📊 Overzicht",    exact: true },
  { href: "/admin/users",   label: "👥 Gebruikers",   exact: false },
  { href: "/admin/capital", label: "💰 Kapitaal",     exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span style={{ color: "var(--primary)", fontSize: 20 }}>⚡</span> Admin
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2, fontWeight: 400 }}>
            Bitcoin Mentor
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.map((item) => {
            const active = item.exact ? path === item.href : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-link${active ? " active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", padding: "0 0 8px" }}>
          <Link href="/" className="admin-nav-link admin-back">
            ← Terug naar app
          </Link>
          <button
            onClick={async () => { await signOut({ redirect: false }); window.location.href = "/auth/login"; }}
            className="admin-nav-link"
            style={{
              width: "100%", background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left", color: "var(--red)",
            }}
          >
            🚪 Uitloggen
          </button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
