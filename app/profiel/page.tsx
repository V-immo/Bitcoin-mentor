"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { SCAN_ASSETS } from "@/lib/assets";

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
  const { data: session } = useSession();
  const username = (session?.user as { name?: string })?.name ?? "Gebruiker";
  const role = (session?.user as { role?: string })?.role ?? "user";

  const [settings, setSettings] = useState<Settings | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [papers, setPapers] = useState<PaperData[]>([]);
  const [loading, setLoading] = useState(true);

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
        const [s, q] = await Promise.all([sRes.json(), qRes.json()]);
        if (!s.error) setSettings(s);
        if (!q.error) setQuiz(q);

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

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwStatus(null);
    if (newPw !== confirmPw) {
      setPwStatus({ type: "error", msg: "Nieuwe wachtwoorden komen niet overeen" });
      return;
    }
    if (newPw.length < 8) {
      setPwStatus({ type: "error", msg: "Wachtwoord moet minimaal 8 tekens zijn" });
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
        setPwStatus({ type: "success", msg: "Wachtwoord succesvol gewijzigd" });
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      } else {
        setPwStatus({ type: "error", msg: data.error ?? "Er is een fout opgetreden" });
      }
    } catch {
      setPwStatus({ type: "error", msg: "Netwerkfout" });
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

  return (
    <div className="container-page" style={{ maxWidth: 760 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={av}>
          {username.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fce8f0" }}>{username}</div>
          <span
            style={{
              display: "inline-block",
              background: role === "admin" ? "rgba(233,30,99,0.18)" : "rgba(255,255,255,0.07)",
              border: `1px solid ${role === "admin" ? "rgba(233,30,99,0.4)" : "rgba(255,255,255,0.12)"}`,
              color: role === "admin" ? "#e91e63" : "#bf7a99",
              borderRadius: 999,
              padding: "2px 12px",
              fontSize: 12,
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            {role === "admin" ? "Admin" : "Gebruiker"}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "#bf7a99", padding: "24px 0" }}>Laden...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Wachtwoord wijzigen ── */}
          <div className="card">
            <div style={sectionTitle}>Wachtwoord wijzigen</div>
            <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
              <div style={fieldGroup}>
                <label style={labelStyle}>Huidig wachtwoord</label>
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
                <label style={labelStyle}>Nieuw wachtwoord</label>
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
                <label style={labelStyle}>Bevestig nieuw wachtwoord</label>
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
                    color: pwStatus.type === "success" ? "#86efac" : "#fca5a5",
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
                    background: "#e91e63",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: pwLoading ? "not-allowed" : "pointer",
                    opacity: pwLoading ? 0.7 : 1,
                  }}
                >
                  {pwLoading ? "Bezig..." : "Opslaan"}
                </button>
              </div>
            </form>
          </div>

          {/* ── Quiz stats ── */}
          <div className="card">
            <div style={sectionTitle}>Quiz statistieken</div>
            {quiz ? (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <Stat label="Level" value={String(quiz.level)} />
                  <Stat label="XP" value={`${quiz.xp} / ${xpMax}`} />
                  <Stat label="Streak" value={`${quiz.streak} dag${quiz.streak !== 1 ? "en" : ""}`} />
                </div>
                {/* XP bar */}
                <div>
                  <div style={{ fontSize: 12, color: "#bf7a99", marginBottom: 6 }}>
                    XP voortgang naar level {quiz.level + 1}
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
                        background: "#e91e63",
                        borderRadius: 999,
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                </div>
                {/* Weak topics */}
                {quiz.weakTopics && quiz.weakTopics.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, color: "#bf7a99", marginBottom: 8 }}>
                      Verbeterpunten
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {quiz.weakTopics.map((t) => (
                        <span
                          key={t}
                          style={{
                            background: "rgba(233,30,99,0.1)",
                            border: "1px solid rgba(233,30,99,0.25)",
                            color: "#e91e63",
                            borderRadius: 999,
                            padding: "3px 11px",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: "#bf7a99", marginTop: 12, fontSize: 13 }}>
                Nog geen quiz data beschikbaar.
              </div>
            )}
          </div>

          {/* ── Quiz history ── */}
          {last10.length > 0 && (
            <div className="card">
              <div style={sectionTitle}>Recente quiz sessies</div>
              <div style={{ marginTop: 14, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: "#bf7a99" }}>
                      <th style={th}>Datum</th>
                      <th style={th}>Score</th>
                      <th style={th}>Onderwerpen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {last10.map((s, i) => (
                      <tr key={s.id ?? i} style={{ borderTop: "1px solid rgba(233,30,99,0.1)" }}>
                        <td style={td}>{new Date(s.date).toLocaleDateString("nl-NL")}</td>
                        <td style={td}>
                          <span
                            style={{
                              color:
                                s.score / s.total >= 0.7 ? "#86efac" : "#fca5a5",
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
            <div style={sectionTitle}>Paper trading — alle assets</div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 14 }}>
              <Stat
                label="Totaal P&L"
                value={`€${totalPnl.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                color={totalPnl >= 0 ? "#86efac" : "#fca5a5"}
              />
              <Stat label="Winrate" value={closedTrades.length > 0 ? `${winRate}%` : "—"} />
              <Stat label="Trades" value={String(closedTrades.length)} />
              <Stat label="Actieve assets" value={String(activeAssets)} />
              {totalCash > 0 && (
                <Stat
                  label="Totaal cash"
                  value={`€${totalCash.toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                />
              )}
            </div>
          </div>

          {/* ── Instellingen samenvatting ── */}
          <div className="card">
            <div style={sectionTitle}>Instellingen</div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 14 }}>
              <Stat label="Trading modus" value={settings?.tradingMode ?? "—"} />
              <Stat label="Risiconiveau" value={settings?.riskLevel ?? "—"} />
              <Stat
                label="Startkapitaal"
                value={
                  settings?.startCapital != null
                    ? `$${settings.startCapital.toLocaleString("nl-NL")}`
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
      <div style={{ fontSize: 11, color: "#bf7a99", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? "#fce8f0", fontVariantNumeric: "tabular-nums" }}>
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
  color: "#e91e63",
  flexShrink: 0,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#fce8f0",
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
  color: "#bf7a99",
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(233,30,99,0.22)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "#fce8f0",
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
  color: "#fce8f0",
};
