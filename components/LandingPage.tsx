import Link from "next/link";

export default function LandingPage({ loggedIn = false }: { loggedIn?: boolean }) {
  return (
    <div className="landing-wrap">

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-badge">🔥 Vroege toegang — straks €24,99/maand</div>
          <h1 className="landing-title">
            Leer traden met<br />
            <span className="landing-title-accent">Marcus, jouw mentor</span>
          </h1>
          <p className="landing-subtitle">
            Marcus kent jouw niveau, jouw trades en jouw fouten.
            Hij coacht je elke dag — van je eerste trade tot je eigen strategie.
          </p>
          <div className="landing-cta-row">
            {loggedIn ? (
              <Link href="/dashboard" className="landing-btn-primary">
                Naar dashboard →
              </Link>
            ) : (
              <>
                <Link href="/auth/register" className="landing-btn-primary">
                  Start nu voor <span className="landing-btn-price">€9,99/mnd</span> →
                </Link>
                <Link href="/auth/login" className="landing-btn-ghost">
                  Al een account? Inloggen
                </Link>
              </>
            )}
          </div>
          <div className="landing-price-note">
            Nu €9,99/maand · Geen creditcard nodig · Prijs gaat omhoog
          </div>
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
              <span className="landing-mock-badge green">Goed moment</span>
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
                BTC breekt uit boven weerstand. Dit is een goede setup voor swing traders.
                <br /><strong>📌 Opdracht: open een kleine paper trade van €100</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── USPs ── */}
      <section className="landing-usps">
        <div className="landing-usp-card">
          <div className="landing-usp-icon">🤖</div>
          <h3 className="landing-usp-title">Marcus — jouw mentor</h3>
          <p className="landing-usp-text">
            Geen chatbot. Marcus kent jouw niveau, jouw trades en jouw zwakke punten.
            Hij geeft je elke dag één concrete opdracht — niet meer, niet minder.
          </p>
        </div>
        <div className="landing-usp-card">
          <div className="landing-usp-icon">📊</div>
          <h3 className="landing-usp-title">Paper trading met live data</h3>
          <p className="landing-usp-text">
            Oefen met echte marktprijzen zonder echt geld te riskeren.
            Zie je P&amp;L groeien terwijl je leert.
          </p>
        </div>
        <div className="landing-usp-card">
          <div className="landing-usp-icon">📅</div>
          <h3 className="landing-usp-title">Trading agenda</h3>
          <p className="landing-usp-text">
            Log elke trade, je emoties en je gedachten. Marcus analyseert je patronen
            en vertelt je waar je geld verliest.
          </p>
        </div>
        <div className="landing-usp-card">
          <div className="landing-usp-icon">🎓</div>
          <h3 className="landing-usp-title">Leer terwijl je tradt</h3>
          <p className="landing-usp-text">
            Dagelijkse quizzen, lessen van Mark Douglas tot ICT — afgestemd op jouw niveau.
            Van beginner naar zelfstandige trader in 3 maanden.
          </p>
        </div>
      </section>

      {/* ── Hoe het werkt ── */}
      <section className="landing-steps">
        <h2 className="landing-section-title">Hoe het werkt</h2>
        <div className="landing-steps-row">
          <div className="landing-step">
            <div className="landing-step-num">1</div>
            <h4>Maak een account</h4>
            <p>€9,99/maand, geen creditcard nodig. In 30 seconden aangemeld.</p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-num">2</div>
            <h4>Marcus leert je kennen</h4>
            <p>Hij stelt je niveau in en geeft je eerste opdracht.</p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-num">3</div>
            <h4>Trade en leer elke dag</h4>
            <p>Paper trades, live coaching, dagelijkse feedback.</p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-num">4</div>
            <h4>Trade zelfstandig</h4>
            <p>Na 3 maanden ken je je eigen strategie.</p>
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
            <div className="landing-pricing-sublabel">per maand · nu · straks €24,99/mnd</div>
          </div>
          <div className="landing-pricing-divider" />
          <ul className="landing-pricing-list">
            <li>✓ Volledige toegang tot Marcus AI-coach</li>
            <li>✓ Live marktscanner &amp; grafieken</li>
            <li>✓ 65+ tradinglessen</li>
            <li>✓ Prijsalerts &amp; push-notificaties</li>
            <li>✓ Bitvavo-koppeling</li>
            <li>✓ Alle toekomstige updates</li>
            <li className="landing-pricing-no">✗ Geen maandelijkse kosten</li>
            <li className="landing-pricing-no">✗ Geen creditcard nodig</li>
            <li className="landing-pricing-no">✗ Geen verborgen kosten</li>
          </ul>
          {!loggedIn && (
            <Link href="/auth/register" className="landing-btn-primary landing-pricing-cta">
              Begin voor €9,99/maand →
            </Link>
          )}
        </div>
      </section>

      {/* ── CTA onderaan ── */}
      <section className="landing-final-cta">
        <h2>Nu €9,99/maand. Straks €24,99.</h2>
        <p>Vroege gebruikers houden hun prijs. Geen creditcard nodig.</p>
        {loggedIn ? (
          <Link href="/dashboard" className="landing-btn-primary" style={{ fontSize: 18, padding: "16px 40px" }}>
            Naar dashboard →
          </Link>
        ) : (
          <Link href="/auth/register" className="landing-btn-primary" style={{ fontSize: 18, padding: "16px 40px" }}>
            Begin voor €9,99/maand →
          </Link>
        )}
      </section>

    </div>
  );
}
