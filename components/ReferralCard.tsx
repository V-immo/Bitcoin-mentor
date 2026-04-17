"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";

type ReferralData = {
  code: string;
  referredCount: number;
  xpEarned: number;
  rewardPerReferral: number;
};

export default function ReferralCard() {
  const { data: session } = useSession();
  const { lang } = useLanguage();
  const isNL = lang === "nl";

  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/me/referral")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setData(d))
      .catch(() => {});
  }, [session]);

  function getLink() {
    return `${window.location.origin}/auth/register?ref=${data?.code}`;
  }

  function copyLink() {
    if (!data) return;
    navigator.clipboard.writeText(getLink()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (!data) return null;

  return (
    <div className="referral-card card">
      <div className="referral-header">
        <span className="referral-title">🎁 {isNL ? "Vrienden uitnodigen" : "Invite friends"}</span>
        {data.referredCount > 0 && (
          <span className="referral-count-badge">{data.referredCount} {isNL ? "uitgenodigd" : "invited"}</span>
        )}
      </div>

      <p className="referral-desc">
        {isNL
          ? `Nodig een vriend uit — jullie krijgen allebei +${data.rewardPerReferral} XP en 1 Streak Freeze zodra zij zich registreren.`
          : `Invite a friend — you both get +${data.rewardPerReferral} XP and 1 Streak Freeze when they register.`}
      </p>

      <div className="referral-link-row">
        <div className="referral-link-box">
          <span className="referral-link-text">
            {typeof window !== "undefined" ? getLink() : `…/register?ref=${data.code}`}
          </span>
        </div>
        <button className="referral-copy-btn" onClick={copyLink}>
          {copied ? (isNL ? "✓ Gekopieerd!" : "✓ Copied!") : (isNL ? "📋 Kopieer" : "📋 Copy")}
        </button>
      </div>

      <div className="referral-code-row">
        <span className="referral-code-label">{isNL ? "Jouw code:" : "Your code:"}</span>
        <span className="referral-code">{data.code}</span>
      </div>

      {data.xpEarned > 0 && (
        <div className="referral-xp-earned">
          ⚡ {isNL ? `+${data.xpEarned} XP verdiend via referrals` : `+${data.xpEarned} XP earned via referrals`}
        </div>
      )}

      <div className="referral-rewards">
        <div className="referral-reward-item">
          <span className="referral-reward-val">+{data.rewardPerReferral} XP</span>
          <span className="referral-reward-label">{isNL ? "voor jou" : "for you"}</span>
        </div>
        <div className="referral-reward-divider">+</div>
        <div className="referral-reward-item">
          <span className="referral-reward-val">+{data.rewardPerReferral} XP</span>
          <span className="referral-reward-label">{isNL ? "voor vriend" : "for friend"}</span>
        </div>
        <div className="referral-reward-divider">+</div>
        <div className="referral-reward-item">
          <span className="referral-reward-val">🛡️ ×2</span>
          <span className="referral-reward-label">Streak Freeze</span>
        </div>
      </div>
    </div>
  );
}
