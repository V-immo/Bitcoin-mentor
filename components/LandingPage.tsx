"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const copy = {
  nl: {
    badge: "🔥 Vroege toegang — straks €24,99/maand",
    h1a: "Leer traden met",
    h1b: "Marcus, jouw mentor",
    subtitle: "Marcus kent jouw niveau, jouw trades en jouw fouten. Hij coacht je elke dag — van je eerste trade tot je eigen strategie.",
    cta: "Start nu voor €9,99/mnd →",
    ctaDashboard: "Naar dashboard →",
    login: "Al een account? Inloggen",
    priceNote: "Nu €9,99/maand · Geen creditcard nodig · Prijs gaat omhoog",
    mockBubble: "BTC breekt uit boven weerstand. Dit is een goede setup voor swing traders.",
    mockTask: "📌 Opdracht: open een kleine paper trade van €100",
    usp1t: "Marcus — jouw mentor",
    usp1: "Geen chatbot. Marcus kent jouw niveau, jouw trades en jouw zwakke punten. Hij geeft je elke dag één concrete opdracht.",
    usp2t: "Paper trading met live data",
    usp2: "Oefen met echte marktprijzen zonder echt geld te riskeren. Zie je P&L groeien terwijl je leert.",
    usp3t: "Trading agenda",
    usp3: "Log elke trade, je emoties en je gedachten. Marcus analyseert je patronen en vertelt je waar je geld verliest.",
    usp4t: "Leer terwijl je tradt",
    usp4: "Dagelijkse quizzen, lessen van Mark Douglas tot ICT — afgestemd op jouw niveau.",
    stepsTitle: "Hoe het werkt",
    s1t: "Maak een account", s1: "€9,99/maand, geen creditcard. In 30 seconden aangemeld.",
    s2t: "Marcus leert je kennen", s2: "Hij stelt je niveau in en geeft je eerste opdracht.",
    s3t: "Trade en leer elke dag", s3: "Paper trades, live coaching, dagelijkse feedback.",
    s4t: "Trade zelfstandig", s4: "Na 3 maanden ken je je eigen strategie.",
    pricingLabel: "per maand · nu · straks €24,99/mnd",
    p1: "✓ Volledige toegang tot Marcus AI-coach",
    p2: "✓ Live marktscanner & grafieken",
    p3: "✓ 65+ tradinglessen",
    p4: "✓ Prijsalerts & push-notificaties",
    p5: "✓ Bitvavo-koppeling",
    p6: "✓ Alle toekomstige updates",
    p7: "✓ Maandelijks opzegbaar",
    p8: "✗ Geen creditcard nodig",
    p9: "✗ Geen verborgen kosten",
    pricingCta: "Begin voor €9,99/maand →",
    finalH: "Nu €9,99/maand. Straks €24,99.",
    finalSub: "Vroege gebruikers houden hun prijs. Geen creditcard nodig.",
    finalCta: "Begin voor €9,99/maand →",
  },
  en: {
    badge: "🔥 Early access — price goes up to €24.99/month",
    h1a: "Learn to trade with",
    h1b: "Marcus, your mentor",
    subtitle: "Marcus knows your level, your trades and your mistakes. He coaches you every day — from your first trade to your own strategy.",
    cta: "Start now for €9.99/mo →",
    ctaDashboard: "Go to dashboard →",
    login: "Already have an account? Log in",
    priceNote: "Now €9.99/month · No credit card needed · Price will increase",
    mockBubble: "BTC breaks out above resistance. This is a great setup for swing traders.",
    mockTask: "📌 Assignment: open a small paper trade of €100",
    usp1t: "Marcus — your mentor",
    usp1: "Not a chatbot. Marcus knows your level, your trades and your weak spots. He gives you one concrete assignment every day.",
    usp2t: "Paper trading with live data",
    usp2: "Practice with real market prices without risking real money. Watch your P&L grow as you learn.",
    usp3t: "Trading journal",
    usp3: "Log every trade, your emotions and thoughts. Marcus analyses your patterns and tells you where you're losing money.",
    usp4t: "Learn while you trade",
    usp4: "Daily quizzes, lessons from Mark Douglas to ICT — tailored to your level.",
    stepsTitle: "How it works",
    s1t: "Create an account", s1: "€9.99/month, no credit card. Signed up in 30 seconds.",
    s2t: "Marcus gets to know you", s2: "He sets your level and gives you your first assignment.",
    s3t: "Trade and learn every day", s3: "Paper trades, live coaching, daily feedback.",
    s4t: "Trade independently", s4: "After 3 months you know your own strategy.",
    pricingLabel: "per month · now · will become €24.99/mo",
    p1: "✓ Full access to Marcus AI-coach",
    p2: "✓ Live market scanner & charts",
    p3: "✓ 65+ trading lessons",
    p4: "✓ Price alerts & push notifications",
    p5: "✓ Bitvavo integration",
    p6: "✓ All future updates",
    p7: "✓ Cancel anytime",
    p8: "✗ No credit card needed",
    p9: "✗ No hidden costs",
    pricingCta: "Start for €9.99/month →",
    finalH: "Now €9.99/month. Later €24.99.",
    finalSub: "Early users keep their price. No credit card needed.",
    finalCta: "Start for €9.99/month →",
  },
};

export default function LandingPage({ loggedIn = false }: { loggedIn?: boolean }) {
  const [lang, setLang] = useState<"nl" | "en">("nl");

  useEffect(() => {
    const stored = localStorage.getItem("app_lang");
    if (stored === "en") setLang("en");
  }, []);

  function switchLang(l: "nl" | "en") {
    setLang(l);
    localStorage.setItem("app_lang", l);
  }

  const c = copy[lang];

  return (
    <>
      {/* ── Nav-stijl header — alleen voor niet-ingelogde bezoekers ── */}
      {!loggedIn && (
        <nav className="app-nav">
          <Link href="/" className="app-nav-brand" style={{ textDecoration: "none" }}>
            <span className="app-nav-logo" style={{ fontFamily: "Arial, sans-serif" }}>₿</span>
            <span className="app-nav-name">Bitcoin Mentor</span>
          </Link>
          <div className="landing-top-right">
            <div className="landing-lang-toggle">
              <button
                className={`landing-lang-btn${lang === "nl" ? " active" : ""}`}
                onClick={() => switchLang("nl")}
              >🇳🇱 NL</button>
              <button
                className={`landing-lang-btn${lang === "en" ? " active" : ""}`}
                onClick={() => switchLang("en")}
              >🇬🇧 EN</button>
            </div>
            <Link href="/auth/login" className="landing-top-login">
              {lang === "nl" ? "Inloggen" : "Log in"}
            </Link>
          </div>
        </nav>
      )}

    <div className="landing-wrap">

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-badge">{c.badge}</div>
          <h1 className="landing-title">
            {c.h1a}<br />
            <span className="landing-title-accent">{c.h1b}</span>
          </h1>
          <p className="landing-subtitle">{c.subtitle}</p>
          <div className="landing-cta-row">
            {loggedIn ? (
              <Link href="/dashboard" className="landing-btn-primary">{c.ctaDashboard}</Link>
            ) : (
              <>
                <Link href="/auth/register" className="landing-btn-primary">{c.cta}</Link>
                <Link href="/auth/login" className="landing-btn-ghost">{c.login}</Link>
              </>
            )}
          </div>
          <div className="landing-price-note">{c.priceNote}</div>
        </div>

        {/* Mock dashboard preview */}
        <div className="landing-preview">
          <div className="landing-preview-bar">
            <span className="landing-preview-dot red" />
            <span className="landing-preview-dot yellow" />
            <span className="landing-preview-dot green" />
            <span className="landing-preview-url">bitcoinmentor.be</span>
          </div>
          <div className="landing-preview-content">
            <div className="landing-mock-header">
              <span className="landing-mock-asset">BTC/USDT</span>
              <span className="landing-mock-price">$97,420</span>
              <span className="landing-mock-badge green">{lang === "nl" ? "Goed moment" : "Good time"}</span>
            </div>
            <div className="landing-mock-chart">
              <svg viewBox="0 0 300 80" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e91e63" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#e91e63" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,60 L30,55 L60,50 L90,45 L120,48 L150,35 L180,25 L210,20 L240,15 L270,10 L300,8 L300,80 L0,80Z" fill="url(#chartGrad)" />
                <path d="M0,60 L30,55 L60,50 L90,45 L120,48 L150,35 L180,25 L210,20 L240,15 L270,10 L300,8" fill="none" stroke="#e91e63" strokeWidth="2" />
              </svg>
            </div>
            <div className="landing-mock-marcus">
              <span className="landing-mock-avatar">🤖</span>
              <div className="landing-mock-bubble">
                {c.mockBubble}<br /><strong>{c.mockTask}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── USPs ── */}
      <section className="landing-usps">
        <div className="landing-usp-card">
          <div className="landing-usp-icon">🤖</div>
          <h3 className="landing-usp-title">{c.usp1t}</h3>
          <p className="landing-usp-text">{c.usp1}</p>
        </div>
        <div className="landing-usp-card">
          <div className="landing-usp-icon">📊</div>
          <h3 className="landing-usp-title">{c.usp2t}</h3>
          <p className="landing-usp-text">{c.usp2}</p>
        </div>
        <div className="landing-usp-card">
          <div className="landing-usp-icon">📅</div>
          <h3 className="landing-usp-title">{c.usp3t}</h3>
          <p className="landing-usp-text">{c.usp3}</p>
        </div>
        <div className="landing-usp-card">
          <div className="landing-usp-icon">🎓</div>
          <h3 className="landing-usp-title">{c.usp4t}</h3>
          <p className="landing-usp-text">{c.usp4}</p>
        </div>
      </section>

      {/* ── Hoe het werkt ── */}
      <section className="landing-steps">
        <h2 className="landing-section-title">{c.stepsTitle}</h2>
        <div className="landing-steps-row">
          <div className="landing-step">
            <div className="landing-step-num">1</div>
            <h4>{c.s1t}</h4>
            <p>{c.s1}</p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-num">2</div>
            <h4>{c.s2t}</h4>
            <p>{c.s2}</p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-num">3</div>
            <h4>{c.s3t}</h4>
            <p>{c.s3}</p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-num">4</div>
            <h4>{c.s4t}</h4>
            <p>{c.s4}</p>
          </div>
        </div>
      </section>

      {/* ── Prijs ── */}
      <section className="landing-pricing-section">
        <div className="landing-pricing-box">
          <div className="landing-pricing-left">
            <div className="landing-pricing-amount">
              <span className="landing-pricing-currency">€</span>9,99
            </div>
            <div className="landing-pricing-sublabel">{c.pricingLabel}</div>
          </div>
          <div className="landing-pricing-divider" />
          <ul className="landing-pricing-list">
            <li>{c.p1}</li>
            <li>{c.p2}</li>
            <li>{c.p3}</li>
            <li>{c.p4}</li>
            <li>{c.p5}</li>
            <li>{c.p6}</li>
            <li>{c.p7}</li>
            <li className="landing-pricing-no">{c.p8}</li>
            <li className="landing-pricing-no">{c.p9}</li>
          </ul>
          {!loggedIn && (
            <Link href="/auth/register" className="landing-btn-primary landing-pricing-cta">
              {c.pricingCta}
            </Link>
          )}
        </div>
      </section>

      {/* ── CTA onderaan ── */}
      <section className="landing-final-cta">
        <h2>{c.finalH}</h2>
        <p>{c.finalSub}</p>
        {loggedIn ? (
          <Link href="/dashboard" className="landing-btn-primary" style={{ fontSize: 18, padding: "16px 40px" }}>
            {c.ctaDashboard}
          </Link>
        ) : (
          <Link href="/auth/register" className="landing-btn-primary" style={{ fontSize: 18, padding: "16px 40px" }}>
            {c.finalCta}
          </Link>
        )}
      </section>

    </div>
    </>
  );
}
