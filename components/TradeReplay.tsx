"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, SkipForward, MessageSquare } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Candle = { t: number; o: number; h: number; l: number; c: number };

export type ReplayTrade = {
  id: string;
  side: "buy" | "sell";
  price: number;
  btcAmount: number;
  pnl?: number;
  timestamp?: number;
  asset?: string;
};

type Props = {
  trade: ReplayTrade;       // the completed sell trade
  allTrades: ReplayTrade[]; // full history (oldest last) to find entry time
  asset: string;
  onClose: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickInterval(durationMs: number): string {
  if (durationMs < 2 * 3_600_000)  return "5m";
  if (durationMs < 12 * 3_600_000) return "15m";
  if (durationMs < 3 * 86_400_000) return "1h";
  return "4h";
}

function intervalMs(iv: string): number {
  if (iv === "5m")  return 5  * 60_000;
  if (iv === "15m") return 15 * 60_000;
  if (iv === "1h")  return 3_600_000;
  return 4 * 3_600_000;
}

function fmtDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}u ${m}m`;
  return `${m}m`;
}

function fmtPrice(p: number): string {
  return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" });
}

// ─── Canvas chart renderer ────────────────────────────────────────────────────

function drawChart(
  canvas: HTMLCanvasElement,
  candles: Candle[],
  visibleCount: number,
  entryPrice: number,
  exitPrice: number,
  entryTime: number,
  exitTime: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || candles.length === 0) return;

  const W = canvas.width;
  const H = canvas.height;
  const padL = 12, padR = 60, padT = 16, padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Background
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0d0d0f";
  ctx.fillRect(0, 0, W, H);

  const visible = candles.slice(0, visibleCount);
  const all     = candles;

  // Price range across ALL candles (so axis doesn't jump)
  const prices = all.flatMap(c => [c.h, c.l, entryPrice, exitPrice]);
  const minP = Math.min(...prices) * 0.9995;
  const maxP = Math.max(...prices) * 1.0005;
  const pRange = maxP - minP;

  const toY = (p: number) => padT + chartH - ((p - minP) / pRange) * chartH;
  const candleW = Math.max(2, Math.floor(chartW / all.length) - 1);
  const toX = (i: number) => padL + (i / all.length) * chartW + candleW / 2;

  // Grid lines
  ctx.strokeStyle = "#1e1e24";
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = padT + (g / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + chartW, y);
    ctx.stroke();
    const price = maxP - (g / 4) * pRange;
    ctx.fillStyle = "#555";
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(fmtPrice(price), padL + chartW + 4, y + 3);
  }

  // Entry line (green dashed)
  const yEntry = toY(entryPrice);
  ctx.save();
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, yEntry);
  ctx.lineTo(padL + chartW, yEntry);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#22c55e";
  ctx.font = "9px monospace";
  ctx.textAlign = "left";
  ctx.fillText("Entry " + fmtPrice(entryPrice), padL + chartW + 4, yEntry + 3);

  // Exit line (orange dashed)
  const yExit = toY(exitPrice);
  ctx.save();
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, yExit);
  ctx.lineTo(padL + chartW, yExit);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#f97316";
  ctx.font = "9px monospace";
  ctx.textAlign = "left";
  ctx.fillText("Exit " + fmtPrice(exitPrice), padL + chartW + 4, yExit + 3);

  // Candles
  all.forEach((c, i) => {
    const isVisible = i < visibleCount;
    const x = toX(i);
    const isGreen = c.c >= c.o;
    const color = isVisible
      ? (isGreen ? "#22c55e" : "#ef4444")
      : "#2a2a30";

    const yHigh  = toY(c.h);
    const yLow   = toY(c.l);
    const yOpen  = toY(c.o);
    const yClose = toY(c.c);
    const bodyTop = Math.min(yOpen, yClose);
    const bodyH   = Math.max(1, Math.abs(yClose - yOpen));

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
  });

  // Entry marker (green triangle)
  const entryIdx = all.findIndex(c => c.t >= entryTime);
  if (entryIdx >= 0 && entryIdx < visibleCount) {
    const mx = toX(entryIdx);
    const my = toY(all[entryIdx].l) + 10;
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.moveTo(mx, my - 8);
    ctx.lineTo(mx - 5, my);
    ctx.lineTo(mx + 5, my);
    ctx.closePath();
    ctx.fill();
  }

  // Exit marker (orange triangle — inverted)
  const exitIdx = all.findIndex(c => c.t >= exitTime);
  if (exitIdx >= 0 && exitIdx < visibleCount) {
    const mx = toX(exitIdx);
    const my = toY(all[exitIdx].h) - 10;
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(mx, my + 8);
    ctx.lineTo(mx - 5, my);
    ctx.lineTo(mx + 5, my);
    ctx.closePath();
    ctx.fill();
  }

  // Time labels
  const labelCount = Math.min(4, all.length);
  ctx.fillStyle = "#555";
  ctx.font = "9px monospace";
  ctx.textAlign = "center";
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.floor((i / (labelCount - 1)) * (all.length - 1));
    const x = toX(idx);
    const label = new Date(all[idx].t).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    ctx.fillText(label, x, padT + chartH + padB - 4);
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TradeReplay({ trade, allTrades, asset, onClose }: Props) {
  const [candles, setCandles]         = useState<Candle[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [frame, setFrame]             = useState(0);
  const [playing, setPlaying]         = useState(false);
  const [speed, setSpeed]             = useState(1);       // 1x, 2x, 5x
  const [analysis, setAnalysis]       = useState<string | null>(null);
  const [analyzing, setAnalyzing]     = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived trade info ──────────────────────────────────────────────────
  const exitPrice  = trade.price;
  const exitTime   = trade.timestamp ?? Date.now();
  const entryPrice = trade.btcAmount > 0
    ? exitPrice - (trade.pnl ?? 0) / trade.btcAmount
    : exitPrice;

  // Find entry time: last buy before this sell (by timestamp)
  const entryTime = (() => {
    const buys = allTrades.filter(
      t => t.side === "buy" && (t.timestamp ?? 0) < exitTime
    );
    if (buys.length === 0) return exitTime - 24 * 3_600_000;
    return buys.reduce((best, t) =>
      (t.timestamp ?? 0) > (best.timestamp ?? 0) ? t : best
    ).timestamp ?? exitTime - 3_600_000;
  })();

  const duration = exitTime - entryTime;
  const iv       = pickInterval(duration);
  const ivMs     = intervalMs(iv);
  const pnlColor = (trade.pnl ?? 0) >= 0 ? "#22c55e" : "#ef4444";

  // ── Fetch candles ───────────────────────────────────────────────────────
  useEffect(() => {
    const from = entryTime - 5 * ivMs;
    const to   = exitTime  + 3 * ivMs;

    fetch(`/api/me/paper/replay?symbol=${asset}&interval=${iv}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setCandles(d.candles as Candle[]);
        setFrame(1); // start at first candle
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Draw on frame change ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    drawChart(canvas, candles, frame, entryPrice, exitPrice, entryTime, exitTime);
  }, [candles, frame, entryPrice, exitPrice, entryTime, exitTime]);

  // ── Animation loop ──────────────────────────────────────────────────────
  useEffect(() => {
    if (animRef.current) clearInterval(animRef.current);
    if (!playing || candles.length === 0) return;

    const delay = speed === 5 ? 60 : speed === 2 ? 150 : 300;
    animRef.current = setInterval(() => {
      setFrame(prev => {
        if (prev >= candles.length) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, delay);

    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [playing, speed, candles.length]);

  // ── Marcus debrief ──────────────────────────────────────────────────────
  const askMarcus = useCallback(async () => {
    if (analyzing) return;
    setAnalyzing(true);
    setAnalysis("");

    const prompt =
      `Analyseer mijn afgesloten trade:\n` +
      `Asset: ${asset}\n` +
      `Entry: $${fmtPrice(entryPrice)} (${fmtDate(entryTime)})\n` +
      `Exit:  $${fmtPrice(exitPrice)} (${fmtDate(exitTime)})\n` +
      `P&L:   ${(trade.pnl ?? 0) >= 0 ? "+" : ""}$${(trade.pnl ?? 0).toFixed(2)}\n` +
      `Duur:  ${fmtDuration(duration)}\n` +
      `Positiegrootte: ${trade.btcAmount.toFixed(6)} ${asset.replace("USDT","")}\n\n` +
      `Geef me een eerlijke post-trade analyse: wat ging goed, wat kon beter? ` +
      `Kijk naar de timing van entry en exit. Wat had ik moeten zien? ` +
      `Geef 1 concrete les voor mijn volgende trade. Wees direct en specifiek.`;

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
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setAnalysis(full);
      }
    } catch {
      setAnalysis("Analyse mislukt — probeer opnieuw.");
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing, asset, entryPrice, entryTime, exitPrice, exitTime, duration, trade]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, width: "100%", maxWidth: 680, maxHeight: "90vh",
        overflowY: "auto", padding: 20,
      }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--accent)" }}>
              Trade Replay — {asset}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
              {fmtDate(entryTime)} → {fmtDate(exitTime)} &nbsp;·&nbsp; {fmtDuration(duration)} &nbsp;·&nbsp; {iv} candles
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Trade summary bar */}
        <div style={{
          display: "flex", gap: 16, padding: "8px 12px",
          background: "var(--surface-2)", borderRadius: 8, marginBottom: 14,
          fontSize: 12,
        }}>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>Entry</div>
            <div style={{ fontWeight: 700 }}>${fmtPrice(entryPrice)}</div>
          </div>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>Exit</div>
            <div style={{ fontWeight: 700 }}>${fmtPrice(exitPrice)}</div>
          </div>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>P&L</div>
            <div style={{ fontWeight: 700, color: pnlColor }}>
              {(trade.pnl ?? 0) >= 0 ? "+" : ""}${(trade.pnl ?? 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>Move</div>
            <div style={{ fontWeight: 700, color: pnlColor }}>
              {(trade.pnl ?? 0) >= 0 ? "+" : ""}
              {(((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2)}%
            </div>
          </div>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>Positie</div>
            <div style={{ fontWeight: 700 }}>{trade.btcAmount.toFixed(5)} {asset.replace("USDT","")}</div>
          </div>
        </div>

        {/* Chart */}
        {loading && (
          <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: 13 }}>
            Candles ophalen…
          </div>
        )}
        {error && (
          <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--red)", fontSize: 13 }}>
            {error}
          </div>
        )}
        {!loading && !error && (
          <>
            <canvas
              ref={canvasRef}
              width={640}
              height={260}
              style={{ width: "100%", height: "auto", borderRadius: 8, display: "block" }}
            />

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <button
                onClick={() => setPlaying(p => !p)}
                style={{
                  background: "var(--accent)", border: "none", borderRadius: 6,
                  padding: "5px 12px", cursor: "pointer", color: "#fff",
                  display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
                }}
              >
                {playing ? <Pause size={13} /> : <Play size={13} />}
                {playing ? "Pauze" : "Afspelen"}
              </button>

              <button
                onClick={() => { setFrame(candles.length); setPlaying(false); }}
                title="Naar einde"
                style={{
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 6, padding: "5px 8px", cursor: "pointer",
                  color: "var(--text-secondary)", display: "flex", alignItems: "center",
                }}
              >
                <SkipForward size={13} />
              </button>

              <button
                onClick={() => { setFrame(1); setPlaying(false); }}
                style={{
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 6, padding: "5px 10px", cursor: "pointer",
                  color: "var(--text-secondary)", fontSize: 11,
                }}
              >
                Reset
              </button>

              {/* Speed selector */}
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                {[1, 2, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    style={{
                      background: speed === s ? "var(--accent)" : "var(--surface-2)",
                      border: "1px solid var(--border)", borderRadius: 6,
                      padding: "4px 9px", cursor: "pointer", fontSize: 11, fontWeight: 600,
                      color: speed === s ? "#fff" : "var(--text-secondary)",
                    }}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Progress */}
              <div style={{ fontSize: 10, color: "var(--text-secondary)", minWidth: 48, textAlign: "right" }}>
                {frame}/{candles.length}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, background: "var(--surface-2)", borderRadius: 2, marginTop: 6 }}>
              <div style={{
                height: "100%", borderRadius: 2, background: "var(--accent)",
                width: `${candles.length > 0 ? (frame / candles.length) * 100 : 0}%`,
                transition: "width 0.15s",
              }} />
            </div>
          </>
        )}

        {/* Marcus analyse */}
        <div style={{ marginTop: 16 }}>
          {!analysis && !analyzing && (
            <button
              onClick={askMarcus}
              disabled={loading || !!error}
              style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "8px 14px", cursor: "pointer", width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontSize: 12, color: "var(--text-secondary)",
              }}
            >
              <MessageSquare size={14} />
              Marcus laat deze trade analyseren
            </button>
          )}

          {(analysis !== null || analyzing) && (
            <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>
                Marcus — Post-trade analyse
              </div>
              {analyzing && !analysis && (
                <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>Analyseren…</span>
              )}
              {analysis && (
                <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                  {analysis}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
