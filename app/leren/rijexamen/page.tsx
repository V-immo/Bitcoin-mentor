"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Types ─────────────────────────────────────────────────────────────────────

type QuizData = {
  level: number;
  streak: number;
};

type TradeEntry = {
  pnl?: number;
  side?: string;
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
};

type PaperData = {
  history: TradeEntry[];
};

type NudgeData = {
  login_streak?: number;
  streak?: number;
};

type PageState = {
  quizLevel: number;
  quizStreak: number;
  qualified: number;
  avgRR: number;
  loginStreak: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcQualified(history: TradeEntry[]): { qualified: number; avgRR: number } {
  const rrValues: number[] = [];

  for (const t of history) {
    if (t.side !== "sell" && t.side !== "SELL") continue;
    if (typeof t.pnl !== "number" || t.pnl <= 0) continue;

    if (
      typeof t.entryPrice === "number" &&
      typeof t.exitPrice === "number" &&
      typeof t.stopLoss === "number" &&
      t.stopLoss < t.entryPrice &&
      t.exitPrice > t.entryPrice
    ) {
      const reward = t.exitPrice - t.entryPrice;
      const risk = t.entryPrice - t.stopLoss;
      if (risk > 0) rrValues.push(reward / risk);
    } else {
      rrValues.push(1);
    }
  }

  const qualified = rrValues.length;
  const avgRR = qualified > 0 ? rrValues.reduce((a, b) => a + b, 0) / qualified : 0;
  return { qualified, avgRR };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ width = "100%", height = 14 }: { width?: string; height?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: "var(--surface-2)",
        animation: "rijexamen-pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

// ── Progress bar card ─────────────────────────────────────────────────────────

function ReqCard({
  icon,
  title,
  description,
  pct,
  label,
  done,
  lang,
}: {
  icon: string;
  title: string;
  description: string;
  pct: number;
  label: string;
  done: boolean;
  lang: string;
}) {
  return (
    <div className={`rijexamen-req-card${done ? " done" : ""}`}>
      <div className="rijexamen-req-header">
        <span className="rijexamen-req-icon">{done ? "✅" : icon}</span>
        <div className="rijexamen-req-info">
          <div className="rijexamen-req-title">{title}</div>
          <div className="rijexamen-req-desc">{description}</div>
        </div>
        <div className={`rijexamen-req-badge${done ? " done" : ""}`}>
          {done ? (lang === "nl" ? "✓ Behaald" : "✓ Done") : `${pct}%`}
        </div>
      </div>
      <div className="rijexamen-req-progress">
        <div
          className={`rijexamen-req-fill${done ? " done" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="rijexamen-req-label">{label}</div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function ReqCardSkeleton() {
  return (
    <div className="rijexamen-req-card">
      <div className="rijexamen-req-header">
        <Skeleton width="32px" height={32} />
        <div className="rijexamen-req-info" style={{ gap: 6 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="80%" height={12} />
        </div>
        <Skeleton width="48px" height={24} />
      </div>
      <div className="rijexamen-req-progress">
        <div className="rijexamen-req-fill" style={{ width: "30%" }} />
      </div>
      <Skeleton width="40%" height={11} />
    </div>
  );
}

// ── Certificate block ─────────────────────────────────────────────────────────

function CertBlock({
  isNL,
  certificate,
  loading,
}: {
  isNL: boolean;
  certificate: string | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rijexamen-cert-card">
        <div className="rijexamen-cert-initial">M</div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width="90%" height={14} />
          <Skeleton width="75%" height={14} />
          <Skeleton width="60%" height={14} />
        </div>
      </div>
    );
  }

  if (!certificate) return null;

  return (
    <div className="rijexamen-cert-card">
      <div className="rijexamen-cert-initial">M</div>
      <blockquote className="rijexamen-cert-quote">"{certificate}"</blockquote>
    </div>
  );
}

// ── Affiliate section ─────────────────────────────────────────────────────────

function AffiliateSection({ isNL }: { isNL: boolean }) {
  return (
    <div className="rijexamen-affiliate">
      <div className="rijexamen-affiliate-header">
        <div className="rijexamen-cert-initial" style={{ flexShrink: 0 }}>M</div>
        <div>
          <div className="rijexamen-affiliate-label">
            {isNL ? "Marcus's aanbeveling" : "Marcus's recommendation"}
          </div>
          <p className="rijexamen-affiliate-text">
            {isNL
              ? "Je bent klaar voor live trading. Voor EU-traders gebruik ik Bitvavo — gereguleerd, laagste fees, directe iDEAL-storting."
              : "You're ready for live trading. For EU traders I use Bitvavo — regulated, lowest fees, instant bank deposit."}
          </p>
        </div>
      </div>
      <a
        href="https://bitvavo.com/?invite=BITCOINMENTOR"
        target="_blank"
        rel="noopener noreferrer"
        className="rijexamen-exchange-card"
      >
        <span className="rijexamen-exchange-flag">🇳🇱</span>
        <div className="rijexamen-exchange-info">
          <div className="rijexamen-exchange-name">
            Bitvavo
            <span className="rijexamen-exchange-rec">
              {isNL ? "Aanbevolen" : "Recommended"}
            </span>
          </div>
          <div className="rijexamen-exchange-tagline">
            {isNL
              ? "Laagste fees in de Benelux · iDEAL-storting · Nederlandse support"
              : "Lowest fees in Benelux · Direct bank transfer · EU regulated"}
          </div>
        </div>
        <div className="rijexamen-exchange-cta">
          {isNL ? "→ Open account" : "→ Open account"}
        </div>
      </a>
      <p className="rijexamen-affiliate-disclaimer">
        {isNL
          ? "Bitcoin Mentor ontvangt mogelijk een vergoeding via deze link. Jij betaalt nooit meer."
          : "Bitcoin Mentor may receive a referral fee via this link. You never pay more."}
      </p>
      <Link href="/brokers" className="rijexamen-brokers-link">
        {isNL ? "Alle exchanges vergelijken →" : "Compare all exchanges →"}
      </Link>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const QUIZ_LEVEL_MIN = 5;
const TRADE_COUNT_MIN = 20;
const STREAK_MIN = 14;

export default function RijexamenPage() {
  const { lang } = useLanguage();
  const isNL = lang === "nl";

  const [state, setState] = useState<PageState | null>(null);
  const [loading, setLoading] = useState(true);

  const [certificate, setCertificate] = useState<string | null>(null);
  const [certLoading, setCertLoading] = useState(false);
  const [certFetched, setCertFetched] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [quizRes, paperRes, nudgeRes] = await Promise.all([
          fetch("/api/me/quiz"),
          fetch("/api/me/paper?asset=BTCUSDT"),
          fetch("/api/me/nudge"),
        ]);

        const quiz: QuizData = quizRes.ok ? await quizRes.json() : { level: 1, streak: 0 };
        const paper: PaperData = paperRes.ok ? await paperRes.json() : { history: [] };
        const nudge: NudgeData = nudgeRes.ok ? await nudgeRes.json() : {};

        const { qualified, avgRR } = calcQualified(paper.history ?? []);

        // Prefer login_streak from nudge API (users table), fall back to quiz streak
        const loginStreak =
          typeof nudge.login_streak === "number"
            ? nudge.login_streak
            : typeof nudge.streak === "number"
            ? nudge.streak
            : quiz.streak ?? 0;

        setState({
          quizLevel: quiz.level ?? 1,
          quizStreak: quiz.streak ?? 0,
          qualified,
          avgRR,
          loginStreak,
        });
      } catch {
        setState({ quizLevel: 1, quizStreak: 0, qualified: 0, avgRR: 0, loginStreak: 0 });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Auto-fetch certificate when all requirements are met
  useEffect(() => {
    if (!state || certFetched) return;
    const req1 = state.quizLevel >= QUIZ_LEVEL_MIN;
    const req2 = state.qualified >= TRADE_COUNT_MIN && state.avgRR >= 1.5;
    const req3 = state.loginStreak >= STREAK_MIN;
    if (!(req1 && req2 && req3)) return;

    setCertFetched(true);
    setCertLoading(true);

    fetch("/api/me/rijexamen-cert", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.certificate) setCertificate(d.certificate);
      })
      .catch(() => {})
      .finally(() => setCertLoading(false));
  }, [state, certFetched]);

  // ── Derived values ───────────────────────────────────────────────────────

  const quizLevel = state?.quizLevel ?? 1;
  const qualified = state?.qualified ?? 0;
  const loginStreak = state?.loginStreak ?? 0;
  const avgRR = state?.avgRR ?? 0;

  const pct1 = Math.min(100, Math.round((quizLevel / QUIZ_LEVEL_MIN) * 100));
  const pct2 = Math.min(100, Math.round((qualified / TRADE_COUNT_MIN) * 100));
  const pct3 = Math.min(100, Math.round((loginStreak / STREAK_MIN) * 100));

  const req1Done = quizLevel >= QUIZ_LEVEL_MIN;
  const req2Done = qualified >= TRADE_COUNT_MIN && avgRR >= 1.5;
  const req3Done = loginStreak >= STREAK_MIN;
  const allDone = req1Done && req2Done && req3Done;

  const doneCount = [req1Done, req2Done, req3Done].filter(Boolean).length;

  return (
    <main className="container-page rijexamen-page">
      {/* Back */}
      <div style={{ marginBottom: 12 }}>
        <Link href="/leren" className="page-back-btn">
          ← {isNL ? "Terug naar leren" : "Back to learning"}
        </Link>
      </div>

      {/* Hero */}
      <div className="rijexamen-hero">
        <div className="rijexamen-hero-icon">{allDone ? "🏎️" : "🏎️"}</div>
        <h1 className="rijexamen-title">
          {isNL ? "Road to Live Trading" : "Road to Live Trading"}
        </h1>
        <p className="rijexamen-subtitle">
          {isNL
            ? "Marcus beoordeelt of je klaar bent voor echt geld. Drie vereisten. Wanneer alles groen is, geeft Marcus je een persoonlijk certificaat."
            : "Marcus assesses whether you're ready for real money. Three requirements. When everything is green, Marcus gives you a personal certificate."}
        </p>
        {!loading && !allDone && (
          <div className="rijexamen-dots">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`rijexamen-dot${i < doneCount ? " done" : ""}`} />
            ))}
            <span className="rijexamen-dots-label">
              {doneCount}/3 {isNL ? "behaald" : "done"}
            </span>
          </div>
        )}
        {!loading && allDone && (
          <div className="rijexamen-ready-badge">
            {isNL ? "✓ Klaar voor live trading" : "✓ Ready for live trading"}
          </div>
        )}
      </div>

      {/* Marcus intro — static */}
      <div className="rijexamen-marcus-intro">
        <div className="rijexamen-cert-initial" style={{ flexShrink: 0 }}>M</div>
        <p className="rijexamen-marcus-text">
          {isNL
            ? "Iedereen kan een account openen en gaan traden. Maar dat maakt je nog geen trader. Ik kijk naar drie dingen: heb je de kennis, heb je de praktijk, en heb je de consistentie? Pas als alle drie groen zijn, ben je klaar."
            : "Anyone can open an account and start trading. That doesn't make you a trader. I look at three things: do you have the knowledge, the practice, and the consistency? Only when all three are green are you ready."}
        </p>
      </div>

      {/* Requirements */}
      <div className="rijexamen-requirements">
        {loading ? (
          <>
            <ReqCardSkeleton />
            <ReqCardSkeleton />
            <ReqCardSkeleton />
          </>
        ) : (
          <>
            <ReqCard
              icon="📚"
              title={isNL ? "Curriculum voltooid" : "Curriculum completed"}
              description={isNL
                ? "Alle 5 quizniveaus afgerond — van basiskennis tot geavanceerde technieken."
                : "All 5 quiz levels completed — from basics to advanced techniques."}
              pct={pct1}
              label={isNL
                ? `Level ${quizLevel} / ${QUIZ_LEVEL_MIN}`
                : `Level ${quizLevel} / ${QUIZ_LEVEL_MIN}`}
              done={req1Done}
              lang={lang}
            />

            <ReqCard
              icon="📊"
              title={isNL ? "Paper trades" : "Paper trades"}
              description={isNL
                ? "20 winstgevende trades met een gemiddelde R/R ≥ 1:2 — aangetoond dat je risico bewust beheert."
                : "20 profitable trades with average R/R ≥ 1:2 — proving you manage risk consciously."}
              pct={pct2}
              label={isNL
                ? `${qualified} / ${TRADE_COUNT_MIN} trades · Gem. R/R 1:${avgRR.toFixed(2)}`
                : `${qualified} / ${TRADE_COUNT_MIN} trades · Avg R/R 1:${avgRR.toFixed(2)}`}
              done={req2Done}
              lang={lang}
            />

            <ReqCard
              icon="🔥"
              title={isNL ? "14 dagelijkse missies" : "14 daily missions"}
              description={isNL
                ? "14 dagen aaneengesloten actief — consistentie is de basis van alles."
                : "14 consecutive days of activity — consistency is the foundation of everything."}
              pct={pct3}
              label={isNL
                ? `${loginStreak} / ${STREAK_MIN} ${loginStreak === 1 ? "dag" : "dagen"}`
                : `${loginStreak} / ${STREAK_MIN} ${loginStreak === 1 ? "day" : "days"}`}
              done={req3Done}
              lang={lang}
            />
          </>
        )}
      </div>

      {/* Next steps (when not all done) */}
      {!loading && !allDone && (
        <div className="rijexamen-next card">
          <div className="rijexamen-next-title">
            {isNL ? "Volgende stappen" : "Next steps"}
          </div>
          <div className="rijexamen-next-links">
            {!req1Done && (
              <Link href="/leren" className="rijexamen-next-link">
                📚{" "}
                {isNL
                  ? `Ga door met leren (level ${quizLevel} → 5)`
                  : `Keep learning (level ${quizLevel} → 5)`}
              </Link>
            )}
            {!req2Done && (
              <Link href="/trade" className="rijexamen-next-link">
                📊{" "}
                {isNL
                  ? qualified < TRADE_COUNT_MIN
                    ? `Doe paper trades (nog ${TRADE_COUNT_MIN - qualified} te gaan)`
                    : "Verbeter je R/R ratio (doel: ≥ 1:2)"
                  : qualified < TRADE_COUNT_MIN
                  ? `Do paper trades (${TRADE_COUNT_MIN - qualified} more to go)`
                  : "Improve your R/R ratio (goal: ≥ 1:2)"}
              </Link>
            )}
            {!req3Done && (
              <Link href="/dashboard" className="rijexamen-next-link">
                🔥{" "}
                {isNL
                  ? `Houd je streak bij (nog ${STREAK_MIN - loginStreak} dagen)`
                  : `Keep your streak (${STREAK_MIN - loginStreak} days to go)`}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Certificate section */}
      {!loading && allDone && (
        <>
          <div className="rijexamen-cert-section">
            <div className="rijexamen-cert-title">
              {isNL ? "Jouw certificaat van Marcus" : "Your certificate from Marcus"}
            </div>
            <CertBlock isNL={isNL} certificate={certificate} loading={certLoading} />
          </div>

          {/* Affiliate / exchange recommendation */}
          <AffiliateSection isNL={isNL} />
        </>
      )}
    </main>
  );
}
