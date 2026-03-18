"use client";
import Link from "next/link";

const SECTIONS = [
  {
    icon: "📈",
    title: "Traden",
    items: [
      { q: "Wat zie ik op het tradescherm?", a: "De grafiek toont de echte marktprijs van het asset dat je gekozen hebt. Groene/rode kaarsen zijn prijsbewegingen. De gekleurde zones zijn koopzone (groen), stop-loss (rood) en weerstand (oranje)." },
      { q: "Wat zijn de tijdframes?", a: "1m en 5m zijn voor snelle traders (scalpen). 15m en 1H zijn voor dagtraders. 1D is voor wie wekelijks tradt. Multi toont 3 tijdframes tegelijk voor een volledig beeld." },
      { q: "Wat betekent de kleur van de status?", a: "Groen = goed moment om te kijken voor een koop. Oranje = wachten. Rood = vermijden. Dit is gebaseerd op RSI, trend en marktstructuur." },
      { q: "Wat is de koopzone?", a: "Het prijsbereik dat onze AI als interessant beschouwt voor een mogelijke koop. Wacht tot de prijs hier staat voordat je instapt." },
    ],
  },
  {
    icon: "🤖",
    title: "Marcus AI (Mentor)",
    items: [
      { q: "Wie is Marcus?", a: "Marcus is jouw virtuele tradingmentor. Hij analyseert de markt en geeft uitleg op jouw niveau — of je nu beginner of gevorderde bent." },
      { q: "Hoe gebruik ik de snelle vraagknoppen?", a: "Klik op één van de chips (bijv. 'Moet ik nu kopen?') om direct een vraag te stellen. Je kan ook zelf typen en op Enter drukken of de pijlknop klikken." },
      { q: "Waarom geeft Marcus geen advies tijdens het laden?", a: "Als Marcus bezig is met een antwoord, zie je 'Denkt na...'. Wacht even — daarna kan je gewoon verder vragen." },
      { q: "Kan ik het gesprek wissen?", a: "Ja, klik op 'Wis chat' bovenaan het chatvenster. Marcus begint dan opnieuw met een verse analyse." },
    ],
  },
  {
    icon: "💰",
    title: "Paper Trading (nep geld)",
    items: [
      { q: "Wat is paper trading?", a: "Je tradt met nep geld zodat je kunt oefenen zonder echt geld te verliezen. Alles werkt zoals echt, behalve dat de verliezen en winsten niet echt zijn." },
      { q: "Hoe koop ik?", a: "Ga naar het 'Paper Trading' tabblad, kies een bedrag (of gebruik 5%/10%/25%/Max), en klik op 'Kopen'. De trade wordt uitgevoerd op de huidige marktprijs." },
      { q: "Hoe verkoop ik?", a: "Als je een open positie hebt, zie je de 'Verkopen' knop. Klik erop om je positie te sluiten. Je ziet meteen je winst of verlies." },
      { q: "Wat is mijn startkapitaal?", a: "Je admin stelt het startkapitaal in (standaard €10.000). Je kunt dit zien bovenaan het paper trading paneel." },
    ],
  },
  {
    icon: "🎯",
    title: "Doel stellen",
    items: [
      { q: "Wat is het doel?", a: "Op de Statistieken pagina kan je een doelbedrag instellen. Bijv: 'Ik wil groeien van €10.000 naar €11.000'. De voortgangsbalk toont hoever je bent." },
      { q: "Hoe stel ik een doel in?", a: "Ga naar Statistieken → klik op 'Doel instellen' → vul een bedrag in dat hoger is dan je startkapitaal → sla op. 10% groei is al uitstekend." },
    ],
  },
  {
    icon: "🧠",
    title: "Quiz",
    items: [
      { q: "Wat is de dagelijkse quiz?", a: "Elke dag krijg je 5 vragen over trading. Je verdient XP (ervaringspunten) en bouwt een streak op. Hoe meer je leert, hoe moeilijker de vragen worden." },
      { q: "Wat zijn zwakke topics?", a: "Als je een categorie vaker fout hebt, wordt dat een zwak topic. Marcus past zijn uitleg automatisch aan om je daarin te helpen." },
    ],
  },
  {
    icon: "📊",
    title: "Statistieken",
    items: [
      { q: "Wat zie ik op de statistieken pagina?", a: "Je ziet je totale winst/verlies, welke dag je het best tradt, en per asset hoe goed je presteert. Dit helpt je patronen te herkennen in je eigen gedrag." },
    ],
  },
  {
    icon: "📰",
    title: "Nieuws & Leren",
    items: [
      { q: "Wat staat er in het nieuws?", a: "Het nieuwsblok toont het laatste financiële nieuws voor het asset dat je bekijkt. Nieuws beïnvloedt vaak de prijs — goed om te volgen." },
      { q: "Wat staat er op de leerpagina?", a: "Video's, artikelen en een gratis cursus om trading van nul te leren. Ideaal als je nog helemaal nieuw bent." },
    ],
  },
  {
    icon: "🏆",
    title: "Leaderboard",
    items: [
      { q: "Hoe kom ik op het leaderboard?", a: "Het leaderboard toont de traders met het hoogste paper trading saldo. Trade slim, bouw je saldo op en klim de ranglijst." },
    ],
  },
];

export default function HelpPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 60px" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/trade" className="page-back-btn">← Terug naar Traden</Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
        ❓ Hoe werkt Bitcoin Mentor?
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
        Alles uitgelegd voor beginners. Klik op een vraag om het antwoord te zien.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {SECTIONS.map((section) => (
          <section key={section.title} className="terminal-side-card">
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
              {section.icon} {section.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.items.map((item) => (
                <details key={item.q} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                  <summary style={{
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text)",
                    padding: "4px 0",
                    listStyle: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    {item.q}
                    <span style={{ color: "var(--text-secondary)", fontSize: 12, marginLeft: 8 }}>▼</span>
                  </summary>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.6, paddingLeft: 4 }}>
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="terminal-side-card" style={{ marginTop: 20, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
          Kom je er niet uit? Vraag het gewoon aan Marcus — hij legt alles uit op jouw niveau.
        </p>
        <Link href="/trade" className="terminal-btn terminal-btn-primary" style={{ display: "inline-block" }}>
          → Ga naar Traden
        </Link>
      </div>
    </main>
  );
}
