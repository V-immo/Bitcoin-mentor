"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type Stats = {
  level: number;
  xp: number;
  streak: number;
  winRate: number | null;
  tradeCount: number;
  totalPnl: number;
  active7d: boolean;
};

type PartnerData = {
  optedIn: boolean;
  partner: {
    partnershipId: number;
    codename: string;
    matchedAt: string;
    level: number;
    streak: number;
    winRate: number | null;
    tradeCount: number;
    active7d: boolean;
  } | null;
};

type SummaryData = {
  available: boolean;
  partnerCodename?: string;
  myStats?: Stats;
  partnerStats?: Stats;
  summary?: string;
  matchedAt?: string;
};

const LEVEL_LABELS = ["", "Beginner", "Lerende", "Bewuste Trader", "Gedisciplineerde", "Pro"];

function StatCard({ label, mine, theirs, format = (v: number | null) => v !== null ? String(v) : "—" }: {
  label: string;
  mine: number | null;
  theirs: number | null;
  format?: (v: number | null) => string;
}) {
  const mineNum = mine ?? 0;
  const theirsNum = theirs ?? 0;
  const mineAhead = mine !== null && theirs !== null && mineNum > theirsNum;
  const theyAhead = mine !== null && theirs !== null && theirsNum > mineNum;

  return (
    <div className="partner-stat-card">
      <div className="partner-stat-label">{label}</div>
      <div className="partner-stat-row">
        <div className={`partner-stat-val${mineAhead ? " partner-stat-val--winner" : ""}`}>
          {format(mine)}
          {mineAhead && <span className="partner-stat-badge">▲</span>}
        </div>
        <div className="partner-stat-vs">vs</div>
        <div className={`partner-stat-val partner-stat-val--partner${theyAhead ? " partner-stat-val--winner" : ""}`}>
          {theyAhead && <span className="partner-stat-badge">▲</span>}
          {format(theirs)}
        </div>
      </div>
    </div>
  );
}

export default function PartnerPage() {
  const { language } = useLanguage();
  const isNL = language !== "en";

  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [acting, setActing] = useState(false);
  const [optMsg, setOptMsg] = useState("");

  useEffect(() => {
    fetch("/api/me/partner")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setPartnerData(d))
      .catch(() => {});
  }, []);

  async function fetchSummary() {
    setLoadingSummary(true);
    try {
      const r = await fetch("/api/me/partner-summary");
      if (r.ok) setSummary(await r.json());
    } catch { /* ignore */ }
    finally { setLoadingSummary(false); }
  }

  async function toggleOptIn() {
    if (!partnerData || acting) return;
    setActing(true);
    const newOptIn = !partnerData.optedIn;
    try {
      const r = await fetch("/api/me/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn: newOptIn }),
      });
      if (r.ok) {
        setPartnerData(d => d ? { ...d, optedIn: newOptIn, partner: newOptIn ? d.partner : null } : d);
        setOptMsg(newOptIn
          ? (isNL ? "Je staat in de wachtrij voor een partner." : "You're in the queue for a partner.")
          : (isNL ? "Je bent uitgeschreven." : "You've opted out."));
      }
    } catch { /* ignore */ }
    finally { setActing(false); }
  }

  async function endPartnership() {
    if (!partnerData?.partner || acting) return;
    setActing(true);
    try {
      const r = await fetch("/api/me/partner", { method: "DELETE" });
      if (r.ok) {
        setPartnerData(d => d ? { ...d, partner: null } : d);
        setSummary(null);
      }
    } catch { /* ignore */ }
    finally { setActing(false); }
  }

  const partner = partnerData?.partner;
  const hasPartner = !!partner;
  const s = summary;

  return (
    <div className="partner-page">
      <div className="partner-header">
        <div>
          <h1 className="partner-title">🤝 {isNL ? "Accountability Partner" : "Accountability Partner"}</h1>
          <p className="partner-subtitle">
            {isNL
              ? "Marcus koppelt je anoniem aan een trader op jouw niveau. Jullie volgen elkaars voortgang."
              : "Marcus anonymously matches you with a trader at your level. Track each other's progress."}
          </p>
        </div>

        {/* Opt-in toggle */}
        <button
          onClick={toggleOptIn}
          disabled={acting}
          className={`partner-opt-btn${partnerData?.optedIn ? " partner-opt-btn--out" : ""}`}
        >
          {acting ? "…" : partnerData?.optedIn
            ? (isNL ? "Uitschrijven" : "Opt out")
            : (isNL ? "Meedoen" : "Join")}
        </button>
      </div>

      {optMsg && <div className="partner-opt-msg">{optMsg}</div>}

      {/* Geen opt-in */}
      {partnerData && !partnerData.optedIn && (
        <div className="partner-empty-card">
          <div className="partner-empty-icon">🤝</div>
          <div className="partner-empty-title">
            {isNL ? "Jij doet nog niet mee" : "You're not participating yet"}
          </div>
          <p className="partner-empty-text">
            {isNL
              ? "Marcus koppelt je anoniem aan een trader met vergelijkbaar niveau en trading stijl. Je ziet elkaars statistieken en krijgt wekelijks een vergelijking van Marcus."
              : "Marcus will anonymously match you with a trader at a similar level and style. You'll see each other's stats and get a weekly comparison from Marcus."}
          </p>
          <button onClick={toggleOptIn} disabled={acting} className="partner-opt-btn">
            {acting ? "…" : (isNL ? "Nu meedoen" : "Join now")}
          </button>
        </div>
      )}

      {/* Opt-in, wacht op match */}
      {partnerData?.optedIn && !hasPartner && (
        <div className="partner-waiting-card">
          <div className="partner-waiting-dot" />
          <div>
            <div className="partner-waiting-title">
              {isNL ? "Wachten op een match…" : "Waiting for a match…"}
            </div>
            <div className="partner-waiting-sub">
              {isNL
                ? "Marcus zoekt een geschikte partner op jouw niveau. Dit kan even duren."
                : "Marcus is looking for a suitable partner at your level. This may take a moment."}
            </div>
          </div>
        </div>
      )}

      {/* Actieve partnership */}
      {hasPartner && partner && (
        <>
          {/* Partner header */}
          <div className="partner-card">
            <div className="partner-card-header">
              <div className="partner-card-avatar">🤝</div>
              <div>
                <div className="partner-card-name">{partner.codename}</div>
                <div className="partner-card-meta">
                  {isNL ? "Gekoppeld" : "Matched"}: {new Date(partner.matchedAt).toLocaleDateString(isNL ? "nl-NL" : "en-GB")}
                </div>
              </div>
              <div className={`partner-active-badge${partner.active7d ? " partner-active-badge--on" : ""}`}>
                {partner.active7d ? (isNL ? "● Actief" : "● Active") : (isNL ? "○ Inactief" : "○ Inactive")}
              </div>
            </div>
          </div>

          {/* Vergelijking */}
          {s?.available && s.myStats && s.partnerStats && (
            <div className="partner-compare-section">
              <div className="partner-compare-header">
                <div className="partner-compare-label-me">{isNL ? "Jij" : "You"}</div>
                <div className="partner-compare-title">
                  {isNL ? "Vergelijking deze week" : "This week's comparison"}
                </div>
                <div className="partner-compare-label-partner">{s.partnerCodename}</div>
              </div>

              <div className="partner-stats-grid">
                <StatCard
                  label="Level"
                  mine={s.myStats.level}
                  theirs={s.partnerStats.level}
                  format={v => v !== null ? (LEVEL_LABELS[v] ?? `${v}`) : "—"}
                />
                <StatCard
                  label="XP"
                  mine={s.myStats.xp}
                  theirs={s.partnerStats.xp}
                  format={v => v !== null ? `${v}` : "—"}
                />
                <StatCard
                  label={isNL ? "Streak" : "Streak"}
                  mine={s.myStats.streak}
                  theirs={s.partnerStats.streak}
                  format={v => v !== null ? `${v}d` : "—"}
                />
                <StatCard
                  label={isNL ? "Winrate" : "Win rate"}
                  mine={s.myStats.winRate}
                  theirs={s.partnerStats.winRate}
                  format={v => v !== null ? `${v}%` : "—"}
                />
                <StatCard
                  label={isNL ? "Trades" : "Trades"}
                  mine={s.myStats.tradeCount}
                  theirs={s.partnerStats.tradeCount}
                />
                <StatCard
                  label="P&L"
                  mine={s.myStats.totalPnl}
                  theirs={s.partnerStats.totalPnl}
                  format={v => v !== null ? `€${v > 0 ? "+" : ""}${v}` : "—"}
                />
              </div>

              {/* Marcus samenvatting */}
              {s.summary && (
                <div className="partner-summary-card">
                  <div className="partner-summary-header">
                    <div className="partner-summary-avatar">M</div>
                    <span className="partner-summary-label">
                      {isNL ? "Marcus' analyse" : "Marcus's analysis"}
                    </span>
                  </div>
                  <p className="partner-summary-text">{s.summary}</p>
                </div>
              )}
            </div>
          )}

          {/* Laad samenvatting knop */}
          {!s?.available && (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button
                onClick={fetchSummary}
                disabled={loadingSummary}
                className="partner-analyse-btn"
              >
                {loadingSummary
                  ? (isNL ? "Marcus analyseert…" : "Marcus is analysing…")
                  : (isNL ? "🤖 Laad Marcus-vergelijking" : "🤖 Load Marcus comparison")}
              </button>
            </div>
          )}

          {/* Ontkoppelen */}
          <div className="partner-footer">
            <button onClick={endPartnership} disabled={acting} className="partner-end-btn">
              {acting ? "…" : (isNL ? "Partnership beëindigen" : "End partnership")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
