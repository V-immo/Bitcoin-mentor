"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

const NAV = [
  { href: "/admin",           label: "Overview",   exact: true },
  { href: "/admin/users",     label: "Users",      exact: false },
  { href: "/admin/capital",   label: "Capital",    exact: false },
  { href: "/admin/quiz",      label: "Quiz Pool",  exact: false },
  { href: "/admin/revenue",   label: "Revenue",    exact: false },
  { href: "/admin/playbook",  label: "Playbook",   exact: false },
  { href: "/admin/broadcast", label: "Broadcast",  exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    const role = (session?.user as { role?: string })?.role;
    if (!session || role !== "admin") {
      router.replace("/");
    }
  }, [session, status, router]);

  if (status === "loading") return null;
  const role = (session?.user as { role?: string })?.role;
  if (!session || role !== "admin") return null;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span style={{ color: "var(--primary)", fontSize: 20 }}>★</span> Admin
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
            ← Back to app
          </Link>
          <button
            onClick={async () => { await signOut({ redirect: false }); window.location.href = "/auth/login"; }}
            className="admin-nav-link"
            style={{
              width: "100%", background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left", color: "var(--red)",
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
