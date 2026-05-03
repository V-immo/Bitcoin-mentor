"use client";

import { useEffect, useState, useCallback } from "react";
import { Bitcoin, Gift, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type RewardEntry = {
  id: number;
  amount_sats: number;
  reason: string;
  metadata: string | null;
  created_at: string;
};

type RewardsData = {
  totalSats: number;
  history: RewardEntry[];
};

const REASON_LABELS: Record<string, { nl: string; en: string }> = {
  quiz_passed:    { nl: "Quiz gehaald (≥70%)",    en: "Quiz passed (≥70%)" },
  quiz_perfect:   { nl: "Perfect quizscore!",      en: "Perfect quiz score!" },
  quiz_level_up:  { nl: "Level omhoog!",           en: "Level up!" },
  trade_profit:   { nl: "Winstgevende trade",      en: "Profitable trade" },
  trade_excellent:{ nl: "Uitstekende trade!",      en: "Excellent trade!" },
};

function formatSats(sats: number): string {
  return sats.toLocaleString("nl-NL");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Globale event om widget te refreshen na verdienen
export function notifyRewardEarned(sats: number) {
  window.dispatchEvent(new CustomEvent("rewards-earned", { detail: { sats } }));
}

export default function RewardsWidget() {
  const { lang } = useLanguage();
  const [data, setData] = useState<RewardsData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [flash, setFlash] = useState<number | null>(null); // nieuwe sats die net binnenkwamen

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me/rewards");
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    load();
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ sats: number }>).detail;
      setFlash(detail.sats);
      load();
      setTimeout(() => setFlash(null), 3000);
    };
    window.addEventListener("rewards-earned", handler);
    return () => window.removeEventListener("rewards-earned", handler);
  }, [load]);

  if (!data) return null;

  const btcEquivalent = (data.totalSats / 100_000_000).toFixed(6);

  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color 0.2s",
        borderColor: flash ? "var(--accent)" : "var(--border)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #f7931a 0%, #ffb347 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Bitcoin size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 1 }}>
              {lang === "en" ? "Learn-to-Earn balance" : "Learn-to-Earn saldo"}
            </div>
            <div style={{ fontWeight: 700, fontSize: 20, color: "var(--text-primary)", letterSpacing: "-0.02em", display: "flex", alignItems: "baseline", gap: 6 }}>
              {formatSats(data.totalSats)}
              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-secondary)" }}>sats</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              ≈ {btcEquivalent} BTC
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {flash && (
            <div
              style={{
                background: "var(--accent)",
                color: "#fff",
                borderRadius: 20,
                padding: "3px 10px",
                fontSize: 12,
                fontWeight: 700,
                animation: "fadeIn 0.3s ease",
              }}
            >
              +{formatSats(flash)} sats
            </div>
          )}
          {data.history.length > 0 && (
            expanded ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />
          )}
        </div>
      </div>

      {/* History */}
      {expanded && data.history.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "8px 0" }}>
          {data.history.map((entry) => {
            const label = REASON_LABELS[entry.reason]?.[lang === "en" ? "en" : "nl"] ?? entry.reason;
            return (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Gift size={13} color="var(--accent)" />
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{label}</div>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{formatDate(entry.created_at)}</div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--accent)", flexShrink: 0 }}>
                  +{formatSats(entry.amount_sats)} sats
                </div>
              </div>
            );
          })}
          {data.history.length === 0 && (
            <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>
              {lang === "en" ? "No rewards yet — pass a quiz to earn your first sats!" : "Nog geen beloningen — haal een quiz om je eerste sats te verdienen!"}
            </div>
          )}
        </div>
      )}

      {/* Leeg state */}
      {data.totalSats === 0 && !expanded && (
        <div style={{ padding: "0 16px 14px", fontSize: 12, color: "var(--text-secondary)" }}>
          {lang === "en"
            ? "Pass a quiz (≥70%) or close a profitable paper trade to earn sats."
            : "Haal een quiz (≥70%) of sluit een winstgevende trade om sats te verdienen."}
        </div>
      )}
    </div>
  );
}
