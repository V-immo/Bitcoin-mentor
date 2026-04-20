"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, GraduationCap, BarChart3, TrendingUp, Calendar, type LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { SCAN_ASSETS } from "@/lib/assets";
import { toast } from "@/lib/toast";

type Stats = {
  loginStreak: number;
  quizLevel: number;
  quizXp: number;
  totalPnl: number;
  closedTrades: number;
  winRate: number;
  openPositions: number;
  journalCount: number;
};

type CardData = {
  Icon: ComponentType<LucideProps>;
  label: string;
  value: string;
  sub: string;
  color: string;
  href: string | null;
};

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [quizRes, paperRes, journalRes, userRes] = await Promise.all([
          fetch("/api/me/quiz").then(r => r.ok ? r.json() : null),
          fetch("/api/me/paper?asset=BTCUSDT").then(r => r.ok ? r.json() : null),
          fetch("/api/me/journal").then(r => r.ok ? r.json() : null),
          fetch("/api/me/nudge").then(r => r.ok ? r.json() : null),
        ]);

        const allPapers = await Promise.all(
          SCAN_ASSETS.map(a => fetch(`/api/me/paper?asset=${a.symbol}`).then(r => r.ok ? r.json() : null).catch(() => null))
        );

        type TradeEntry = { pnl?: number; side?: string };
        const allTrades: TradeEntry[] = allPapers.flatMap(p => p?.history ?? []);
        const closed = allTrades.filter(t => t.pnl != null);
        const wins = closed.filter(t => (t.pnl ?? 0) > 0);
        const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
        const openPos = allPapers.filter(p => p?.position && p.position !== "null").length;

        setStats({
          loginStreak: userRes?.streak ?? 0,
          quizLevel: quizRes?.level ?? 1,
          quizXp: quizRes?.xp ?? 0,
          totalPnl,
          closedTrades: closed.length,
          winRate: closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0,
          openPositions: openPos,
          journalCount: journalRes?.entries?.length ?? 0,
        });
      } catch { toast("Statistieken laden mislukt.", "error"); }
    }
    load();
  }, []);

  const cards: CardData[] = stats ? [
    {
      Icon: Flame,
      label: "Login streak",
      value: `${stats.loginStreak} dagen`,
      sub: stats.loginStreak >= 7 ? "Week streak" : stats.loginStreak >= 3 ? "Goed bezig" : "Log elke dag in",
      color: "var(--orange)",
      href: null,
    },
    {
      Icon: GraduationCap,
      label: "Quiz niveau",
      value: `Level ${stats.quizLevel}`,
      sub: `${stats.quizXp} XP`,
      color: "#8b5cf6",
      href: "/leren",
    },
    {
      Icon: BarChart3,
      label: "Paper P&L",
      value: stats.totalPnl === 0 ? "€0" : `${stats.totalPnl >= 0 ? "+" : ""}€${Math.abs(stats.totalPnl).toFixed(0)}`,
      sub: `${stats.closedTrades} trades · ${stats.winRate}% winrate`,
      color: stats.totalPnl >= 0 ? "var(--green)" : "var(--red)",
      href: "/trade",
    },
    {
      Icon: TrendingUp,
      label: "Open posities",
      value: String(stats.openPositions),
      sub: stats.openPositions > 0 ? "Actief in de markt" : "Geen open trades",
      color: "var(--primary)",
      href: "/trade",
    },
    {
      Icon: Calendar,
      label: "Journal entries",
      value: String(stats.journalCount),
      sub: stats.journalCount >= 5 ? "Goede gewoonte" : "Schrijf elke dag",
      color: "#06b6d4",
      href: "/agenda",
    },
  ] : [];

  if (!stats) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        {Array(5).fill(null).map((_, i) => (
          <div key={i} className="card" style={{ height: 90, animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
      {cards.map(card => (
        card.href ? (
          <Link key={card.label} href={card.href} style={{ textDecoration: "none" }}>
            <StatCard card={card} />
          </Link>
        ) : (
          <StatCard key={card.label} card={card} />
        )
      ))}
    </div>
  );
}

function StatCard({ card }: { card: CardData }) {
  return (
    <div
      className="card"
      onMouseEnter={e => (e.currentTarget.style.borderColor = card.color + "55")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <div style={{ marginBottom: 8, color: card.color }}>
        <card.Icon size={18} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: card.color, lineHeight: 1.1, marginBottom: 3 }}>
        {card.value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 2 }}>
        {card.label}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{card.sub}</div>
    </div>
  );
}
