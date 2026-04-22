"use client";

// Live Ready — het eindpunt van het leerpad.
// Wanneer alle drie vereisten groen zijn verklaart Marcus je Live Ready.
// Sterkste upgrademoment van het platform + groeimechanisme via social share.

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

type LiveReadyData = {
  username: string;
  curriculum: { quizLevel: number; quizLevelMin: number; quizAvgScore: number; quizScoreMin: number; done: boolean };
  trades: { count: number; countMin: number; rrRatio: number; rrMin: number; done: boolean };
  streak: { days: number; daysMin: number; done: boolean };
  allDone: boolean;
  certificate: string | null;
  countryCode: string;
};

const EU_COUNTRIES = new Set([
  "NL","BE","AT","CH","DE","FR","ES","IT","PT","DK","SE","NO","FI","IE","LU","PL","CZ","HU","RO","SK","SI","HR","EE","LV","LT","BG","CY","GR","MT",
]);

const EXCHANGES = {
  bitvavo: {
    name: "Bitvavo",
    flag: "NL",
    taglineNL: "Laagste fees in de Benelux · iDEAL-storting · Nederlandse support",
    taglineEN: "Lowest fees in Benelux · Direct bank transfer · EU regulated",
    url: "https://bitvavo.com/?invite=BITCOINMENTOR",
    ctaNL: "→ Open account op Bitvavo",
    ctaEN: "→ Open account on Bitvavo",
    recommended: true,
  },
  bybit: {
    name: "Bybit",
    flag: "",
    taglineNL: "Wereldwijde exchange · Futures & spot · 0,1% fee",
    taglineEN: "Global exchange · Futures & spot · 0.1% fee",
    url: "https://www.bybit.com/invite?ref=BITCOINMENTOR",
    ctaNL: "→ Open account op Bybit",
    ctaEN: "→ Open account on Bybit",
    recommended: false,
  },
};

function Requirement({
  icon, title, subtitle, value, max, label, done, lang,
}: {
  icon: string; title: string; subtitle: string;
  value: number; max: number; label: string;
  done: boolean; lang: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`liveready-req${done ? " done" : ""}`}>
      <div className="liveready-req-header">
        <span className="liveready-req-icon">{done ? "✓" : icon}</span>
        <div className="liveready-req-info">
          <div className="liveready-req-title">{title}</div>
          <div className="liveready-req-subtitle">{subtitle}</div>
        </div>
        <div className={`liveready-req-badge${done ? " done" : ""}`}>
          {done ? (lang === "nl" ? "Behaald" : "Done") : `${pct}%`}
        </div>
      </div>
      <div className="liveready-req-bar">
        <div className={`liveready-req-bar-fill${done ? " done" : ""}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="liveready-req-label">{label}</div>
    </div>
  );
}

function AffiliateSection({ isNL, countryCode }: { isNL: boolean; countryCode: string }) {
  const isEU = EU_COUNTRIES.has(countryCode.toUpperCase());
  const primary   = isEU ? EXCHANGES.bitvavo : EXCHANGES.bybit;
  const secondary = isEU ? EXCHANGES.bybit   : EXCHANGES.bitvavo;

  return (
    <div className="liveready-affiliate-section no-print">
      <div className="liveready-affiliate-header">
        <div className="liveready-affiliate-avatar">M</div>
        <div>
          <div className="liveready-affiliate-label">
            {isNL ? "Marcus's aanbeveling" : "Marcus's recommendation"}
          </div>
          <p className="liveready-affiliate-text">
            {isNL
              ? `Je bent klaar voor live trading. ${isEU ? "Voor traders in de EU gebruik ik Bitvavo — gereguleerd, laagste fees, directe bankstorting." : "Voor internationale traders is Bybit mijn keuze — laag fees, uitgebreide tools, betrouwbaar."}`
              : `You're ready for live trading. ${isEU ? "For EU traders I use Bitvavo — regulated, lowest fees, instant bank deposit." : "For international traders Bybit is my choice — low fees, advanced tools, reliable."}`}
          </p>
        </div>
      </div>

      {/* Primaire aanbeveling */}
      <a
        href={primary.url}
        target="_blank"
        rel="noopener noreferrer"
        className="liveready-exchange-card liveready-exchange-card--primary"
      >
        <div className="liveready-exchange-flag">{primary.flag}</div>
        <div className="liveready-exchange-info">
          <div className="liveready-exchange-name">
            {primary.name}
            <span className="liveready-exchange-rec">
              {isNL ? "Aanbevolen" : "Recommended"}
            </span>
          </div>
          <div className="liveready-exchange-tagline">
            {isNL ? primary.taglineNL : primary.taglineEN}
          </div>
        </div>
        <div className="liveready-exchange-cta">
          {isNL ? primary.ctaNL : primary.ctaEN}
        </div>
      </a>

      {/* Secundaire optie */}
      <a
        href={secondary.url}
        target="_blank"
        rel="noopener noreferrer"
        className="liveready-exchange-card"
      >
        <div className="liveready-exchange-flag">{secondary.flag}</div>
        <div className="liveready-exchange-info">
          <div className="liveready-exchange-name">{secondary.name}</div>
          <div className="liveready-exchange-tagline">
            {isNL ? secondary.taglineNL : secondary.taglineEN}
          </div>
        </div>
        <div className="liveready-exchange-cta liveready-exchange-cta--secondary">
          {isNL ? secondary.ctaNL : secondary.ctaEN}
        </div>
      </a>

      <p className="liveready-affiliate-disclaimer">
        {isNL
          ? "Bitcoin Mentor ontvangt mogelijk een vergoeding via deze links. Jij betaalt nooit meer — soms zelfs minder via onze partner-deal."
          : "Bitcoin Mentor may receive a referral fee via these links. You never pay more — sometimes even less through our partner deal."}
      </p>
    </div>
  );
}

export default function LiveReadyPage() {
  const { lang } = useLanguage();
  const [data, setData] = useState<LiveReadyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);
  const isNL = lang === "nl";

  useEffect(() => {
    fetch("/api/me/live-ready")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/me/pro")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.isPro) setIsPro(true); })
      .catch(() => {});
  }, []);

  function share() {
    if (!data?.certificate) return;
    const text = isNL
      ? `Marcus heeft mij Live Ready verklaard op Bitcoin Mentor\n\n"${data.certificate}"\n\n${data.trades.count} paper trades · ${data.streak.days} dagen streak · 5 niveaus voltooid\n\nhttps://bitcoinmentor.be`
      : `Marcus declared me Live Ready on Bitcoin Mentor\n\n"${data.certificate}"\n\n${data.trades.count} paper trades · ${data.streak.days} day streak · 5 levels completed\n\nhttps://bitcoinmentor.be`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {});
  }

  if (loading) {
    return (
      <main className="container-page">
        <div className="liveready-loading">
          <div className="liveready-loading-pulse" />
          {isNL ? "Marcus beoordeelt jouw voortgang…" : "Marcus is reviewing your progress…"}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container-page">
        <Link href="/leren" className="page-back-btn" style={{ display: "inline-block", marginBottom: 16 }}>
          ← {isNL ? "Terug" : "Back"}
        </Link>
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          {isNL ? "Kon voortgang niet laden." : "Could not load progress."}
        </div>
      </main>
    );
  }

  const doneCount = [data.curriculum.done, data.trades.done, data.streak.done].filter(Boolean).length;

  return (
    <main className="container-page">
      {/* Terug */}
      <div style={{ marginBottom: 12 }} className="no-print">
        <Link href="/leren" className="page-back-btn">
          ← {isNL ? "Terug naar leren" : "Back to learning"}
        </Link>
      </div>

      {/* Hero */}
      <div className="liveready-hero no-print">
        {data.allDone ? (
          <>
            <div className="liveready-hero-seal">▲</div>
            <h1 className="liveready-title">
              {isNL ? "Je bent Live Ready" : "You're Live Ready"}
            </h1>
            <p className="liveready-subtitle">
              {isNL
                ? "Marcus heeft jouw voortgang beoordeeld. Je hebt bewezen klaar te zijn voor live trading."
                : "Marcus has reviewed your progress. You've proven you're ready for live trading."}
            </p>
          </>
        ) : (
          <>
            <div className="liveready-hero-seal" style={{ fontSize: 48 }}>◉</div>
            <h1 className="liveready-title">
              {isNL ? "Ben jij Live Ready?" : "Are you Live Ready?"}
            </h1>
            <p className="liveready-subtitle">
              {isNL
                ? "Drie vereisten. Wanneer alles groen is, verklaart Marcus je Live Ready."
                : "Three requirements. When everything is green, Marcus declares you Live Ready."}
            </p>
            <div className="liveready-progress-summary">
              {[0, 1, 2].map(i => (
                <span key={i} className={`liveready-dot${i < doneCount ? " done" : ""}`} />
              ))}
              <span className="liveready-progress-text">
                {doneCount}/3 {isNL ? "behaald" : "done"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Vereisten */}
      <div className="liveready-requirements">
        <Requirement
          icon="○"
          title={isNL ? "Curriculum niveau 1–5" : "Curriculum levels 1–5"}
          subtitle={isNL ? "Alle niveaus afgerond · Gemiddelde quizscore ≥ 70%" : "All levels completed · Average quiz score ≥ 70%"}
          value={Math.min(100,
            Math.round(((data.curriculum.quizLevel - 1) / (data.curriculum.quizLevelMin - 1)) * 70) +
            Math.round((Math.min(data.curriculum.quizAvgScore, data.curriculum.quizScoreMin) / data.curriculum.quizScoreMin) * 30)
          )}
          max={100}
          label={isNL
            ? `Level ${data.curriculum.quizLevel}/5 · Score: ${data.curriculum.quizAvgScore}%`
            : `Level ${data.curriculum.quizLevel}/5 · Score: ${data.curriculum.quizAvgScore}%`}
          done={data.curriculum.done}
          lang={lang}
        />

        <Requirement
          icon="≡"
          title={isNL ? "20 paper trades" : "20 paper trades"}
          subtitle={isNL
            ? `Min. ${data.trades.countMin} afgeronde trades · Gem. R/R ≥ 1:${data.trades.rrMin}`
            : `Min. ${data.trades.countMin} closed trades · Avg R/R ≥ 1:${data.trades.rrMin}`}
          value={data.trades.count}
          max={data.trades.countMin}
          label={isNL
            ? `${data.trades.count}/${data.trades.countMin} trades · Gem. R/R 1:${data.trades.rrRatio.toFixed(2)}`
            : `${data.trades.count}/${data.trades.countMin} trades · Avg R/R 1:${data.trades.rrRatio.toFixed(2)}`}
          done={data.trades.done}
          lang={lang}
        />

        <Requirement
          icon="↑"
          title={isNL ? "14 dagen consistentie" : "14 days consistency"}
          subtitle={isNL ? "14 aaneengesloten dagen dagelijks actief" : "14 consecutive days of daily activity"}
          value={data.streak.days}
          max={data.streak.daysMin}
          label={isNL
            ? `${data.streak.days}/${data.streak.daysMin} dagen`
            : `${data.streak.days}/${data.streak.daysMin} days`}
          done={data.streak.done}
          lang={lang}
        />
      </div>

      {/* Nog niet klaar */}
      {!data.allDone && (
        <div className="card liveready-next no-print">
          <div className="liveready-affiliate-teaser">
            {isNL
              ? "Als je Live Ready bent, geeft Marcus je persoonlijk advies over de beste exchange voor jouw regio."
              : "When you're Live Ready, Marcus will personally recommend the best exchange for your region."}</div>
          <p className="liveready-next-text">
            {isNL ? "Volgende stappen:" : "Next steps:"}
          </p>
          <div className="liveready-next-actions">
            {!data.curriculum.done && (
              <Link href="/leren" className="liveready-action-link">
                {isNL ? "Ga verder met leren" : "Continue learning"}
              </Link>
            )}
            {!data.trades.done && (
              <Link href="/trade" className="liveready-action-link">
                {isNL
                  ? `Doe paper trades (${data.trades.countMin - data.trades.count > 0 ? `nog ${data.trades.countMin - data.trades.count}` : "R/R verbeteren"})`
                  : `Do paper trades (${data.trades.countMin - data.trades.count > 0 ? `${data.trades.countMin - data.trades.count} more` : "improve R/R"})`}
              </Link>
            )}
            {!data.streak.done && (
              <Link href="/dashboard" className="liveready-action-link">
                {isNL ? `Houd je streak bij (nog ${data.streak.daysMin - data.streak.days} dagen)` : `Keep your streak (${data.streak.daysMin - data.streak.days} days to go)`}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Certificaat — alleen voor PRO */}
      {data.allDone && !isPro && (
        <div className="card liveready-pro-gate">
          <div className="liveready-pro-gate-seal">▲</div>
          <h2 className="liveready-pro-gate-title">
            {isNL ? "Je bent klaar — haal je certificaat" : "You're ready — claim your certificate"}
          </h2>
          <p className="liveready-pro-gate-text">
            {isNL
              ? "Je hebt alle vereisten behaald. Upgrade naar Marcus Pro om je Live Ready certificaat te genereren en te delen."
              : "You've met all requirements. Upgrade to Marcus Pro to generate and share your Live Ready certificate."}
          </p>
          <Link href="/pro" className="liveready-pro-gate-cta">
            {isNL ? "▲ Upgrade naar Marcus Pro" : "▲ Upgrade to Marcus Pro"}
          </Link>
        </div>
      )}

      {data.allDone && isPro && data.certificate && (
        <>
          <div className="liveready-certificate" ref={certRef}>
            <div className="liveready-cert-header">
              <span className="liveready-cert-brand">Bitcoin Mentor</span>
              <span className="liveready-cert-tag">Live Ready</span>
            </div>
            <div className="liveready-cert-seal">▲</div>
            <h2 className="liveready-cert-name">{data.username}</h2>
            <p className="liveready-cert-label">
              {isNL ? "is Live Ready verklaard door Marcus" : "has been declared Live Ready by Marcus"}
            </p>
            <div className="liveready-cert-divider" />
            <blockquote className="liveready-cert-quote">"{data.certificate}"</blockquote>
            <div className="liveready-cert-footer">
              <span className="liveready-cert-signature">— Marcus</span>
              <span className="liveready-cert-date">
                {new Date().toLocaleDateString(isNL ? "nl-NL" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
            <div className="liveready-cert-stats">
              <div className="liveready-cert-stat">
                <span className="liveready-cert-stat-val">5/5</span>
                <span className="liveready-cert-stat-lbl">{isNL ? "Niveaus" : "Levels"}</span>
              </div>
              <div className="liveready-cert-stat">
                <span className="liveready-cert-stat-val">{data.trades.count}</span>
                <span className="liveready-cert-stat-lbl">{isNL ? "Trades" : "Trades"}</span>
              </div>
              <div className="liveready-cert-stat">
                <span className="liveready-cert-stat-val">{data.streak.days}d</span>
                <span className="liveready-cert-stat-lbl">{isNL ? "Streak" : "Streak"}</span>
              </div>
            </div>
          </div>

          {/* Acties */}
          <div className="liveready-cert-actions no-print">
            <button className="liveready-btn-primary" onClick={share}>
              {copied
                ? (isNL ? "✓ Gekopieerd!" : "✓ Copied!")
                : (isNL ? "Deel op social media" : "Share on social media")}
            </button>
            <button className="liveready-btn-secondary" onClick={() => window.print()}>
              {isNL ? "Print / Download" : "Print / Download"}
            </button>
          </div>

          {/* Affiliate — Marcus's persoonlijk exchange advies */}
          <AffiliateSection isNL={isNL} countryCode={data.countryCode} />
        </>
      )}
    </main>
  );
}
