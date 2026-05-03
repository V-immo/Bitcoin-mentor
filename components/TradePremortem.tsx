"use client";

/**
 * Trade Pre-mortem
 * Marcus vraagt de gebruiker VOOR de trade: "Wat kan er misgaan?"
 * Gebaseerd op behavioral finance research: pre-mortems verminderen
 * confirmation bias en grote fouten.
 */

import { useState, useCallback } from "react";
import { X, AlertTriangle, CheckCircle } from "lucide-react";

type Props = {
  asset: string;
  side: "buy" | "sell";
  amount: number;          // EUR bedrag
  price: number;           // verwachte prijs
  stopLoss?: number;
  takeProfit?: number;
  onConfirm: () => void;   // gebruiker gaat door met trade
  onCancel: () => void;    // gebruiker annuleert
};

type MarcusVerdict = {
  verdict: "DOORGAAN" | "WACHTEN" | "AFBREKEN";
  riskScore: number;       // 1-10 (10 = hoogste risico)
  risks: string[];
  strength: string;
  advice: string;
};

function parseVerdict(text: string): MarcusVerdict | null {
  try {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) ??
                  text.match(/\{[\s\S]*"verdict"[\s\S]*\}/);
    if (!match) return null;
    const raw = match[1] ?? match[0];
    return JSON.parse(raw) as MarcusVerdict;
  } catch {
    return null;
  }
}

function fmtPrice(p: number): string {
  return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function TradePremortem({
  asset, side, amount, price, stopLoss, takeProfit,
  onConfirm, onCancel,
}: Props) {
  const [userRisks, setUserRisks] = useState("");
  const [verdict, setVerdict]     = useState<MarcusVerdict | null>(null);
  const [rawText, setRawText]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [step, setStep]           = useState<"input" | "result">("input");

  const rr = stopLoss && takeProfit && price > 0
    ? Math.abs(takeProfit - price) / Math.abs(price - stopLoss)
    : null;

  const askMarcus = useCallback(async () => {
    if (!userRisks.trim()) return;
    setLoading(true);

    const prompt =
      `Pre-trade check. De gebruiker wil de volgende trade uitvoeren:\n` +
      `Asset: ${asset}\n` +
      `Richting: ${side === "buy" ? "BUY (long)" : "SELL (short/sluiten)"}\n` +
      `Bedrag: €${amount.toFixed(0)}\n` +
      `Prijs: $${fmtPrice(price)}\n` +
      (stopLoss   ? `Stop-Loss: $${fmtPrice(stopLoss)}\n`   : "") +
      (takeProfit ? `Take-Profit: $${fmtPrice(takeProfit)}\n` : "") +
      (rr         ? `R:R ratio: 1:${rr.toFixed(2)}\n`       : "") +
      `\nDe gebruiker denkt dat dit mis kan gaan:\n"${userRisks.trim()}"\n\n` +
      `Geef een pre-mortem analyse. Antwoord ALLEEN in dit exacte JSON-formaat:\n` +
      `\`\`\`json\n` +
      `{\n` +
      `  "verdict": "DOORGAAN" | "WACHTEN" | "AFBREKEN",\n` +
      `  "riskScore": <1-10>,\n` +
      `  "risks": ["<risico 1>", "<risico 2>", "<risico 3>"],\n` +
      `  "strength": "<1 zin over wat de setup sterk maakt>",\n` +
      `  "advice": "<1-2 zinnen concreet advies>"\n` +
      `}\n` +
      `\`\`\`\n\n` +
      `Wees eerlijk. Als de R:R slecht is of de setup zwak, zeg dat dan.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          marketContext: "",
          traderLevel: 2,
          lang: "nl",
        }),
      });

      if (!res.ok || !res.body) throw new Error("HTTP " + res.status);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setRawText(full);
      }

      const parsed = parseVerdict(full);
      if (parsed) {
        setVerdict(parsed);
        setStep("result");
      } else {
        // Fallback: toon ruwe tekst
        setStep("result");
      }
    } catch {
      setRawText("Analyse mislukt — probeer opnieuw.");
      setStep("result");
    } finally {
      setLoading(false);
    }
  }, [userRisks, asset, side, amount, price, stopLoss, takeProfit, rr]);

  const verdictColor = verdict?.verdict === "DOORGAAN" ? "#22c55e"
    : verdict?.verdict === "WACHTEN" ? "#f59e0b"
    : "#ef4444";

  const verdictIcon = verdict?.verdict === "DOORGAAN"
    ? <CheckCircle size={18} color="#22c55e" />
    : <AlertTriangle size={18} color={verdict?.verdict === "WACHTEN" ? "#f59e0b" : "#ef4444"} />;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9100,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, width: "100%", maxWidth: 480, padding: 20,
      }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--accent)" }}>
              Pre-mortem check
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
              Denk na voordat je handelt — even 30 seconden
            </div>
          </div>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 2 }}>
            <X size={16} />
          </button>
        </div>

        {/* Trade summary */}
        <div style={{
          background: "var(--surface-2)", borderRadius: 8, padding: "8px 12px",
          display: "flex", gap: 16, fontSize: 12, marginBottom: 14,
        }}>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>Trade</div>
            <div style={{ fontWeight: 700, color: side === "buy" ? "#22c55e" : "#ef4444" }}>
              {side === "buy" ? "BUY" : "SELL"} {asset}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>Bedrag</div>
            <div style={{ fontWeight: 700 }}>€{amount.toFixed(0)}</div>
          </div>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>Prijs</div>
            <div style={{ fontWeight: 700 }}>${fmtPrice(price)}</div>
          </div>
          {rr && (
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>R:R</div>
              <div style={{ fontWeight: 700, color: rr >= 2 ? "#22c55e" : rr >= 1 ? "#f59e0b" : "#ef4444" }}>
                1:{rr.toFixed(1)}
              </div>
            </div>
          )}
        </div>

        {/* Step 1: user input */}
        {step === "input" && (
          <>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                Stel je voor dat deze trade mislukt. Wat ging er mis?
              </label>
              <textarea
                value={userRisks}
                onChange={e => setUserRisks(e.target.value)}
                placeholder="Bijv: De markt draait na mijn entry, ik heb geen SL ingesteld, ik trade op FOMO..."
                rows={3}
                style={{
                  width: "100%", resize: "vertical", background: "var(--surface-2)",
                  border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px",
                  color: "var(--text-primary)", fontSize: 12, fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={askMarcus}
                disabled={!userRisks.trim() || loading}
                style={{
                  flex: 1, background: "var(--accent)", border: "none",
                  borderRadius: 8, padding: "9px 14px", cursor: "pointer",
                  color: "#fff", fontWeight: 600, fontSize: 13,
                  opacity: !userRisks.trim() || loading ? 0.5 : 1,
                }}
              >
                {loading ? "Marcus denkt na…" : "Laat Marcus analyseren"}
              </button>
              <button
                onClick={onConfirm}
                style={{
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "9px 14px", cursor: "pointer",
                  color: "var(--text-secondary)", fontSize: 12,
                }}
                title="Trade uitvoeren zonder analyse"
              >
                Overslaan
              </button>
            </div>
          </>
        )}

        {/* Step 2: verdict */}
        {step === "result" && verdict && (
          <>
            {/* Verdict banner */}
            <div style={{
              background: "var(--surface-2)", border: `1px solid ${verdictColor}`,
              borderRadius: 8, padding: "10px 14px", marginBottom: 12,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              {verdictIcon}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: verdictColor }}>
                  {verdict.verdict}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>
                  Risicoscore: {verdict.riskScore}/10
                </div>
              </div>
              {/* Risk score bar */}
              <div style={{ marginLeft: "auto", width: 80 }}>
                <div style={{ height: 6, background: "var(--surface)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    width: `${verdict.riskScore * 10}%`,
                    background: verdict.riskScore <= 3 ? "#22c55e"
                      : verdict.riskScore <= 6 ? "#f59e0b" : "#ef4444",
                  }} />
                </div>
              </div>
            </div>

            {/* Risks */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 5 }}>
                Risico&apos;s
              </div>
              {verdict.risks.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 6, fontSize: 12, marginBottom: 3, color: "var(--text-primary)" }}>
                  <span style={{ color: "#ef4444", flexShrink: 0 }}>✗</span>
                  {r}
                </div>
              ))}
            </div>

            {/* Strength */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 5 }}>
                Sterk punt
              </div>
              <div style={{ display: "flex", gap: 6, fontSize: 12, color: "var(--text-primary)" }}>
                <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span>
                {verdict.strength}
              </div>
            </div>

            {/* Advice */}
            <div style={{
              background: "var(--surface-2)", borderRadius: 8, padding: "8px 12px",
              fontSize: 12, color: "var(--text-primary)", marginBottom: 14, lineHeight: 1.5,
            }}>
              <span style={{ fontWeight: 700, color: "var(--accent)" }}>Marcus: </span>
              {verdict.advice}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              {verdict.verdict !== "AFBREKEN" && (
                <button
                  onClick={onConfirm}
                  style={{
                    flex: 1, background: verdictColor, border: "none",
                    borderRadius: 8, padding: "9px 14px", cursor: "pointer",
                    color: "#fff", fontWeight: 600, fontSize: 13,
                  }}
                >
                  Toch uitvoeren
                </button>
              )}
              <button
                onClick={onCancel}
                style={{
                  flex: verdict.verdict === "AFBREKEN" ? 1 : undefined,
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "9px 14px", cursor: "pointer",
                  color: "var(--text-secondary)", fontSize: 13,
                  fontWeight: verdict.verdict === "AFBREKEN" ? 600 : 400,
                }}
              >
                {verdict.verdict === "AFBREKEN" ? "Trade annuleren" : "Annuleren"}
              </button>
            </div>
          </>
        )}

        {/* Fallback: raw text if JSON parse failed */}
        {step === "result" && !verdict && rawText && (
          <>
            <div style={{
              background: "var(--surface-2)", borderRadius: 8, padding: 12,
              fontSize: 12, color: "var(--text-primary)", marginBottom: 14,
              whiteSpace: "pre-wrap", lineHeight: 1.5,
            }}>
              {rawText}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={onConfirm}
                style={{
                  flex: 1, background: "var(--accent)", border: "none",
                  borderRadius: 8, padding: "9px 14px", cursor: "pointer",
                  color: "#fff", fontWeight: 600, fontSize: 13,
                }}
              >
                Toch uitvoeren
              </button>
              <button
                onClick={onCancel}
                style={{
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "9px 14px", cursor: "pointer",
                  color: "var(--text-secondary)", fontSize: 13,
                }}
              >
                Annuleren
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
