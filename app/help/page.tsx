"use client";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HelpPage() {
  const { t } = useLanguage();

  const SECTIONS = [
    {
      icon: "📈",
      title: t("help_section_trade"),
      items: [
        { q: t("help_q_trade1"), a: t("help_a_trade1") },
        { q: t("help_q_trade2"), a: t("help_a_trade2") },
        { q: t("help_q_trade3"), a: t("help_a_trade3") },
        { q: t("help_q_trade4"), a: t("help_a_trade4") },
      ],
    },
    {
      icon: "🤖",
      title: t("help_section_marcus"),
      items: [
        { q: t("help_q_marcus1"), a: t("help_a_marcus1") },
        { q: t("help_q_marcus2"), a: t("help_a_marcus2") },
        { q: t("help_q_marcus3"), a: t("help_a_marcus3") },
        { q: t("help_q_marcus4"), a: t("help_a_marcus4") },
      ],
    },
    {
      icon: "💰",
      title: t("help_section_paper"),
      items: [
        { q: t("help_q_paper1"), a: t("help_a_paper1") },
        { q: t("help_q_paper2"), a: t("help_a_paper2") },
        { q: t("help_q_paper3"), a: t("help_a_paper3") },
        { q: t("help_q_paper4"), a: t("help_a_paper4") },
      ],
    },
    {
      icon: "🎯",
      title: t("help_section_goal"),
      items: [
        { q: t("help_q_goal1"), a: t("help_a_goal1") },
        { q: t("help_q_goal2"), a: t("help_a_goal2") },
      ],
    },
    {
      icon: "🧠",
      title: t("help_section_quiz"),
      items: [
        { q: t("help_q_quiz1"), a: t("help_a_quiz1") },
        { q: t("help_q_quiz2"), a: t("help_a_quiz2") },
      ],
    },
    {
      icon: "📊",
      title: t("help_section_stats"),
      items: [
        { q: t("help_q_stats1"), a: t("help_a_stats1") },
      ],
    },
    {
      icon: "📰",
      title: t("help_section_news"),
      items: [
        { q: t("help_q_news1"), a: t("help_a_news1") },
        { q: t("help_q_news2"), a: t("help_a_news2") },
      ],
    },
    {
      icon: "🏆",
      title: t("help_section_leaderboard"),
      items: [
        { q: t("help_q_lb1"), a: t("help_a_lb1") },
      ],
    },
  ];

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 60px" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/trade" className="page-back-btn">{t("help_back")}</Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
        {t("help_title")}
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
        {t("help_subtitle")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {SECTIONS.map((section) => (
          <section key={section.title} className="terminal-side-card">
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
              {section.icon} {section.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.items.map((item) => (
                <details key={item.q} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                  <summary style={{
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text)",
                    padding: "4px 0",
                    listStyle: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    {item.q}
                    <span style={{ color: "var(--text-secondary)", fontSize: 12, marginLeft: 8 }}>▼</span>
                  </summary>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.6, paddingLeft: 4 }}>
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="terminal-side-card" style={{ marginTop: 20, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
          {t("help_footer_text")}
        </p>
        <Link href="/trade" className="terminal-btn terminal-btn-primary" style={{ display: "inline-block" }}>
          {t("help_footer_btn")}
        </Link>
      </div>
    </main>
  );
}
