"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { TrendingUp, Target, GraduationCap, Bell, Trophy } from "lucide-react";

const copy = {
  nl: {
    nav_login: "Inloggen",
    nav_cta: "Gratis starten",
    hero_label: "Marcus",
    hero_h1a: "",
    hero_h1b: "Begin met traden.",
    hero_sub: "Marcus is jouw persoonlijke trading coach. Hij kent jouw niveau, analyseert je trades en geeft je dagelijks één concrete opdracht.",
    hero_cta: "Start gratis →",
    hero_login: "Al een account?",
    ticker_label: "Live markt",
    feat_title: "Alles wat je nodig hebt",
    feat1_t: "Marcus — jouw mentor",
    feat1_s: "Geen generieke tips. Marcus kent jouw trades, jouw fouten en jouw niveau.",
    feat2_t: "Paper trading",
    feat2_s: "Oefen met echte marktprijzen zonder risico. Zie je P&L groeien terwijl je leert.",
    feat3_t: "Dagelijkse missies",
    feat3_s: "Elke dag één concrete opdracht. Kleine stappen, grote resultaten.",
    feat4_t: "Curriculum niveau 1–6",
    feat4_s: "Van basis tot Smart Money Concepts. Quizzes, lessen en live diagrammen.",
    feat5_t: "Prijs alerts",
    feat5_s: "Slaap rustig. Marcus waarschuwt je als de markt beweegt.",
    feat6_t: "Liga & vrienden",
    feat6_s: "Compete met vrienden. Wie houdt de langste streak vol?",
    stats_traders: "Actieve traders",
    stats_trades: "Paper trades",
    stats_rating: "Gemiddelde score",
    proof_title: "Traders over Marcus",
    proof1_q: "Na 3 maanden steeg mijn winrate van 35% naar 62%. Marcus leerde me stoppen met impulsief traden.",
    proof1_n: "Thomas K.", proof1_c: "Swing trader",
    proof2_q: "Eindelijk een platform dat in het Nederlands is en me écht helpt, zonder me geld af te troggelen.",
    proof2_n: "Lieke V.", proof2_c: "Beginner",
    proof3_q: "De paper trading modus is geniaal. Ik maak fouten zonder het te betalen met echt geld.",
    proof3_n: "Marco D.", proof3_c: "Day trader",
    cta_h: "Klaar om te beginnen?",
    cta_sub: "Gratis. Geen creditcard. Volledige toegang.",
    cta_btn: "Maak een account aan →",
    cta_login: "Inloggen",
  },
  en: {
    nav_login: "Log in",
    nav_cta: "Start free",
    hero_label: "Marcus",
    hero_h1a: "",
    hero_h1b: "Start trading.",
    hero_sub: "Marcus is your personal trading coach. He knows your level, analyses your trades and gives you one concrete assignment every day.",
    hero_cta: "Start for free →",
    hero_login: "Already have an account?",
    ticker_label: "Live market",
    feat_title: "Everything you need",
    feat1_t: "Marcus — your mentor",
    feat1_s: "No generic tips. Marcus knows your trades, your mistakes and your level.",
    feat2_t: "Paper trading",
    feat2_s: "Practice with real market prices without risk. Watch your P&L grow as you learn.",
    feat3_t: "Daily missions",
    feat3_s: "One concrete assignment every day. Small steps, big results.",
    feat4_t: "Curriculum level 1–6",
    feat4_s: "From basics to Smart Money Concepts. Quizzes, lessons and live diagrams.",
    feat5_t: "Price alerts",
    feat5_s: "Sleep well. Marcus warns you when the market moves.",
    feat6_t: "League & friends",
    feat6_s: "Compete with friends. Who keeps the longest streak?",
    stats_traders: "Active traders",
    stats_trades: "Paper trades",
    stats_rating: "Average rating",
    proof_title: "Traders about Marcus",
    proof1_q: "After 3 months my winrate went from 35% to 62%. Marcus taught me to stop trading impulsively.",
    proof1_n: "Thomas K.", proof1_c: "Swing trader",
    proof2_q: "Finally a platform in my language that actually helps me, without taking my money.",
    proof2_n: "Lieke V.", proof2_c: "Beginner",
    proof3_q: "The paper trading mode is genius. I make mistakes without paying for them with real money.",
    proof3_n: "Marco D.", proof3_c: "Day trader",
    cta_h: "Ready to start?",
    cta_sub: "Free. No credit card. Full access.",
    cta_btn: "Create an account →",
    cta_login: "Log in",
  },
};

const TICKER_ITEMS = [
  { sym: "BTC", price: "$97,420", chg: "+2.4%", up: true },
  { sym: "ETH", price: "$3,210", chg: "+1.8%", up: true },
  { sym: "SOL", price: "$142", chg: "-0.9%", up: false },
  { sym: "BNB", price: "$610", chg: "+0.5%", up: true },
  { sym: "XRP", price: "$0.62", chg: "-1.2%", up: false },
];

const FEATURES = (c: typeof copy["nl"]) => [
  { icon: "M", label: "Marcus", t: c.feat1_t, s: c.feat1_s, accent: true },
  { icon: <TrendingUp size={22} />, t: c.feat2_t, s: c.feat2_s, accent: false },
  { icon: <Target size={22} />, t: c.feat3_t, s: c.feat3_s, accent: false },
  { icon: <GraduationCap size={22} />, t: c.feat4_t, s: c.feat4_s, accent: false },
  { icon: <Bell size={22} />, t: c.feat5_t, s: c.feat5_s, accent: false },
  { icon: <Trophy size={22} />, t: c.feat6_t, s: c.feat6_s, accent: false },
];

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
  const feats = FEATURES(c);

  return (
    <div className="lp-root">

      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <span className="lp-nav-btc">₿</span>
          <span className="lp-nav-name">Bitcoin Mentor</span>
        </div>
        <div className="lp-nav-right">
          <button className={`lp-lang${lang === "nl" ? " active" : ""}`} onClick={() => switchLang("nl")}>NL</button>
          <button className={`lp-lang${lang === "en" ? " active" : ""}`} onClick={() => switchLang("en")}>EN</button>
          {loggedIn ? (
            <Link href="/dashboard" className="lp-nav-cta">Dashboard →</Link>
          ) : (
            <>
              <Link href="/auth/login" className="lp-nav-login">{c.nav_login}</Link>
              <Link href="/auth/register" className="lp-nav-cta">{c.nav_cta}</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        {/* Achtergrond grid */}
        <div className="lp-hero-grid" aria-hidden="true" />
        {/* Glow orbs */}
        <div className="lp-orb lp-orb-1" aria-hidden="true" />
        <div className="lp-orb lp-orb-2" aria-hidden="true" />

        <div className="lp-hero-inner">
          <div className="lp-hero-label">{c.hero_label}</div>
          <h1 className="lp-hero-h1">
            <span className="lp-hero-h1-accent">{c.hero_h1b}</span>
          </h1>
          <p className="lp-hero-sub">{c.hero_sub}</p>
          <div className="lp-hero-ctas">
            {loggedIn ? (
              <Link href="/dashboard" className="lp-btn-primary">Naar dashboard →</Link>
            ) : (
              <>
                <Link href="/auth/register" className="lp-btn-primary">{c.hero_cta}</Link>
                <Link href="/auth/login" className="lp-btn-ghost">{c.hero_login}</Link>
              </>
            )}
          </div>
          <div className="lp-hero-note">Gratis · Geen creditcard · Volledig toegankelijk</div>
        </div>

        {/* Marcus preview card */}
        <div className="lp-hero-card">
          <div className="lp-card-header">
            <div className="lp-card-dot red" /><div className="lp-card-dot yellow" /><div className="lp-card-dot green" />
            <span className="lp-card-url">bitcoinmentor.be/dashboard</span>
          </div>
          <div className="lp-card-body">
            <div className="lp-card-price-row">
              <span className="lp-card-asset">BTC/USDT</span>
              <span className="lp-card-price">$97,420</span>
              <span className="lp-card-badge">+2.4%</span>
            </div>
            <div className="lp-card-chart">
              <svg viewBox="0 0 280 70" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                <defs>
                  <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e91e63" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#e91e63" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,55 L35,48 L70,44 L105,40 L120,43 L145,30 L170,22 L200,16 L230,11 L260,6 L280,4 L280,70 L0,70Z" fill="url(#lg)" />
                <path d="M0,55 L35,48 L70,44 L105,40 L120,43 L145,30 L170,22 L200,16 L230,11 L260,6 L280,4" fill="none" stroke="#e91e63" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="lp-card-marcus">
              <div className="lp-card-m">M</div>
              <div className="lp-card-bubble">
                <div className="lp-card-bubble-text">BTC breekt uit boven weerstand. Goed moment voor een swing long.</div>
                <div className="lp-card-mission">📌 Opdracht: open een paper trade van max 2% risico</div>
              </div>
            </div>
            <div className="lp-card-missions">
              <div className="lp-card-mission-row done">✓ Morning brief gelezen</div>
              <div className="lp-card-mission-row done">✓ Quiz gemaakt (+40 XP)</div>
              <div className="lp-card-mission-row active">→ Trade openen</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ticker strip ── */}
      <div className="lp-ticker">
        <span className="lp-ticker-label">{c.ticker_label}</span>
        <div className="lp-ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
            <div key={i} className="lp-ticker-item">
              <span className="lp-ticker-sym">{t.sym}</span>
              <span className="lp-ticker-price">{t.price}</span>
              <span className={`lp-ticker-chg ${t.up ? "up" : "dn"}`}>{t.chg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats ── */}
      <section className="lp-stats">
        {[
          { val: "500+", lbl: c.stats_traders },
          { val: "25.000+", lbl: c.stats_trades },
          { val: "4.8/5", lbl: c.stats_rating },
        ].map((s) => (
          <div key={s.lbl} className="lp-stat">
            <span className="lp-stat-val">{s.val}</span>
            <span className="lp-stat-lbl">{s.lbl}</span>
          </div>
        ))}
      </section>

      {/* ── Features grid ── */}
      <section className="lp-features">
        <h2 className="lp-section-h">{c.feat_title}</h2>
        <div className="lp-features-grid">
          {feats.map((f, i) => (
            <div key={i} className={`lp-feat-card${f.accent ? " lp-feat-card--accent" : ""}${i === 0 ? " lp-feat-card--wide" : ""}`}>
              <div className={`lp-feat-icon${f.accent ? " lp-feat-icon--m" : ""}`}>{f.icon}</div>
              <h3 className="lp-feat-title">{f.t}</h3>
              <p className="lp-feat-sub">{f.s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="lp-proof">
        <h2 className="lp-section-h">{c.proof_title}</h2>
        <div className="lp-proof-grid">
          {[
            { q: c.proof1_q, n: c.proof1_n, ctx: c.proof1_c, init: "TK" },
            { q: c.proof2_q, n: c.proof2_n, ctx: c.proof2_c, init: "LV" },
            { q: c.proof3_q, n: c.proof3_n, ctx: c.proof3_c, init: "MD" },
          ].map((p) => (
            <div key={p.n} className="lp-proof-card">
              <div className="lp-proof-stars">★★★★★</div>
              <p className="lp-proof-q">&ldquo;{p.q}&rdquo;</p>
              <div className="lp-proof-author">
                <div className="lp-proof-avatar">{p.init}</div>
                <div>
                  <div className="lp-proof-name">{p.n}</div>
                  <div className="lp-proof-ctx">{p.ctx}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-cta-section">
        <div className="lp-cta-box">
          <div className="lp-cta-orb" aria-hidden="true" />
          <div className="lp-cta-btc" aria-hidden="true">₿</div>
          <h2 className="lp-cta-h">{c.cta_h}</h2>
          <p className="lp-cta-sub">{c.cta_sub}</p>
          <div className="lp-cta-btns">
            {loggedIn ? (
              <Link href="/dashboard" className="lp-btn-primary">Naar dashboard →</Link>
            ) : (
              <>
                <Link href="/auth/register" className="lp-btn-primary lp-btn-lg">{c.cta_btn}</Link>
                <Link href="/auth/login" className="lp-btn-ghost">{c.cta_login}</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <span>© 2026 Bitcoin Mentor</span>
        <div className="lp-footer-links">
          <Link href="/auth/login">{c.nav_login}</Link>
          <Link href="/auth/register">{c.nav_cta}</Link>
        </div>
      </footer>
    </div>
  );
}
