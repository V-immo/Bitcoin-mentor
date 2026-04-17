"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";

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

const LEVEL_LABELS = ["", "Beginner", "Lerende", "Bewuste Trader", "Gedisciplineerde", "Pro"];
const LEVEL_COLORS = ["", "var(--text-muted)", "#3b82f6", "var(--orange)", "var(--primary)", "#a78bfa"];

function matchedAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "vandaag gekoppeld";
  if (days === 1) return "gisteren gekoppeld";
  return `${days} dagen geleden gekoppeld`;
}

export default function AccountabilityPartner() {
  const [data, setData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    fetch("/api/me/partner")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleOptIn() {
    if (!data || acting) return;
    setActing(true);
    const newOptIn = !data.optedIn;
    try {
      const r = await fetch("/api/me/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn: newOptIn }),
      });
      if (r.ok) setData(d => d ? { ...d, optedIn: newOptIn, partner: newOptIn ? d.partner : null } : d);
      else toast("Opslaan mislukt. Probeer opnieuw.", "error");
    } catch { toast("Verbindingsfout.", "error"); } finally { setActing(false); }
  }

  async function endPartnership() {
    if (!data?.partner || acting) return;
    setActing(true);
    try {
      const r = await fetch("/api/me/partner", { method: "DELETE" });
      if (r.ok) setData(d => d ? { ...d, partner: null } : d);
      else toast("Verwijderen mislukt. Probeer opnieuw.", "error");
    } catch { toast("Verbindingsfout.", "error"); } finally { setActing(false); }
  }

  function askMarcus() {
    if (!data?.partner) return;
    const p = data.partner;
    const msg = `[ACCOUNTABILITY PARTNER VERGELIJKING]\n\nMijn partner "${p.codename}" heeft:\n- Level: ${LEVEL_LABELS[p.level] ?? p.level}\n- Streak: ${p.streak} dagen\n- Winrate: ${p.winRate !== null ? p.winRate + "%" : "onbekend"}\n- Trades: ${p.tradeCount}\n- Actief: ${p.active7d ? "ja, afgelopen 7 dagen" : "niet actief deze week"}\n\nVergelijk dit met mijn eigen prestaties en geef me één concreet aandachtspunt.`;
    window.dispatchEvent(new CustomEvent("marcus-price-alert", { detail: { message: msg } }));
  }

  if (loading) return null;
  if (!data) return null;

  const { optedIn, partner } = data;

  return (
    <div style={{
      background: "var(--surface-1, rgba(255,255,255,0.02))",
      border: "1px solid var(--border, rgba(255,255,255,0.08))",
      borderRadius: 16, overflow: "hidden", marginTop: 24,
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        background: "linear-gradient(135deg, rgba(167,139,250,0.08) 0%, transparent 60%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🤝</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              Accountability Partner
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
              Marcus koppelt je aan een trader op jouw niveau
            </div>
          </div>
        </div>

        {/* Opt-in toggle */}
        <button
          onClick={toggleOptIn}
          disabled={acting}
          style={{
            padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
            cursor: acting ? "default" : "pointer",
            border: `1px solid ${optedIn ? "rgba(239,68,68,0.4)" : "rgba(167,139,250,0.4)"}`,
            background: optedIn ? "rgba(239,68,68,0.08)" : "rgba(167,139,250,0.12)",
            color: optedIn ? "var(--red)" : "#a78bfa",
            opacity: acting ? 0.6 : 1, transition: "all 0.15s",
          }}
        >
          {acting ? "…" : optedIn ? "Uitschrijven" : "Meedoen"}
        </button>
      </div>

      <div style={{ padding: "16px 20px" }}>

        {/* Niet opt-in */}
        {!optedIn && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 400, margin: "0 auto" }}>
              Marcus koppelt je anoniem aan een trader met een vergelijkbaar niveau en stijl.
              Je ziet elkaars statistieken en Marcus vergelijkt jullie wekelijks.
            </div>
          </div>
        )}

        {/* Opt-in maar nog geen match */}
        {optedIn && !partner && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "rgba(167,139,250,0.06)", borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(167,139,250,0.15)", border: "2px dashed rgba(167,139,250,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <span style={{ fontSize: 16 }}>?</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                Wachten op een match…
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Marcus zoekt een geschikte partner op jouw niveau. Dit kan even duren.
              </div>
            </div>
          </div>
        )}

        {/* Matched partner */}
        {optedIn && partner && (
          <>
            <div style={{
              background: "rgba(167,139,250,0.06)",
              border: "1px solid rgba(167,139,250,0.2)",
              borderRadius: 14, padding: "16px",
            }}>
              {/* Partner header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(167,139,250,0.3), rgba(233,30,99,0.2))",
                    border: "2px solid rgba(167,139,250,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, flexShrink: 0,
                  }}>
                    🤝
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                      {partner.codename}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                      {matchedAgo(partner.matchedAt)}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: partner.active7d ? "var(--green)" : "var(--text-muted)",
                  background: partner.active7d ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
                  padding: "3px 10px", borderRadius: 99,
                  border: `1px solid ${partner.active7d ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}`,
                }}>
                  {partner.active7d ? "● Actief" : "○ Inactief"}
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Level", value: LEVEL_LABELS[partner.level] ?? `${partner.level}`, color: LEVEL_COLORS[partner.level] },
                  { label: "Streak", value: `${partner.streak}d`, color: "var(--orange)" },
                  { label: "Winrate", value: partner.winRate !== null ? `${partner.winRate}%` : "—", color: partner.winRate !== null && partner.winRate >= 50 ? "var(--green)" : "var(--red)" },
                  { label: "Trades", value: String(partner.tradeCount), color: "var(--text)" },
                ].map(s => (
                  <div key={s.label} style={{
                    background: "rgba(255,255,255,0.03)", borderRadius: 10,
                    padding: "10px 8px", textAlign: "center",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Acties */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={askMarcus}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 10, cursor: "pointer",
                    background: "rgba(233,30,99,0.12)", border: "1px solid rgba(233,30,99,0.25)",
                    color: "var(--primary)", fontSize: 12, fontWeight: 600,
                  }}
                >
                  Vergelijk met Marcus
                </button>
                <button
                  onClick={endPartnership}
                  disabled={acting}
                  style={{
                    padding: "8px 14px", borderRadius: 10, cursor: acting ? "default" : "pointer",
                    background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-muted)", fontSize: 12, opacity: acting ? 0.5 : 1,
                  }}
                >
                  {acting ? "…" : "Ontkoppelen"}
                </button>
              </div>
            </div>

            {/* Marcus tip */}
            <div style={{
              marginTop: 12, padding: "10px 14px", borderRadius: 10,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6,
            }}>
              Klik op &quot;Vergelijk met Marcus&quot; om een persoonlijke analyse te krijgen van jullie prestaties deze week.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
