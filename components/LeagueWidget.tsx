"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";

type LeagueEntry = { rank: number; display: string; score: number; isMe: boolean };

type LeagueData = {
  tier: number;
  tierName: string;
  tierEmoji: string;
  myScore: number;
  myRank: number;
  total: number;
  top5: LeagueEntry[];
  promoteZone: number;
  degradeZone: number;
};

const TIER_COLORS: Record<number, string> = {
  1: "#cd7f32",
  2: "#9ca3af",
  3: "#f59e0b",
  4: "#60a5fa",
  5: "#a78bfa",
};

export default function LeagueWidget() {
  const { data: session } = useSession();
  const { lang } = useLanguage();
  const isNL = lang === "nl";

  const [data, setData] = useState<LeagueData | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/me/league")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setData(d))
      .catch(() => {});
  }, [session]);

  if (!data) return null;

  const tierColor = TIER_COLORS[data.tier] ?? "#cd7f32";
  const isPromotion = data.myRank <= data.promoteZone && data.tier < 5;
  const isDegradation = data.myRank > data.total - data.degradeZone && data.tier > 1;

  return (
    <div className="card league-card">
      <div className="league-header">
        <div className="league-title-row">
          <span className="league-icon">🏆</span>
          <span className="league-title">{isNL ? "Liga" : "League"}</span>
        </div>
        <div className="league-tier-badge" style={{ color: tierColor, borderColor: tierColor }}>
          {data.tierEmoji} {data.tierName}
        </div>
      </div>

      <div className="league-rank-row">
        <div className="league-my-rank">
          <span className="league-rank-num">#{data.myRank}</span>
          <span className="league-rank-label">
            {isNL ? `van ${data.total}` : `of ${data.total}`}
          </span>
        </div>
        <div className="league-score-block">
          <span className="league-score-num">{data.myScore}</span>
          <span className="league-score-label">{isNL ? "punten" : "points"}</span>
        </div>
      </div>

      {(isPromotion || isDegradation) && (
        <div className={`league-zone-banner ${isPromotion ? "league-zone-promote" : "league-zone-degrade"}`}>
          {isPromotion
            ? (isNL ? `🔼 Promotie zone — top ${data.promoteZone}` : `🔼 Promotion zone — top ${data.promoteZone}`)
            : (isNL ? `🔽 Degradatie zone — eindig hoger` : `🔽 Relegation zone — finish higher`)}
        </div>
      )}

      <div className="league-list">
        {data.top5.map((entry, i) => (
          <div key={i} className={`league-row ${entry.isMe ? "league-row--me" : ""}`}>
            <span className="league-row-rank">
              {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
            </span>
            <span className="league-row-name">{entry.display}</span>
            <span className="league-row-score">{entry.score} {isNL ? "pt" : "pt"}</span>
          </div>
        ))}
      </div>

      <p className="league-footer">
        {isNL
          ? `Top ${data.promoteZone} stijgt · Onderste ${data.degradeZone} daalt · Reset elke maandag`
          : `Top ${data.promoteZone} promote · Bottom ${data.degradeZone} degrade · Resets Monday`}
      </p>
    </div>
  );
}
