"use client";

import { useState } from "react";
import Tip from "@/components/Tip";
import { Target, CheckCircle2, AlertTriangle, XCircle, Dumbbell, Lightbulb } from "lucide-react";

type Verdict = "GOED" | "AANPASSEN" | "NIET_DOEN";

type PlanResult = {
  verdict: Verdict;
  score: number;
  rr: string;
  slPct: string;
  tpPct: string;
  sterk: string;
  zwak: string;
  tip: string;
};

type Props = {
  asset: string;
  currentPrice: number;
};

export default function TradePlanValidator({ asset, currentPrice }: Props) {
  const [side, setSide] = useState<"long" | "short">("long");
  const [entry, setEntry] = useState(currentPrice > 0 ? currentPrice.toFixed(2) : "");
  const [sl, setSl] = useState("");
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState("");

  const ticker = asset.replace("USDT", "").replace("EUR", "");

  // Live R/R preview
  const entryNum = parseFloat(entry);
  const slNum = parseFloat(sl);
  const targetNum = parseFloat(target);
  const hasNumbers = entryNum > 0 && slNum > 0 && targetNum > 0;
  const risk = hasNumbers ? Math.abs(entryNum - slNum) : 0;
  const reward = hasNumbers ? Math.abs(targetNum - entryNum) : 0;
  const liveRR = risk > 0 ? (reward / risk).toFixed(2) : null;
  const rrOk = liveRR ? parseFloat(liveRR) >= 2 : null;

  async function validate() {
    if (!entryNum || !slNum || !targetNum) return;
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const res = await fetch("/api/trade-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          side,
          entryPrice: entryNum,
          stopLoss: slNum,
          target: targetNum,
          reason,
          currentPrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onbekende fout");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout bij validatie");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError("");
  }

  const verdictColor = result?.verdict === "GOED" ? "var(--green)" : result?.verdict === "AANPASSEN" ? "var(--orange)" : "var(--red)";
  const VerdictIcon = result?.verdict === "GOED" ? CheckCircle2 : result?.verdict === "AANPASSEN" ? AlertTriangle : XCircle;
  const verdictLabel = result?.verdict === "GOED" ? "GOED PLAN" : result?.verdict === "AANPASSEN" ? "AANPASSEN" : "NIET DOEN";

  return (
    <div className="terminal-side-card" style={{ padding: "14px 16px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Target size={16} />
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Trade Plan Validator</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--surface-2)", padding: "2px 8px", borderRadius: 6 }}>
          {ticker} · ${currentPrice > 0 ? currentPrice.toLocaleString("nl-NL", { maximumFractionDigits: 2 }) : "—"}
        </div>
      </div>

      {result ? (
        /* ── RESULTAAT ── */
        <div>
          {/* Verdict banner */}
          <div style={{
            background: verdictColor + "18",
            border: `1.5px solid ${verdictColor}`,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 12,
            textAlign: "center",
          }}>
            <div style={{ marginBottom: 4 }}><VerdictIcon size={22} color={verdictColor} /></div>
            <div style={{ fontWeight: 800, fontSize: 18, color: verdictColor, letterSpacing: 1 }}>{verdictLabel}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 6 }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{
                  width: 14, height: 6, borderRadius: 3,
                  background: i < result.score ? verdictColor : "var(--border)",
                  transition: "background 0.2s",
                }} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>Score: {result.score}/10</div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[
              { label: "R/R", value: `1:${result.rr}`, ok: parseFloat(result.rr) >= 2 },
              { label: "SL", value: `${result.slPct}%`, ok: parseFloat(result.slPct) <= 5 },
              { label: "TP", value: `${result.tpPct}%`, ok: parseFloat(result.tpPct) >= 4 },
            ].map(stat => (
              <div key={stat.label} style={{
                flex: 1, background: "var(--surface-2)", borderRadius: 8,
                padding: "8px 0", textAlign: "center",
                border: `1px solid ${stat.ok ? "#22c55e33" : "#ef444433"}`,
              }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>{stat.label}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: stat.ok ? "var(--green)" : "var(--red)" }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Feedback cards */}
          {[
            { Icon: Dumbbell, label: "STERK", value: result.sterk, color: "var(--green)" },
            { Icon: AlertTriangle, label: "ZWAK",  value: result.zwak,  color: "var(--orange)" },
            { Icon: Lightbulb, label: "TIP",   value: result.tip,   color: "#3b82f6" },
          ].map(item => (
            <div key={item.label} style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              background: "var(--surface-2)", borderRadius: 8,
              padding: "9px 12px", marginBottom: 8,
              borderLeft: `3px solid ${item.color}`,
            }}>
              <item.Icon size={14} style={{ lineHeight: 1.4, flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 10, color: item.color, fontWeight: 700, marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{item.value}</div>
              </div>
            </div>
          ))}

          <button
            onClick={reset}
            style={{
              width: "100%", padding: "10px 0", marginTop: 4,
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text-secondary)", fontSize: 13,
              cursor: "pointer", fontWeight: 600,
            }}
          >
            ← Nieuw plan beoordelen
          </button>
        </div>
      ) : (
        /* ── FORMULIER ── */
        <div>
          {/* Side toggle */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {(["long", "short"] as const).map(s => (
              <button
                key={s}
                onClick={() => setSide(s)}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, fontWeight: 700,
                  fontSize: 13, cursor: "pointer", border: "1.5px solid",
                  borderColor: side === s ? (s === "long" ? "var(--green)" : "var(--red)") : "var(--border)",
                  background: side === s ? (s === "long" ? "#22c55e22" : "#ef444422") : "var(--surface-2)",
                  color: side === s ? (s === "long" ? "var(--green)" : "var(--red)") : "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                {s === "long" ? "▲ LONG" : "▼ SHORT"}
              </button>
            ))}
          </div>

          {/* Price inputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {[
              { label: "Instapprijs ($)", value: entry, set: setEntry, placeholder: currentPrice > 0 ? currentPrice.toFixed(2) : "0.00" },
              { label: `Stop-Loss ($) ${side === "long" ? "↓ onder instap" : "↑ boven instap"}`, value: sl, set: setSl, placeholder: "bijv. 83000", tip: "Het prijsniveau waar je trade automatisch sluit bij verlies. Zet dit altijd vóór je instapt." },
              { label: `Target ($) ${side === "long" ? "↑ boven instap" : "↓ onder instap"}`, value: target, set: setTarget, placeholder: "bijv. 92000", tip: "Je take-profit niveau — de prijs waarop je de trade met winst sluit." },
            ].map(field => (
              <div key={field.label}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4, fontWeight: 600 }}>
                  {field.label}{"tip" in field && field.tip ? <Tip text={field.tip} /> : null}
                </div>
                <input
                  type="number"
                  value={field.value}
                  onChange={e => field.set(e.target.value)}
                  placeholder={field.placeholder}
                  style={{
                    width: "100%", padding: "9px 10px", borderRadius: 8, fontSize: 14,
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    color: "var(--text)", outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Live R/R preview */}
          {liveRR && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: rrOk ? "#22c55e11" : "#ef444411",
              border: `1px solid ${rrOk ? "#22c55e44" : "#ef444444"}`,
              borderRadius: 8, padding: "8px 12px", marginBottom: 10,
            }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Live R/R preview<Tip text="Verhouding winst/verlies. Minimaal 1:2 is ideaal — voor elke €1 risico minstens €2 winst." /></span>
              <span style={{ fontWeight: 700, fontSize: 14, color: rrOk ? "var(--green)" : "var(--red)" }}>
                1:{liveRR} {rrOk ? "✓" : "✗"}
              </span>
            </div>
          )}

          {/* Reason */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4, fontWeight: 600 }}>Setup / reden (optioneel)</div>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="bijv. breekout boven weerstand, RSI divergentie, key level..."
              rows={2}
              style={{
                width: "100%", padding: "9px 10px", borderRadius: 8, fontSize: 13,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                color: "var(--text)", outline: "none", resize: "none",
                boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
          </div>

          {error && (
            <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8, padding: "8px 10px", background: "#ef444411", borderRadius: 6 }}>
              {error}
            </div>
          )}

          <button
            onClick={validate}
            disabled={loading || !entryNum || !slNum || !targetNum}
            style={{
              width: "100%", padding: "11px 0",
              background: loading || !entryNum || !slNum || !targetNum ? "var(--surface-2)" : "var(--accent)",
              border: "none", borderRadius: 8,
              color: loading || !entryNum || !slNum || !targetNum ? "var(--text-secondary)" : "#fff",
              fontWeight: 700, fontSize: 14, cursor: loading || !entryNum || !slNum || !targetNum ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {loading ? "Marcus beoordeelt…" : "Laat Marcus beoordelen"}
          </button>
        </div>
      )}
    </div>
  );
}
