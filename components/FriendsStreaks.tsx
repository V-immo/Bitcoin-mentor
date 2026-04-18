"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";

type Friend = {
  id: number;
  username: string;
  streak: number;
  activeToday: boolean;
  isAhead: boolean;
};

type FriendsData = {
  myStreak: number;
  myUsername: string;
  friendsAhead: number;
  friends: Friend[];
};

export default function FriendsStreaks() {
  const { data: session } = useSession();
  const { lang } = useLanguage();
  const isNL = lang === "nl";

  const [data, setData] = useState<FriendsData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    if (!session?.user) return;
    const userId = (session.user as { id?: string }).id ?? "";
    const token = btoa(userId);
    setInviteLink(`${window.location.origin}/invite/${token}`);

    fetch("/api/me/friends")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [session]);

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {});
  }

  if (!loaded) return null;

  const friends = data?.friends ?? [];
  const myStreak = data?.myStreak ?? 0;
  const friendsAhead = data?.friendsAhead ?? 0;

  // Maak een gecombineerde lijst: jijzelf + vrienden, gesorteerd op streak
  const allRows: { label: string; streak: number; isMe: boolean; isAhead: boolean; activeToday: boolean }[] = [
    { label: isNL ? "Jij" : "You", streak: myStreak, isMe: true, isAhead: false, activeToday: true },
    ...friends.map(f => ({
      label: f.username,
      streak: f.streak,
      isMe: false,
      isAhead: f.isAhead,
      activeToday: f.activeToday,
    })),
  ].sort((a, b) => b.streak - a.streak);

  return (
    <div className="card friends-streaks-card">
      {/* Header */}
      <div className="friends-streaks-header">
        <span className="friends-streaks-title">
          🤝 {isNL ? "Vrienden" : "Friends"}
        </span>
        <button className="friends-streaks-invite-btn" onClick={copyLink}>
          {copied
            ? (isNL ? "✓ Gekopieerd!" : "✓ Copied!")
            : (isNL ? "+ Uitnodigen" : "+ Invite")}
        </button>
      </div>

      {/* Vriend ligt voor — waarschuwingsbanner */}
      {friendsAhead > 0 && (
        <div className="friends-streaks-ahead-banner">
          🔥 {isNL
            ? `${friendsAhead === 1 ? "Een vriend heeft" : `${friendsAhead} vrienden hebben`} een langere streak — haal ze in!`
            : `${friendsAhead === 1 ? "A friend has" : `${friendsAhead} friends have`} a longer streak — catch up!`}
        </div>
      )}

      {friends.length === 0 ? (
        /* Lege staat — nog geen vrienden */
        <div className="friends-streaks-empty">
          <p className="friends-streaks-empty-text">
            {isNL
              ? "Nodig een vriend uit en zie elkaars streak — wie houdt het langst vol?"
              : "Invite a friend and track each other's streak — who lasts longer?"}
          </p>
          <button className="friends-streaks-copy-link" onClick={copyLink}>
            {copied
              ? (isNL ? "✓ Link gekopieerd!" : "✓ Link copied!")
              : (isNL ? "📋 Kopieer uitnodigingslink" : "📋 Copy invite link")}
          </button>
        </div>
      ) : (
        /* Ranglijst: jij + vrienden samen gesorteerd */
        <div className="friends-streaks-list">
          {allRows.map((row, i) => (
            <div
              key={i}
              className={`friends-streaks-row${row.isMe ? " friends-streaks-row--me" : ""}${row.isAhead ? " friends-streaks-row--ahead" : ""}`}
            >
              <span className="friends-streaks-rank">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </span>
              <div className="friends-streaks-info">
                <span className="friends-streaks-name">
                  {row.label}
                  {row.isMe && <span className="friends-streaks-you-tag"> ({isNL ? "jij" : "you"})</span>}
                </span>
                {row.activeToday && !row.isMe && (
                  <span className="friends-streaks-active-dot" title={isNL ? "Actief vandaag" : "Active today"} />
                )}
                {row.isAhead && (
                  <span className="friends-streaks-ahead-tag">
                    {isNL ? "↑ voor" : "↑ ahead"}
                  </span>
                )}
              </div>
              <div className="friends-streaks-streak">
                <span className="friends-streaks-fire">🔥</span>
                <span className="friends-streaks-days">{row.streak}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer: uitnodigen als er vrienden zijn */}
      {friends.length > 0 && (
        <div className="friends-streaks-footer">
          <button className="friends-streaks-copy-link" onClick={copyLink}>
            {copied
              ? (isNL ? "✓ Link gekopieerd!" : "✓ Link copied!")
              : (isNL ? "📋 Vriend uitnodigen" : "📋 Invite a friend")}
          </button>
        </div>
      )}
    </div>
  );
}
