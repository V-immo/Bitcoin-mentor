"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";

type Friend = { id: number; username: string; streak: number; activeToday: boolean };

export default function FriendsStreaks() {
  const { data: session } = useSession();
  const { lang } = useLanguage();
  const isNL = lang === "nl";

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    if (!session?.user) return;
    const userId = (session.user as { id?: string }).id ?? "";
    const token = btoa(userId);
    setInviteLink(`${window.location.origin}/invite/${token}`);

    fetch("/api/me/friends")
      .then(r => r.ok ? r.json() : { friends: [] })
      .then(d => { setFriends(d.friends ?? []); setLoaded(true); })
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

  return (
    <div className="card friends-streaks-card">
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

      {friends.length === 0 ? (
        <div className="friends-streaks-empty">
          <p className="friends-streaks-empty-text">
            {isNL
              ? "Nodig een vriend uit en zie elkaars streak."
              : "Invite a friend and see each other's streak."}
          </p>
          <button className="friends-streaks-copy-link" onClick={copyLink}>
            {copied
              ? (isNL ? "✓ Link gekopieerd!" : "✓ Link copied!")
              : (isNL ? "📋 Kopieer uitnodigingslink" : "📋 Copy invite link")}
          </button>
        </div>
      ) : (
        <div className="friends-streaks-list">
          {friends.map(f => (
            <div key={f.id} className="friends-streaks-row">
              <div className="friends-streaks-avatar">
                {f.username.charAt(0).toUpperCase()}
              </div>
              <div className="friends-streaks-info">
                <span className="friends-streaks-name">{f.username}</span>
                {f.activeToday && (
                  <span className="friends-streaks-active-dot" title={isNL ? "Actief vandaag" : "Active today"} />
                )}
              </div>
              <div className="friends-streaks-streak">
                <span className="friends-streaks-fire">🔥</span>
                <span className="friends-streaks-days">{f.streak}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
