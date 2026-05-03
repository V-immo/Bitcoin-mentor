"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, CheckCircle, XCircle, Shield, ExternalLink } from "lucide-react";

type Signal = {
  id: number;
  asset: string;
  symbol: string;
  direction: string;
  entry_price: number;
  stop_loss: number;
  target: number;
  rsi: number;
  score: number;
  trend: string;
  status: string;
  close_price: number | null;
  signal_hash: string | null;
  created_at: string;
  closed_at: string | null;
  currentPrice: number | null;
  pnlPct: number | null;
  closedPnlPct: number | null;
};

type Anchor = {
  id: number;
  merkle_root: string;
  signal_ids: string;
  tx_hash: string | null;
  chain: string | null;
  created_at: string;
};

type Stats = { totalSignals: number; hitTarget: number; hitStop: number; winRate: number };

type VerifyResult = {
  valid: boolean;
  error?: string;
  signal?: {
    asset: string; direction: string; entryPrice: number;
    stopLoss: number; target: number; status: string;
    createdAt: string; signalHash: string;
  };
};

function statusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case "open":       return { label: "Open",         color: "#3b82f6" };
    case "hit_target": return { label: "Target geraakt", color: "#22c55e" };
    case "hit_stop":   return { label: "Stop geraakt",  color: "#ef4444" };
    case "expired":    return { label: "Vervallen",     color: "#6b7280" };
    default:           return { label: status,          color: "#6b7280" };
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function VerificatiePage() {
  const [signals, setSignals]     = useState<Signal[]>([]);
  const [anchors, setAnchors]     = useState<Anchor[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [hashInput, setHashInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    fetch("/api/signals?anchors=1")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setSignals(d.signals ?? []);
          setStats(d.stats ?? null);
          setAnchors(d.anchors ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function verify() {
    const h = hashInput.trim().toLowerCase();
    if (h.length !== 64) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`/api/signals/verify?hash=${h}`);
      setVerifyResult(await res.json());
    } catch {
      setVerifyResult({ valid: false, error: "Verzoek mislukt" });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/dashboard" style={{ fontSize: 12, color: "var(--text-secondary)", textDecoration: "none" }}>
          ← Dashboard
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
          <Shield size={22} color="var(--accent)" />
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            Verified Track Record
          </h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
          Elk Marcus-signaal krijgt bij aanmaak een cryptografische SHA-256 hash.
          De hash is onveranderlijk — niemand kan achteraf data aanpassen zonder dat de hash ongeldig wordt.
          Elke 24u wordt een Merkle-root opgeslagen die de hash-keten vastlegt.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Totaal signalen",  value: stats.totalSignals },
            { label: "Target geraakt",   value: stats.hitTarget, color: "#22c55e" },
            { label: "Stop geraakt",     value: stats.hitStop,   color: "#ef4444" },
            { label: "Winrate",          value: `${stats.winRate}%`, color: stats.winRate >= 60 ? "#22c55e" : stats.winRate >= 45 ? "#f59e0b" : "#ef4444" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: (s.color as string) ?? "var(--text-primary)" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Hash verificatie */}
      <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Verifieer een signaal-hash</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={hashInput}
            onChange={e => setHashInput(e.target.value)}
            placeholder="64-karakter SHA-256 hash…"
            style={{
              flex: 1,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              color: "var(--text-primary)",
              fontFamily: "monospace",
            }}
            onKeyDown={e => e.key === "Enter" && verify()}
          />
          <button
            onClick={verify}
            disabled={verifying || hashInput.trim().length !== 64}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: hashInput.trim().length !== 64 ? 0.5 : 1,
            }}
          >
            <Search size={14} />
            {verifying ? "…" : "Verifieer"}
          </button>
        </div>

        {verifyResult && (
          <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 8, background: verifyResult.valid ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${verifyResult.valid ? "#22c55e" : "#ef4444"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: verifyResult.signal ? 8 : 0 }}>
              {verifyResult.valid
                ? <CheckCircle size={16} color="#22c55e" />
                : <XCircle size={16} color="#ef4444" />}
              <span style={{ fontWeight: 600, fontSize: 13, color: verifyResult.valid ? "#22c55e" : "#ef4444" }}>
                {verifyResult.valid ? "Hash geldig — data ongewijzigd" : verifyResult.error ?? "Hash ongeldig"}
              </span>
            </div>
            {verifyResult.valid && verifyResult.signal && (
              <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                <span>Asset: <strong style={{ color: "var(--text-primary)" }}>{verifyResult.signal.asset}</strong></span>
                <span>Richting: <strong style={{ color: "var(--text-primary)" }}>{verifyResult.signal.direction}</strong></span>
                <span>Entry: <strong style={{ color: "var(--text-primary)" }}>${verifyResult.signal.entryPrice.toLocaleString()}</strong></span>
                <span>Status: <strong style={{ color: statusLabel(verifyResult.signal.status).color }}>{statusLabel(verifyResult.signal.status).label}</strong></span>
                <span style={{ gridColumn: "1/-1" }}>Aangemaakt: <strong style={{ color: "var(--text-primary)" }}>{formatDate(verifyResult.signal.createdAt)}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Signalen tabel */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Alle signalen</div>
        {loading ? (
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Laden…</div>
        ) : signals.length === 0 ? (
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Nog geen signalen gegenereerd.</div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                  {["Asset", "Entry", "SL", "Target", "Status", "P&L", "Datum", "Hash"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signals.map((sig, i) => {
                  const st = statusLabel(sig.status);
                  const pnl = sig.closedPnlPct ?? sig.pnlPct;
                  return (
                    <tr
                      key={sig.id}
                      style={{
                        borderBottom: i < signals.length - 1 ? "1px solid var(--border)" : "none",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{sig.asset}</td>
                      <td style={{ padding: "8px 10px" }}>${sig.entry_price.toLocaleString()}</td>
                      <td style={{ padding: "8px 10px", color: "#ef4444" }}>${sig.stop_loss.toLocaleString()}</td>
                      <td style={{ padding: "8px 10px", color: "#22c55e" }}>${sig.target.toLocaleString()}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ color: st.color, fontWeight: 500 }}>{st.label}</span>
                      </td>
                      <td style={{ padding: "8px 10px", color: pnl !== null ? (pnl >= 0 ? "#22c55e" : "#ef4444") : "var(--text-secondary)" }}>
                        {pnl !== null ? `${pnl >= 0 ? "+" : ""}${pnl}%` : "—"}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {new Date(sig.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {sig.signal_hash ? (
                          <button
                            onClick={() => {
                              setHashInput(sig.signal_hash!);
                              setVerifyResult(null);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            title={sig.signal_hash}
                            style={{
                              background: "none",
                              border: "1px solid var(--border)",
                              borderRadius: 4,
                              padding: "2px 6px",
                              cursor: "pointer",
                              fontFamily: "monospace",
                              fontSize: 10,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {sig.signal_hash.slice(0, 8)}…
                          </button>
                        ) : (
                          <span style={{ color: "var(--text-secondary)", fontSize: 10 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Anchor log */}
      {anchors.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={14} color="var(--accent)" />
            Merkle-root anchors
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {anchors.map(anchor => (
              <div key={anchor.id} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 3 }}>
                      {formatDate(anchor.created_at)} — {anchor.signal_ids.split(",").length} signalen
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-primary)", wordBreak: "break-all" }}>
                      {anchor.merkle_root}
                    </div>
                  </div>
                  {anchor.tx_hash && (
                    <a
                      href={`https://polygonscan.com/tx/${anchor.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--accent)", textDecoration: "none", flexShrink: 0 }}
                    >
                      On-chain <ExternalLink size={11} />
                    </a>
                  )}
                  {!anchor.tx_hash && (
                    <span style={{ fontSize: 10, color: "var(--text-secondary)", flexShrink: 0 }}>intern geankerkt</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
