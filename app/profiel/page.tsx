"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SCAN_ASSETS } from "@/lib/assets";
import { useLanguage } from "@/contexts/LanguageContext";
import TrophyWall from "@/components/TrophyWall";
import ReferralCard from "@/components/ReferralCard";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Settings {
  startCapital: number;
  tradingMode: string;
  riskLevel: string;
}

interface QuizData {
  level: number;
  xp: number;
  streak: number;
  weakTopics: string[];
  history: QuizSession[];
}

interface QuizSession {
  id: number;
  date: string;
  score: number;
  total: number;
  topics: string[];
}

interface Trade {
  id: number;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  pnl?: number;
  createdAt: string;
}

interface PaperData {
  asset: string;
  cash: number;
  position: number | null;
  history: Trade[];
  startingBalance: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProfielPage() {
  const { t, lang } = useLanguage();
  const { data: session } = useSession();
  const username = (session?.user as { name?: string })?.name ?? t("profiel_role_user");
  const role = (session?.user as { role?: string })?.role ?? "user";

  const [settings, setSettings] = useState<Settings | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [papers, setPapers] = useState<PaperData[]>([]);
  const [loading, setLoading] = useState(true);

  // Partner state (C4)
  type PartnerStats = {
    partnershipId: number;
    codename: string;
    matchedAt: string;
    level: number;
    streak: number;
    winRate: number | null;
    tradeCount: number;
    active7d: boolean;
  };
  const [partnerOptedIn, setPartnerOptedIn] = useState(false);
  const [partner, setPartner] = useState<PartnerStats | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(true);
  const [partnerOptLoading, setPartnerOptLoading] = useState(false);

  // Trading plan state
  const [plan, setPlan] = useState<{
    rules: string; risk_per_trade: number; max_daily_loss: number;
    max_trades_per_day: number; preferred_assets: string;
    entry_rules: string; exit_rules: string; commitments: string;
  }>({ rules: "", risk_per_trade: 1, max_daily_loss: 3, max_trades_per_day: 3, preferred_assets: "", entry_rules: "", exit_rules: "", commitments: "" });
  const [planLoading, setPlanLoading] = useState(false);
  const [planStatus, setPlanStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Marcus profiel state (M4)
  const [marcusProfile, setMarcusProfile] = useState({
    goals: "", trading_style: "", risk_profile: "",
    strengths: "", weaknesses: "", fears: "",
    best_time_of_day: "", best_emotions: "", worst_emotions: "",
    impulse_patterns: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Password change state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwStatus, setPwStatus] = useState<{ type: "success" | "error"; msg: string } | null>(
    null
  );
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sRes, qRes] = await Promise.all([
          fetch("/api/me/settings"),
          fetch("/api/me/quiz"),
        ]);
        const [s, q, planRes] = await Promise.all([sRes.json(), qRes.json(), fetch("/api/me/trading-plan").then(r => r.json())]);
        if (!s.error) setSettings(s);
        if (!q.error) setQuiz(q);
        if (planRes && !planRes.error) setPlan(prev => ({ ...prev, ...planRes }));

        // Marcus profiel
        fetch("/api/me/profile").then(r => r.ok ? r.json() : null).then(p => {
          if (p) setMarcusProfile(prev => ({ ...prev, ...p }));
        }).catch(() => {});

        // Partner data
        fetch("/api/me/partner")
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (d) {
              setPartnerOptedIn(!!d.optedIn);
              setPartner(d.partner ?? null);
            }
          })
          .catch(() => {})
          .finally(() => setPartnerLoading(false));

        // Haal paper data op voor alle assets
        const paperResults = await Promise.all(
          SCAN_ASSETS.map(a =>
            fetch(`/api/me/paper?asset=${encodeURIComponent(a.symbol)}`)
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          )
        );
        const validPapers: PaperData[] = paperResults
          .map((p, i) => p && !p.error ? { ...p, asset: SCAN_ASSETS[i].symbol } : null)
          .filter(Boolean) as PaperData[];
        setPapers(validPapers);
      } catch {
        // silently fail — UI shows dashes
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function saveMarcusProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileStatus(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(marcusProfile),
      });
      if (res.ok) setProfileStatus({ type: "success", msg: "Profiel opgeslagen. Marcus gebruikt dit nu in elke coaching sessie." });
      else setProfileStatus({ type: "error", msg: "Opslaan mislukt." });
    } catch { setProfileStatus({ type: "error", msg: "Netwerkfout." }); }
    finally { setProfileLoading(false); }
  }

  async function togglePartnerOptIn() {
    setPartnerOptLoading(true);
    const next = !partnerOptedIn;
    try {
      const res = await fetch("/api/me/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn: next }),
      });
      if (res.ok) {
        setPartnerOptedIn(next);
        if (!next) setPartner(null);
      }
    } catch { /* ignore */ }
    finally { setPartnerOptLoading(false); }
  }

  async function endPartnership() {
    await fetch("/api/me/partner", { method: "DELETE" });
    setPartner(null);
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    setPlanLoading(true);
    setPlanStatus(null);
    try {
      const res = await fetch("/api/me/trading-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      if (res.ok) {
        setPlanStatus({ type: "success", msg: "Tradingplan opgeslagen. Marcus houdt jou hier nu aan." });
      } else {
        setPlanStatus({ type: "error", msg: "Opslaan mislukt. Probeer opnieuw." });
      }
    } catch {
      setPlanStatus({ type: "error", msg: "Netwerkfout. Probeer opnieuw." });
    } finally {
      setPlanLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwStatus(null);
    if (newPw !== confirmPw) {
      setPwStatus({ type: "error", msg: t("profiel_pw_mismatch") });
      return;
    }
    if (newPw.length < 8) {
      setPwStatus({ type: "error", msg: t("profiel_pw_too_short") });
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwStatus({ type: "success", msg: t("profiel_pw_success") });
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      } else {
        setPwStatus({ type: "error", msg: data.error ?? t("profiel_pw_error_generic") });
      }
    } catch {
      setPwStatus({ type: "error", msg: t("profiel_pw_network_error") });
    } finally {
      setPwLoading(false);
    }
  }

  // Paper stats — gecombineerd over alle assets
  const allTrades = papers.flatMap(p => p.history ?? []);
  const closedTrades = allTrades.filter((t) => t.pnl != null);
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const winTrades = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
  const winRate = closedTrades.length > 0 ? Math.round((winTrades.length / closedTrades.length) * 100) : 0;
  const totalCash = papers.reduce((sum, p) => sum + (p.cash ?? 0), 0);
  const activeAssets = papers.filter(p => (p.history?.length ?? 0) > 0).length;

  // XP bar
  const xpMax = (quiz?.level ?? 1) * 100;
  const xpPct = quiz ? Math.min(100, Math.round((quiz.xp / xpMax) * 100)) : 0;

  const last10 = quiz?.history?.slice(0, 10) ?? [];

  const dateLocale = lang === "nl" ? "nl-NL" : "en-GB";

  return (
    <div className="page-container page-narrow">
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={av}>
          {username.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="page-title" style={{ marginBottom: 0 }}>{username}</div>
          <span
            style={{
              display: "inline-block",
              background: role === "admin" ? "rgba(233,30,99,0.18)" : "rgba(255,255,255,0.07)",
              border: `1px solid ${role === "admin" ? "rgba(233,30,99,0.4)" : "rgba(255,255,255,0.12)"}`,
              color: role === "admin" ? "var(--primary)" : "var(--text-secondary)",
              borderRadius: 999,
              padding: "2px 12px",
              fontSize: 12,
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            {role === "admin" ? t("profiel_role_admin") : t("profiel_role_user")}
          </span>
        </div>
      </div>

      {!loading && (
        <>
          {/* ── Voortgang naar zelfstandig traden ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>🎯 Voortgang naar zelfstandig traden</div>
              <div style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700 }}>
                {Math.min(100, Math.round(
                  ((quiz?.level ?? 1) / 5 * 40) +
                  (Math.min(closedTrades.length, 20) / 20 * 30) +
                  (Math.min((quiz?.streak ?? 0), 7) / 7 * 30)
                ))}%
              </div>
            </div>
            <div style={{ height: 10, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, Math.round(
                  ((quiz?.level ?? 1) / 5 * 40) +
                  (Math.min(closedTrades.length, 20) / 20 * 30) +
                  (Math.min((quiz?.streak ?? 0), 7) / 7 * 30)
                ))}%`,
                background: "linear-gradient(90deg, #e91e63, #ff6090)",
                borderRadius: 999,
                transition: "width 0.6s",
              }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "var(--text-secondary)", flexWrap: "wrap" }}>
              <span>📚 Kennis: niveau {quiz?.level ?? 1}/5</span>
              <span>📊 Trades: {Math.min(closedTrades.length, 20)}/20</span>
              <span>🔥 Streak: {Math.min(quiz?.streak ?? 0, 7)}/7 dagen</span>
            </div>
          </div>

          {/* ── Referral ── */}
          <ReferralCard />

          {/* ── Trophy Wall ── */}
          <TrophyWall />

          {/* ── Accountability Partner (C4) ── */}
          {!partnerLoading && (
            <div className="card" style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>🤝</span>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Accountability Partner</div>
                {partner && (
                  <span style={{
                    marginLeft: "auto", fontSize: 11, background: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.3)", color: "var(--green)",
                    borderRadius: 999, padding: "2px 10px", fontWeight: 600,
                  }}>Gekoppeld</span>
                )}
              </div>

              {!partnerOptedIn && !partner && (
                <div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 14px", lineHeight: 1.6 }}>
                    Marcus koppelt je aan een andere trader op jouw niveau. Je ziet elkaars anonieme statistieken — anoniem, motiverend, eerlijk. Samen groeien jullie sneller.
                  </p>
                  <button
                    onClick={togglePartnerOptIn}
                    disabled={partnerOptLoading}
                    style={{
                      background: "var(--primary)", color: "var(--text)", border: "none",
                      borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600,
                      cursor: partnerOptLoading ? "not-allowed" : "pointer",
                      opacity: partnerOptLoading ? 0.7 : 1,
                    }}
                  >
                    {partnerOptLoading ? "Even wachten…" : "Koppel me aan een partner"}
                  </button>
                </div>
              )}

              {partnerOptedIn && !partner && (
                <div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.5 }}>
                    ⏳ Marcus is op zoek naar een goede match voor je. Dit kan tot 24 uur duren. Kom later terug!
                  </p>
                  <button
                    onClick={togglePartnerOptIn}
                    disabled={partnerOptLoading}
                    style={{
                      background: "transparent", color: "var(--text-muted)",
                      border: "1px solid var(--border)", borderRadius: 8,
                      padding: "7px 14px", fontSize: 12, cursor: "pointer",
                    }}
                  >
                    Afmelden
                  </button>
                </div>
              )}

              {partner && (
                <div>
                  {/* Partner avatar + naam */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "rgba(233,30,99,0.15)", border: "1px solid rgba(233,30,99,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 700, color: "var(--primary)", flexShrink: 0,
                    }}>
                      {partner.codename.slice(0, 1)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{partner.codename}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Gekoppeld op {new Date(partner.matchedAt).toLocaleDateString("nl-NL")}
                        {partner.active7d && " · 🟢 actief deze week"}
                      </div>
                    </div>
                  </div>

                  {/* Vergelijking stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                    {[
                      { label: "Level", mine: String(quiz?.level ?? 1), theirs: String(partner.level) },
                      { label: "Streak", mine: `${quiz?.streak ?? 0}d`, theirs: `${partner.streak}d` },
                      { label: "Win rate", mine: closedTrades.length > 0 ? `${winRate}%` : "—", theirs: partner.winRate != null ? `${partner.winRate}%` : "—" },
                      { label: "Trades", mine: String(closedTrades.length), theirs: String(partner.tradeCount) },
                    ].map(({ label, mine, theirs }) => (
                      <div key={label} style={{
                        background: "var(--surface-2)", borderRadius: 10, padding: "10px 12px",
                        border: "1px solid var(--border)",
                      }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{mine}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>vs</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--primary)" }}>{theirs}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                          <span>jij</span><span>partner</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={endPartnership}
                      style={{
                        background: "transparent", color: "var(--text-muted)",
                        border: "1px solid var(--border)", borderRadius: 8,
                        padding: "7px 14px", fontSize: 12, cursor: "pointer",
                      }}
                    >
                      Koppeling verbreken
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Brokers link ── */}
          <Link href="/brokers" style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "14px 16px", textDecoration: "none",
          }}>
            <span style={{ fontSize: 22 }}>🏦</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Platforms & Brokers</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Waar kun je écht traden? Overzicht van 14 platforms.</div>
            </div>
            <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 14 }}>→</span>
          </Link>
        </>
      )}

      {loading ? (
        <div style={{ color: "var(--text-secondary)", padding: "24px 0" }}>{t("profiel_loading")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Persoonlijk tradingplan ── */}
          <div className="card">
            <div style={sectionTitle}>📋 Persoonlijk Tradingplan</div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "8px 0 16px", lineHeight: 1.5 }}>
              Marcus gebruikt dit plan om jou te coachen. Als je een trade wil doen die niet klopt met je eigen regels, zal hij je direct aanspreken.
            </p>
            <form onSubmit={savePlan} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 140, ...fieldGroup }}>
                  <label style={labelStyle}>Max risico per trade (%)</label>
                  <input
                    type="number" min={0.1} max={10} step={0.1}
                    value={plan.risk_per_trade}
                    onChange={e => setPlan(p => ({ ...p, risk_per_trade: parseFloat(e.target.value) || 1 }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 140, ...fieldGroup }}>
                  <label style={labelStyle}>Max dagverlies (%)</label>
                  <input
                    type="number" min={0.5} max={20} step={0.5}
                    value={plan.max_daily_loss}
                    onChange={e => setPlan(p => ({ ...p, max_daily_loss: parseFloat(e.target.value) || 3 }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 140, ...fieldGroup }}>
                  <label style={labelStyle}>Max trades per dag</label>
                  <input
                    type="number" min={1} max={20} step={1}
                    value={plan.max_trades_per_day}
                    onChange={e => setPlan(p => ({ ...p, max_trades_per_day: parseInt(e.target.value) || 3 }))}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Voorkeur assets (bijv. BTC, ETH, SOL)</label>
                <input
                  type="text" placeholder="BTC, ETH"
                  value={plan.preferred_assets}
                  onChange={e => setPlan(p => ({ ...p, preferred_assets: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Mijn entry-regels (wanneer stap ik IN?)</label>
                <textarea
                  rows={3} placeholder="Bijv: Alleen entries na bevestiging op 4H, RSI onder 40, boven weekly support..."
                  value={plan.entry_rules}
                  onChange={e => setPlan(p => ({ ...p, entry_rules: e.target.value }))}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Mijn exit-regels (wanneer stap ik UIT?)</label>
                <textarea
                  rows={3} placeholder="Bijv: Stop-loss altijd instellen voor entry, winst nemen bij 2R, geen nacht aanhouden..."
                  value={plan.exit_rules}
                  onChange={e => setPlan(p => ({ ...p, exit_rules: e.target.value }))}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Mijn trading regels (wat zijn mijn vaste regels?)</label>
                <textarea
                  rows={3} placeholder="Bijv: Geen trades als ik emotioneel ben, geen revenge trading, altijd stop-loss..."
                  value={plan.rules}
                  onChange={e => setPlan(p => ({ ...p, rules: e.target.value }))}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Mijn beloften aan mezelf</label>
                <textarea
                  rows={2} placeholder="Bijv: Ik stop als ik mijn dagverlies bereikt heb. Ik log elke trade in het journaal..."
                  value={plan.commitments}
                  onChange={e => setPlan(p => ({ ...p, commitments: e.target.value }))}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              {planStatus && (
                <div style={{
                  padding: "9px 14px", borderRadius: 8, fontSize: 13,
                  background: planStatus.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  color: planStatus.type === "success" ? "var(--green)" : "var(--red)",
                  border: `1px solid ${planStatus.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                }}>
                  {planStatus.msg}
                </div>
              )}
              <div>
                <button
                  type="submit"
                  disabled={planLoading}
                  style={{
                    background: "var(--primary)", color: "var(--text)", border: "none",
                    borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600,
                    cursor: planLoading ? "not-allowed" : "pointer",
                    opacity: planLoading ? 0.7 : 1,
                  }}
                >
                  {planLoading ? "Opslaan…" : "Tradingplan opslaan"}
                </button>
              </div>
            </form>
          </div>

          {/* ── Marcus Profiel (M4) ── */}
          <div className="card">
            <div style={sectionTitle}>🧠 Marcus Profiel</div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "8px 0 16px", lineHeight: 1.5 }}>
              Hoe beter Marcus jou kent, hoe persoonlijker zijn coaching. Dit profiel wordt geladen bij elk gesprek.
            </p>
            <form onSubmit={saveMarcusProfile} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180, ...fieldGroup }}>
                  <label style={labelStyle}>Handelsstijl</label>
                  <select
                    value={marcusProfile.trading_style}
                    onChange={e => setMarcusProfile(p => ({ ...p, trading_style: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">Kies stijl…</option>
                    <option value="day">Day trading</option>
                    <option value="swing">Swing trading</option>
                    <option value="long">Long term</option>
                    <option value="mixed">Mix van stijlen</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 180, ...fieldGroup }}>
                  <label style={labelStyle}>Risicoprofiel</label>
                  <select
                    value={marcusProfile.risk_profile}
                    onChange={e => setMarcusProfile(p => ({ ...p, risk_profile: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">Kies profiel…</option>
                    <option value="conservatief">Conservatief (1% per trade)</option>
                    <option value="matig">Matig (1–2% per trade)</option>
                    <option value="agressief">Agressief (2–5% per trade)</option>
                  </select>
                </div>
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Mijn tradingdoelen (wat wil ik bereiken?)</label>
                <textarea rows={2} placeholder="Bijv: Consistent 5% per maand, uiteindelijk full-time trader worden, pensioen opbouwen…"
                  value={marcusProfile.goals}
                  onChange={e => setMarcusProfile(p => ({ ...p, goals: e.target.value }))}
                  style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200, ...fieldGroup }}>
                  <label style={labelStyle}>Mijn sterke punten als trader</label>
                  <textarea rows={2} placeholder="Bijv: Geduldig, goede analyse, kalm onder druk…"
                    value={marcusProfile.strengths}
                    onChange={e => setMarcusProfile(p => ({ ...p, strengths: e.target.value }))}
                    style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                <div style={{ flex: 1, minWidth: 200, ...fieldGroup }}>
                  <label style={labelStyle}>Mijn zwakke punten</label>
                  <textarea rows={2} placeholder="Bijv: FOMO, te vroeg uitstappen, stop-loss aanpassen…"
                    value={marcusProfile.weaknesses}
                    onChange={e => setMarcusProfile(p => ({ ...p, weaknesses: e.target.value }))}
                    style={{ ...inputStyle, resize: "vertical" }} />
                </div>
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Mijn angsten bij het traden</label>
                <textarea rows={2} placeholder="Bijv: Bang om te veel te verliezen, bang om kansen te missen, bang om fout te zitten…"
                  value={marcusProfile.fears}
                  onChange={e => setMarcusProfile(p => ({ ...p, fears: e.target.value }))}
                  style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180, ...fieldGroup }}>
                  <label style={labelStyle}>Beste tijd om te traden</label>
                  <input type="text" placeholder="Bijv: Ochtend 9–12u, avond na 20u…"
                    value={marcusProfile.best_time_of_day}
                    onChange={e => setMarcusProfile(p => ({ ...p, best_time_of_day: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div style={{ flex: 1, minWidth: 180, ...fieldGroup }}>
                  <label style={labelStyle}>Impulspatronen (wanneer doe ik domme trades?)</label>
                  <input type="text" placeholder="Bijv: Na verlies, laat op avond, als markt snel beweegt…"
                    value={marcusProfile.impulse_patterns}
                    onChange={e => setMarcusProfile(p => ({ ...p, impulse_patterns: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>
              {profileStatus && (
                <div style={{
                  padding: "9px 14px", borderRadius: 8, fontSize: 13,
                  background: profileStatus.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  color: profileStatus.type === "success" ? "var(--green)" : "var(--red)",
                  border: `1px solid ${profileStatus.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                }}>{profileStatus.msg}</div>
              )}
              <div>
                <button type="submit" disabled={profileLoading} style={{
                  background: "var(--primary)", color: "var(--text)", border: "none",
                  borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600,
                  cursor: profileLoading ? "not-allowed" : "pointer", opacity: profileLoading ? 0.7 : 1,
                }}>
                  {profileLoading ? "Opslaan…" : "Profiel opslaan"}
                </button>
              </div>
            </form>
          </div>

          {/* ── Wachtwoord wijzigen ── */}
          <div className="card">
            <div style={sectionTitle}>{t("profiel_pw_title")}</div>
            <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
              <div style={fieldGroup}>
                <label style={labelStyle}>{t("profiel_pw_current")}</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  style={inputStyle}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>{t("profiel_pw_new")}</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  style={inputStyle}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>{t("profiel_pw_confirm")}</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  style={inputStyle}
                  autoComplete="new-password"
                  required
                />
              </div>
              {pwStatus && (
                <div
                  style={{
                    padding: "9px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    background:
                      pwStatus.type === "success"
                        ? "rgba(34,197,94,0.12)"
                        : "rgba(239,68,68,0.12)",
                    color: pwStatus.type === "success" ? "var(--green)" : "var(--red)",
                    border: `1px solid ${pwStatus.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                  }}
                >
                  {pwStatus.msg}
                </div>
              )}
              <div>
                <button
                  type="submit"
                  disabled={pwLoading}
                  style={{
                    background: "var(--primary)",
                    color: "var(--text)",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: pwLoading ? "not-allowed" : "pointer",
                    opacity: pwLoading ? 0.7 : 1,
                  }}
                >
                  {pwLoading ? t("profiel_pw_saving") : t("profiel_pw_save")}
                </button>
              </div>
            </form>
          </div>

          {/* ── Quiz stats ── */}
          <div className="card">
            <div style={sectionTitle}>{t("profiel_quiz_title")}</div>
            {quiz ? (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <Stat label="Level" value={String(quiz.level)} />
                  <Stat label="XP" value={`${quiz.xp} / ${xpMax}`} />
                  <Stat label="Streak" value={`${quiz.streak} ${quiz.streak !== 1 ? t("profiel_quiz_streak_plural") : t("profiel_quiz_streak")}`} />
                </div>
                {/* XP bar */}
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                    {t("profiel_quiz_xp_progress")} {quiz.level + 1}
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: "rgba(233,30,99,0.12)",
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${xpPct}%`,
                        background: "var(--primary)",
                        borderRadius: 999,
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                </div>
                {/* Weak topics */}
                {quiz.weakTopics && quiz.weakTopics.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                      {t("profiel_quiz_weak")}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {quiz.weakTopics.map((topic) => (
                        <span
                          key={topic}
                          style={{
                            background: "rgba(233,30,99,0.1)",
                            border: "1px solid rgba(233,30,99,0.25)",
                            color: "var(--primary)",
                            borderRadius: 999,
                            padding: "3px 11px",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: "var(--text-secondary)", marginTop: 12, fontSize: 13 }}>
                {t("profiel_quiz_empty")}
              </div>
            )}
          </div>

          {/* ── Quiz history ── */}
          {last10.length > 0 && (
            <div className="card">
              <div style={sectionTitle}>{t("profiel_history_title")}</div>
              <div style={{ marginTop: 14, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: "var(--text-secondary)" }}>
                      <th style={th}>{t("profiel_history_date")}</th>
                      <th style={th}>{t("profiel_history_score")}</th>
                      <th style={th}>{t("profiel_history_topics")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {last10.map((s, i) => (
                      <tr key={s.id ?? i} style={{ borderTop: "1px solid rgba(233,30,99,0.1)" }}>
                        <td style={td}>{new Date(s.date).toLocaleDateString(dateLocale)}</td>
                        <td style={td}>
                          <span
                            style={{
                              color:
                                s.score / s.total >= 0.7 ? "var(--green)" : "var(--red)",
                              fontWeight: 600,
                            }}
                          >
                            {s.score}/{s.total}
                          </span>
                        </td>
                        <td style={td}>
                          {(s.topics ?? []).join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Paper trading summary ── */}
          <div className="card">
            <div style={sectionTitle}>{t("profiel_paper_title")}</div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 14 }}>
              <Stat
                label={t("profiel_paper_pnl")}
                value={`€${totalPnl.toLocaleString(dateLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                color={totalPnl >= 0 ? "var(--green)" : "var(--red)"}
              />
              <Stat label={t("profiel_paper_winrate")} value={closedTrades.length > 0 ? `${winRate}%` : "—"} />
              <Stat label={t("profiel_paper_trades")} value={String(closedTrades.length)} />
              <Stat label={t("profiel_paper_active")} value={String(activeAssets)} />
              {totalCash > 0 && (
                <Stat
                  label={t("profiel_paper_cash")}
                  value={`€${totalCash.toLocaleString(dateLocale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                />
              )}
            </div>
          </div>

          {/* ── Exporteren ── */}
          <div className="card">
            <div style={sectionTitle}>{t("profiel_export_title")}</div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "10px 0 16px" }}>
              {t("profiel_export_desc")}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href="/api/me/export?type=trades"
                download="bitcoin-mentor-trades.csv"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(233,30,99,0.12)", border: "1px solid rgba(233,30,99,0.3)",
                  borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600,
                  color: "var(--primary)", textDecoration: "none", cursor: "pointer",
                }}
              >
                📥 {t("profiel_export_trades")}
              </a>
              <a
                href="/api/me/export?type=journal"
                download="bitcoin-mentor-journal.csv"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(233,30,99,0.07)", border: "1px solid rgba(233,30,99,0.2)",
                  borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600,
                  color: "var(--text-secondary)", textDecoration: "none", cursor: "pointer",
                }}
              >
                📓 {t("profiel_export_journal")}
              </a>
            </div>
          </div>

          {/* ── Instellingen samenvatting ── */}
          <div className="card">
            <div style={sectionTitle}>{t("profiel_settings_title")}</div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 14 }}>
              <Stat label={t("profiel_settings_mode")} value={settings?.tradingMode ?? "—"} />
              <Stat label={t("profiel_settings_risk")} value={settings?.riskLevel ?? "—"} />
              <Stat
                label={t("profiel_settings_capital")}
                value={
                  settings?.startCapital != null
                    ? `$${settings.startCapital.toLocaleString(dateLocale)}`
                    : "—"
                }
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ minWidth: 100 }}>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? "var(--text)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

const av: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: "50%",
  background: "rgba(233,30,99,0.18)",
  border: "1px solid rgba(233,30,99,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  fontWeight: 700,
  color: "var(--primary)",
  flexShrink: 0,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "var(--text)",
  borderBottom: "1px solid rgba(233,30,99,0.15)",
  paddingBottom: 10,
};

const fieldGroup: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-secondary)",
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(233,30,99,0.22)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
  width: "100%",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  fontWeight: 500,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const td: React.CSSProperties = {
  padding: "8px 8px",
  color: "var(--text)",
};
