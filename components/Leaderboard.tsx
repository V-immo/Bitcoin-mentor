"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Medal, Shield, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

type LeaderboardEntry = {
  rank: number;
  displayName: string;
  totalPnl: number;
  pnlPct: number;
  totalTrades: number;
  winRate: number;
  maxDrawdown: number;
  level: number;
  score: number;
  isMe: boolean;
};

type MyPosition = {
  rank: number;
  totalPnl: number;
  pnlPct: number;
  totalTrades: number;
  winRate: number;
  maxDrawdown: number;
  score: number;
  level: number;
  isOptIn: boolean;
  displayName: string;
};

type SortMode = "score" | "pnl" | "winrate";

const MEDAL_COLORS: Record<number, string> = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" };

const SORT_OPTIONS: { key: SortMode; label: string; desc: string }[] = [
  { key: "score",   label: "Risicoscore",  desc: "Combinatie: winrate, P&L%, ervaring, drawdown" },
  { key: "pnl",     label: "Totaal P&L",   desc: "Absolute winst/verlies in USD" },
  { key: "winrate", label: "Winrate",       desc: "% winstgevende trades (min. 3 trades)" },
];

function ScoreBar({ value }: { value: number }) {
  const color = value >= 65 ? "#22c55e" : value >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 50, height: 5, background: "var(--surface)", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function OptInPanel({ onSaved }: { onSaved: () => void }) {
  const [optIn, setOptIn]         = useState(false);
  const [displayName, setName]    = useState("");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [expanded, setExpanded]   = useState(false);

  useEffect(() => {
    fetch("/api/me/leaderboard-opt")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setOptIn(d.optIn); setName(d.displayName); } })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/me/leaderboard-opt", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optIn, displayName }),
    }).catch(() => {});
    setSaving(false);
    onSaved();
    setExpanded(false);
  }

  if (loading) return null;

  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={13} color="var(--accent)" />
          <span style={{ fontSize: 12, fontWeight: 600 }}>
            {optIn ? "Zichtbaar op leaderboard" : "Niet zichtbaar op leaderboard"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: optIn ? "#22c55e" : "var(--text-secondary)" }} />
          {expanded ? <ChevronUp size={13} color="var(--text-secondary)" /> : <ChevronDown size={13} color="var(--text-secondary)" />}
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border)" }}>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Meedoen aan leaderboard</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Jouw P&L wordt publiek zichtbaar (paper trading)</div>
            </div>
            <button
              onClick={() => setOptIn(o => !o)}
              style={{
                width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                background: optIn ? "var(--accent)" : "var(--border)",
                position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}
            >
              <span style={{ position: "absolute", top: 2, left: optIn ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", display: "block" }} />
            </button>
          </div>
          {optIn && (
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                Weergavenaam (max 30 tekens)
              </label>
              <input
                value={displayName}
                onChange={e => setName(e.target.value.slice(0, 30))}
                placeholder="Kies een schuilnaam…"
                style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          )}
          <button
            onClick={save}
            disabled={saving}
            style={{ marginTop: 10, padding: "7px 18px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const { t, lang } = useLanguage();
  const [entries, setEntries]     = useState<LeaderboardEntry[]>([]);
  const [myPos, setMyPos]         = useState<MyPosition | null>(null);
  const [sort, setSort]           = useState<SortMode>("score");
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isNL = lang === "nl";

  async function fetchData(s: SortMode = sort) {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?sort=${s}`);
      if (res.ok) {
        const d = await res.json();
        setEntries(d.entries ?? []);
        setMyPos(d.myPosition ?? null);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(sort); }, [sort]);  // eslint-disable-line react-hooks/exhaustive-deps

  const sortDef = SORT_OPTIONS.find(s => s.key === sort)!;

  return (
    <div>
      {/* Jouw opt-in status */}
      <OptInPanel onSaved={() => fetchData(sort)} />

      {/* Jouw positie */}
      {myPos && (
        <div style={{ background: "rgba(99,102,241,0.07)", border: "1px solid var(--accent)", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={12} color="var(--accent)" />
            {isNL ? "Jouw positie" : "Your position"}
            {!myPos.isOptIn && (
              <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                ({isNL ? "niet zichtbaar voor anderen" : "not visible to others"})
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { label: isNL ? "Rang" : "Rank",       value: `#${myPos.rank}` },
              { label: "Score",                       value: myPos.score, isScore: true },
              { label: "P&L",                         value: `${myPos.pnlPct >= 0 ? "+" : ""}${myPos.pnlPct}%`, color: myPos.pnlPct >= 0 ? "#22c55e" : "#ef4444" },
              { label: isNL ? "Winrate" : "Win rate", value: `${myPos.winRate}%` },
              { label: isNL ? "Trades" : "Trades",    value: myPos.totalTrades },
              { label: "Max DD",                      value: `${myPos.maxDrawdown}%`, color: myPos.maxDrawdown > 20 ? "#ef4444" : undefined },
            ].map(item => (
              <div key={item.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{item.label}</div>
                {(item as {isScore?: boolean}).isScore
                  ? <ScoreBar value={item.value as number} />
                  : <div style={{ fontSize: 14, fontWeight: 700, color: (item as {color?: string}).color ?? "var(--text-primary)" }}>{item.value}</div>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header + sorteertabs */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Shield size={14} color="#22c55e" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              {isNL ? "Community leaderboard" : "Community Leaderboard"}
            </span>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>
            {isNL
              ? "Alleen server-geverifieerde paper trades — niet zelf-gerapporteerd"
              : "Server-verified paper trades only — not self-reported"}
          </div>
        </div>
        <button onClick={() => fetchData(sort)} disabled={loading} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 11, color: "var(--text-secondary)" }}>
          ↻
        </button>
      </div>

      {/* Sort tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            title={opt.desc}
            style={{
              padding: "5px 12px", borderRadius: 20, border: "1px solid var(--border)",
              background: sort === opt.key ? "var(--accent)" : "transparent",
              color: sort === opt.key ? "#fff" : "var(--text-secondary)",
              cursor: "pointer", fontSize: 11, fontWeight: sort === opt.key ? 700 : 400, transition: "all 0.15s",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 10 }}>
        {sortDef.desc}
      </div>

      {/* Tabel */}
      {entries.length === 0 && !loading ? (
        <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--text-secondary)", fontSize: 13, border: "1px solid var(--border)", borderRadius: 10 }}>
          <Shield size={24} style={{ marginBottom: 8, opacity: 0.3 }} />
          <div style={{ marginBottom: 4 }}>{isNL ? "Nog geen deelnemers." : "No participants yet."}</div>
          <div style={{ fontSize: 11 }}>
            {isNL ? "Koppel je account hierboven en maak min. 3 paper trades." : "Opt in above and make at least 3 paper trades."}
          </div>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                {["#", isNL ? "Trader" : "Trader", "Score", "P&L%", isNL ? "Winrate" : "Win%", isNL ? "Trades" : "Trades", "Max DD", "Lvl"].map(h => (
                  <th key={h} style={{ padding: "7px 8px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && entries.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} style={{ padding: "9px 8px" }}>
                        <div style={{ height: 10, width: [20, 80, 40, 40, 40, 30, 35, 20][j], borderRadius: 4, background: "var(--surface-2)", opacity: 0.5 }} />
                      </td>
                    ))}
                  </tr>
                ))
                : entries.map((e, i) => (
                  <tr key={i} style={{ borderBottom: i < entries.length - 1 ? "1px solid var(--border)" : "none", background: e.isMe ? "rgba(99,102,241,0.06)" : "transparent" }}>
                    <td style={{ padding: "8px 8px" }}>
                      {MEDAL_COLORS[e.rank]
                        ? <Medal size={15} color={MEDAL_COLORS[e.rank]} />
                        : <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{e.rank}</span>}
                    </td>
                    <td style={{ padding: "8px 8px", fontWeight: 600, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.displayName}
                      {e.isMe && <span style={{ marginLeft: 5, fontSize: 9, background: "var(--accent)", color: "#fff", padding: "1px 5px", borderRadius: 8, verticalAlign: "middle" }}>jij</span>}
                    </td>
                    <td style={{ padding: "8px 8px" }}><ScoreBar value={e.score} /></td>
                    <td style={{ padding: "8px 8px", fontWeight: 600, color: e.pnlPct >= 0 ? "#22c55e" : "#ef4444" }}>
                      {e.pnlPct >= 0 ? "+" : ""}{e.pnlPct}%
                    </td>
                    <td style={{ padding: "8px 8px", color: e.winRate >= 60 ? "#22c55e" : e.winRate >= 45 ? "#f59e0b" : "#ef4444" }}>
                      {e.winRate}%
                    </td>
                    <td style={{ padding: "8px 8px", color: "var(--text-secondary)" }}>{e.totalTrades}</td>
                    <td style={{ padding: "8px 8px", color: e.maxDrawdown > 20 ? "#ef4444" : "var(--text-secondary)" }}>
                      {e.maxDrawdown}%
                    </td>
                    <td style={{ padding: "8px 8px" }}>
                      <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: 8, background: "var(--surface-2)", fontSize: 10, fontWeight: 700, color: "var(--accent)" }}>{e.level}</span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Verified badge uitleg */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 10, color: "var(--text-secondary)" }}>
        <Shield size={11} color="#22c55e" />
        {isNL
          ? "Alle data komt direct uit de server — nooit handmatig ingevoerd of aangepast"
          : "All data comes directly from the server — never manually entered or modified"}
        {lastUpdated && (
          <span style={{ marginLeft: "auto" }}>
            {lastUpdated.toLocaleTimeString(isNL ? "nl-BE" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}
