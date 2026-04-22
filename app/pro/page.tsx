"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";

const FEATURES_FREE = [
  { nl: "Niveau 1 & 2 curriculum", en: "Level 1 & 2 curriculum" },
  { nl: "Dagelijkse quiz (basis)", en: "Daily quiz (basic)" },
  { nl: "5 Marcus-berichten/dag", en: "5 Marcus messages/day" },
  { nl: "Paper trading", en: "Paper trading" },
  { nl: "Streak & missies", en: "Streak & missions" },
];

const FEATURES_PRO = [
  { nl: "Alle 10 niveaus curriculum", en: "All 10 levels curriculum", star: true },
  { nl: "Onbeperkte Marcus chat", en: "Unlimited Marcus chat", star: true },
  { nl: "Road to Live Trading certificaat", en: "Road to Live Trading certificate", star: true },
  { nl: "League systeem", en: "League system" },
  { nl: "Streak Freeze (wekelijks)", en: "Streak Freeze (weekly)" },
  { nl: "Paper trade debrief door Marcus", en: "Paper trade debrief by Marcus" },
  { nl: "Dagelijkse journal prompt", en: "Daily journal prompt" },
  { nl: "Slump detectie & aanpassing", en: "Slump detection & adjustment" },
];

const PLANS = [
  { key: "monthly", labelNL: "Maandelijks", labelEN: "Monthly", price: "€9,99", unit: "/maand", unitEN: "/month", saving: null },
  { key: "yearly",  labelNL: "Jaarlijks",   labelEN: "Yearly",  price: "€79",   unit: "/jaar",  unitEN: "/year",  saving: "Bespaar €41" },
];

export default function ProPage() {
  const { data: session } = useSession();
  const { lang } = useLanguage();
  const isNL = lang === "nl";

  const [plan, setPlan] = useState("yearly");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function upgrade() {
    if (!session?.user) { window.location.href = "/auth/register"; return; }
    setLoading(true);
    await fetch("/api/me/pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="pro-page">
        <div className="pro-success-card">
          <div className="pro-success-icon">★</div>
          <h1 className="pro-success-title">
            {isNL ? "Aanvraag ontvangen!" : "Request received!"}
          </h1>
          <p className="pro-success-text">
            {isNL
              ? "Je ontvangt binnen 24 uur een e-mail met je betalingslink. Vragen? Mail naar pro@bitcoinmentor.be."
              : "You will receive a payment link by email within 24 hours. Questions? Email pro@bitcoinmentor.be."}
          </p>
          <Link href="/dashboard" className="pro-success-back">
            {isNL ? "Terug naar dashboard" : "Back to dashboard"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pro-page">
      <div className="pro-hero">
        <span className="pro-hero-badge">Marcus Pro</span>
        <h1 className="pro-hero-title">
          {isNL ? "Leer traden zoals de 5% die het wél lukt" : "Learn to trade like the 5% who succeed"}
        </h1>
        <p className="pro-hero-sub">
          {isNL
            ? "Niveau 3-10, onbeperkte coaching, certificaat en alles wat je nodig hebt om klaar te zijn voor live trading."
            : "Levels 3-10, unlimited coaching, certificate and everything you need to be ready for live trading."}
        </p>
      </div>

      {/* Plan selector */}
      <div className="pro-plans">
        {PLANS.map(p => (
          <button
            key={p.key}
            className={`pro-plan-card ${plan === p.key ? "pro-plan-card--active" : ""}`}
            onClick={() => setPlan(p.key)}
          >
            {p.saving && <span className="pro-plan-saving">{p.saving}</span>}
            <div className="pro-plan-label">{isNL ? p.labelNL : p.labelEN}</div>
            <div className="pro-plan-price">
              {p.price}
              <span className="pro-plan-unit">{isNL ? p.unit : p.unitEN}</span>
            </div>
          </button>
        ))}
      </div>

      <button className="pro-upgrade-btn" onClick={upgrade} disabled={loading}>
        {loading
          ? "…"
          : session?.user
            ? (isNL ? "▲ Activeer Marcus Pro" : "▲ Activate Marcus Pro")
            : (isNL ? "Gratis registreren →" : "Register for free →")}
      </button>

      {/* Feature comparison */}
      <div className="pro-compare">
        <div className="pro-compare-col">
          <div className="pro-compare-header pro-compare-header--free">
            {isNL ? "Gratis" : "Free"}
          </div>
          <ul className="pro-compare-list">
            {FEATURES_FREE.map((f, i) => (
              <li key={i} className="pro-compare-item pro-compare-item--free">
                <span className="pro-compare-check">✓</span>
                {isNL ? f.nl : f.en}
              </li>
            ))}
          </ul>
        </div>

        <div className="pro-compare-col pro-compare-col--pro">
          <div className="pro-compare-header pro-compare-header--pro">
            Marcus Pro ✦
          </div>
          <ul className="pro-compare-list">
            {FEATURES_FREE.map((f, i) => (
              <li key={i} className="pro-compare-item pro-compare-item--included">
                <span className="pro-compare-check">✓</span>
                {isNL ? f.nl : f.en}
              </li>
            ))}
            {FEATURES_PRO.map((f, i) => (
              <li key={i} className={`pro-compare-item pro-compare-item--pro ${f.star ? "pro-compare-item--star" : ""}`}>
                <span className="pro-compare-check">★</span>
                {isNL ? f.nl : f.en}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Social proof */}
      <div className="pro-social">
        <p className="pro-social-text">
          {isNL
            ? "\"Ik wist niet eens wat een R/R ratio was. Na 3 maanden Bitcoin Mentor Pro handel ik consistent winstgevend.\""
            : "\"I didn't even know what an R/R ratio was. After 3 months of Bitcoin Mentor Pro I trade consistently profitable.\""}
        </p>
        <p className="pro-social-name">— {isNL ? "Daan V., Gent" : "Daan V., Ghent"}</p>
      </div>
    </div>
  );
}
