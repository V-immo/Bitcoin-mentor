"use client";

import Link from "next/link";
import Leaderboard from "@/components/Leaderboard";

export default function LeaderboardPage() {
  return (
    <main className="container-page clean-page">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Link href="/trade" className="page-back-btn">← Terug</Link>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🏆 Ranking</h1>
      </div>
      <Leaderboard />
    </main>
  );
}
