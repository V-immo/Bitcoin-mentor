"use client";

import Link from "next/link";
import { useState } from "react";

type Broker = {
  name: string;
  url: string;
  logo: string;
  tagline: string;
  assets: string[];
  pros: string[];
  cons: string[];
  regulated: boolean;
  minDeposit: string;
  badge?: string;
};

const BROKERS: Broker[] = [
  {
    name: "eToro",
    url: "https://www.etoro.com",
    logo: "🟢",
    tagline: "Sociaal traden voor beginners — aandelen, crypto, grondstoffen",
    assets: ["Crypto", "Aandelen", "ETFs", "Olie", "Goud"],
    pros: ["Gratis aandelen", "Copy trading van toptraders", "Grote community", "Demo account"],
    cons: ["Hogere spread dan directe brokers", "Geen MT4/5"],
    regulated: true,
    minDeposit: "€50",
    badge: "Beginner-vriendelijk",
  },
  {
    name: "IG Group",
    url: "https://www.ig.com",
    logo: "🔵",
    tagline: "Professionele CFD-broker — aandelen, indices, forex, grondstoffen",
    assets: ["Aandelen", "ETFs", "Olie", "Goud", "Forex", "Indices"],
    pros: ["Breed aanbod (17.000+ markten)", "Scherpe spreads", "Gevorderde tools", "Gereguleerd"],
    cons: ["Niet voor crypto direct", "Meer gericht op gevorderden"],
    regulated: true,
    minDeposit: "€0",
    badge: "Professioneel",
  },
  {
    name: "Pepperstone",
    url: "https://www.pepperstone.com",
    logo: "🟠",
    tagline: "Lage spreads voor actieve traders — forex, crypto, CFDs",
    assets: ["Forex", "Crypto CFD", "Aandelen CFD", "Olie", "Goud"],
    pros: ["Razor-lage spreads", "MT4/MT5 ondersteuning", "Snel uitvoering", "cTrader"],
    cons: ["Geen echte aandelen (CFDs)", "Hefboom risico"],
    regulated: true,
    minDeposit: "€200",
    badge: "Lage spreads",
  },
  {
    name: "Capital.com",
    url: "https://capital.com",
    logo: "⚫",
    tagline: "AI-powered trading app — groot aanbod CFDs",
    assets: ["Crypto CFD", "Aandelen CFD", "Olie", "Goud", "ETFs CFD"],
    pros: ["AI trading suggesties", "Geen commissie", "Breed aanbod", "Goede app"],
    cons: ["Alleen CFDs", "Spread-gebaseerd model"],
    regulated: true,
    minDeposit: "€20",
  },
  {
    name: "XTB",
    url: "https://www.xtb.com",
    logo: "🔴",
    tagline: "Europese broker met echte aandelen én CFDs",
    assets: ["Aandelen", "ETFs", "Forex", "Crypto CFD", "Olie", "Goud"],
    pros: ["Echte aandelen (geen CFD)", "Geen bewaarkosten", "Goede educatie", "Scherpe spreads"],
    cons: ["Minder crypto keuze", "Platform leercurve"],
    regulated: true,
    minDeposit: "€0",
    badge: "Aanbevolen EU",
  },
  {
    name: "DEGIRO",
    url: "https://www.degiro.nl",
    logo: "🟡",
    tagline: "Goedkoopste broker voor aandelen en ETFs in Europa",
    assets: ["Aandelen", "ETFs", "Obligaties", "Opties"],
    pros: ["Laagste kosten Europa", "Breed aanbod", "Betrouwbaar", "Echte aandelen"],
    cons: ["Geen crypto", "Geen grondstoffen direct", "Basis platform"],
    regulated: true,
    minDeposit: "€0",
    badge: "Goedkoopste",
  },
  {
    name: "Trade Republic",
    url: "https://traderepublic.com",
    logo: "⚪",
    tagline: "Mobiele neo-broker — aandelen, ETFs, crypto",
    assets: ["Aandelen", "ETFs", "Crypto", "Obligaties"],
    pros: ["€1 per trade", "Rente op cash (4%)", "Spaarplannen", "Eenvoudige app"],
    cons: ["Beperkte ordertypen", "Geen MT4/5", "Basis analyse tools"],
    regulated: true,
    minDeposit: "€10",
  },
  {
    name: "Interactive Brokers",
    url: "https://www.interactivebrokers.com",
    logo: "🏦",
    tagline: "Professionele wereldwijde broker voor serieuze traders",
    assets: ["Aandelen", "ETFs", "Opties", "Futures", "Forex", "Obligaties"],
    pros: ["Laagste commissies ter wereld", "Alle markten", "Geavanceerde tools", "IBKR Lite gratis"],
    cons: ["Complexe interface", "Niet voor beginners", "Geen crypto direct"],
    regulated: true,
    minDeposit: "€0",
    badge: "Professioneel",
  },
  {
    name: "Bitvavo",
    url: "https://bitvavo.com",
    logo: "₿",
    tagline: "Grootste Nederlandse crypto exchange",
    assets: ["Crypto"],
    pros: ["Lage fees (0.25%)", "Nederlandstalig", "iDEAL betaling", "Koppelbaar met Bitcoin Mentor"],
    cons: ["Alleen crypto", "Geen aandelen of grondstoffen"],
    regulated: true,
    minDeposit: "€1",
    badge: "Gekoppeld met app",
  },
  {
    name: "Kraken",
    url: "https://www.kraken.com",
    logo: "🐙",
    tagline: "Veilige crypto exchange voor beginners en gevorderden",
    assets: ["Crypto"],
    pros: ["Sterke beveiliging", "Breed crypto aanbod", "Futures beschikbaar", "Staking"],
    cons: ["Alleen crypto", "Interface kan complex zijn"],
    regulated: true,
    minDeposit: "€10",
  },
  {
    name: "Coinbase",
    url: "https://www.coinbase.com",
    logo: "🔷",
    tagline: "Meest gebruikte crypto platform ter wereld",
    assets: ["Crypto"],
    pros: ["Eenvoudig", "Betrouwbaar", "Grote naam", "Coinbase Pro voor gevorderden"],
    cons: ["Hogere fees dan concurrenten", "Alleen crypto"],
    regulated: true,
    minDeposit: "€2",
  },
  {
    name: "Bitpanda",
    url: "https://www.bitpanda.com",
    logo: "🐼",
    tagline: "Europese neo-broker voor crypto, aandelen en metalen",
    assets: ["Crypto", "Aandelen", "ETFs", "Goud", "Zilver"],
    pros: ["Alles op één platform", "Europees gereguleerd", "Goud/zilver in fractie", "Spaarplannen"],
    cons: ["Hogere fees dan gespecialiseerde brokers", "Beperkte geavanceerde functies"],
    regulated: true,
    minDeposit: "€25",
    badge: "All-in-one",
  },
  {
    name: "Gold Avenue",
    url: "https://www.goldavenue.com",
    logo: "🥇",
    tagline: "Fysiek goud en zilver online kopen",
    assets: ["Goud", "Zilver"],
    pros: ["Écht fysiek metaal", "Veilige opslag", "MKS Pamp (Zwitsers)", "Vaste spread"],
    cons: ["Geen trading/leverage", "Alleen metalen", "Hogere minimumordergrootte"],
    regulated: true,
    minDeposit: "€50",
  },
  {
    name: "BullionVault",
    url: "https://www.bullionvault.com",
    logo: "🏅",
    tagline: "Grootste online goud/zilver marktplaats ter wereld",
    assets: ["Goud", "Zilver", "Platina"],
    pros: ["Laagste edelmetaal kosten", "24/7 handel", "Veilige opslag (Londen, NYC, Zürich)"],
    cons: ["Alleen fysieke metalen", "Geen leverage", "Geen aandelen/crypto"],
    regulated: true,
    minDeposit: "€0",
  },
];

const ASSET_FILTERS = ["Alle", "Crypto", "Aandelen", "ETFs", "Goud", "Olie", "Forex"];

export default function BrokersPage() {
  const [filter, setFilter] = useState("Alle");

  const visible = filter === "Alle"
    ? BROKERS
    : BROKERS.filter(b => b.assets.some(a => a.includes(filter) || filter.includes(a)));

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 64px" }}>

      <div style={{ marginBottom: 20 }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
          ← Dashboard
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "8px 0 4px" }}>
          Platforms & Brokers
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
          Waar je écht kunt traden — overzicht van de beste platforms per asset class
        </p>
      </div>

      {/* Marcus tip */}
      <div style={{
        background: "linear-gradient(135deg, rgba(233,30,99,0.08), rgba(233,30,99,0.03))",
        border: "1px solid rgba(233,30,99,0.25)",
        borderRadius: 14, padding: "14px 16px", marginBottom: 20,
        display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #e91e63, #c2185b)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 800, color: "var(--text)", flexShrink: 0,
        }}>M</div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text)" }}>Marcus zegt:</strong> Er bestaat niet één beste broker.
          Crypto traders gebruiken Bitvavo of Kraken. Aandelen via DEGIRO of XTB.
          Olie en goud als CFD via IG of Pepperstone. Serieuze traders hebben vaak 2–3 accounts.
          Begin simpel, schaal op als je weet wat je doet.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {ASSET_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: filter === f ? 700 : 400,
              background: filter === f ? "var(--primary)" : "var(--surface)",
              color: filter === f ? "#fff" : "var(--text-secondary)",
              border: `1px solid ${filter === f ? "var(--primary)" : "var(--border)"}`,
              cursor: "pointer",
            }}
          >{f}</button>
        ))}
      </div>

      {/* Broker grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {visible.map(broker => (
          <div key={broker.name} style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14, padding: "18px 18px 14px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{broker.logo}</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{broker.name}</span>
                    {broker.regulated && (
                      <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6, background: "rgba(34,197,94,0.15)", color: "var(--green)", fontWeight: 700 }}>
                        GEREGULEERD
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{broker.tagline}</div>
                </div>
              </div>
              {broker.badge && (
                <span style={{
                  fontSize: 10, padding: "3px 8px", borderRadius: 8, whiteSpace: "nowrap",
                  background: "rgba(233,30,99,0.12)", color: "var(--primary)", fontWeight: 700, flexShrink: 0,
                }}>{broker.badge}</span>
              )}
            </div>

            {/* Assets */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {broker.assets.map(a => (
                <span key={a} style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 10,
                  background: "var(--surface-2, rgba(255,255,255,0.04))",
                  color: "var(--text-secondary)", border: "1px solid var(--border)",
                }}>{a}</span>
              ))}
            </div>

            {/* Pros / cons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                {broker.pros.slice(0, 3).map(p => (
                  <div key={p} style={{ fontSize: 11, color: "var(--green)", marginBottom: 2 }}>✓ {p}</div>
                ))}
              </div>
              <div>
                {broker.cons.slice(0, 2).map(c => (
                  <div key={c} style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>— {c}</div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Min. storting: <strong style={{ color: "var(--text)" }}>{broker.minDeposit}</strong></span>
              <a
                href={broker.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12, fontWeight: 700, color: "var(--primary)",
                  textDecoration: "none", padding: "5px 12px",
                  border: "1px solid rgba(233,30,99,0.4)", borderRadius: 8,
                }}
              >
                Bezoek site →
              </a>
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 32, lineHeight: 1.6 }}>
        Bitcoin Mentor ontvangt geen commissie van deze platforms. Dit overzicht is puur informatief.<br />
        Traden brengt risico&apos;s met zich mee. Beleg nooit meer dan je kunt veroorloven te verliezen.
      </p>
    </main>
  );
}
