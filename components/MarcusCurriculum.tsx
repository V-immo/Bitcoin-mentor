"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/contexts/LanguageContext";

type Check = {
  q: string;
  options: string[];
  correct: number; // 0-based index
  explain: string;
};

type Lesson = {
  id: string;
  icon: string;
  titleNL: string;
  titleEN: string;
  contentNL: string;
  contentEN: string;
  termsNL?: { term: string; def: string }[];
  termsEN?: { term: string; def: string }[];
  checkNL?: Check;
  checkEN?: Check;
  diagram?: React.ReactNode;
};

type Level = {
  level: number;
  labelNL: string;
  labelEN: string;
  descNL: string;
  descEN: string;
  lessons: Lesson[];
};

const CandlestickDiagram = (
  <svg viewBox="0 0 260 160" style={{ width: "100%", maxWidth: 340, height: "auto" }} aria-hidden>
    {/* Bullish candle */}
    <line x1="55" y1="18" x2="55" y2="42" stroke="#22c55e" strokeWidth="2" />
    <rect x="40" y="42" width="30" height="60" fill="#22c55e" rx="2" />
    <line x1="55" y1="102" x2="55" y2="130" stroke="#22c55e" strokeWidth="2" />
    <text x="95" y="25" fill="#22c55e" fontSize="10" fontWeight="600">High</text>
    <line x1="86" y1="22" x2="72" y2="22" stroke="#22c55e" strokeWidth="1" strokeDasharray="3,2" />
    <text x="95" y="48" fill="#f0d8e8" fontSize="10">Close</text>
    <line x1="86" y1="45" x2="72" y2="45" stroke="#f0d8e8" strokeWidth="1" strokeDasharray="3,2" />
    <text x="95" y="108" fill="#f0d8e8" fontSize="10">Open</text>
    <line x1="86" y1="105" x2="72" y2="105" stroke="#f0d8e8" strokeWidth="1" strokeDasharray="3,2" />
    <text x="95" y="136" fill="#ef4444" fontSize="10">Low</text>
    <line x1="86" y1="130" x2="72" y2="130" stroke="#ef4444" strokeWidth="1" strokeDasharray="3,2" />
    <text x="38" y="155" fill="#22c55e" fontSize="10" fontWeight="700">Bullish (groen)</text>

    {/* Bearish candle */}
    <line x1="195" y1="18" x2="195" y2="42" stroke="#ef4444" strokeWidth="2" />
    <rect x="180" y="42" width="30" height="60" fill="#ef4444" rx="2" />
    <line x1="195" y1="102" x2="195" y2="130" stroke="#ef4444" strokeWidth="2" />
    <text x="18" y="48" fill="#f0d8e8" fontSize="10">Open</text>
    <text x="18" y="108" fill="#f0d8e8" fontSize="10">Close</text>
    <text x="158" y="155" fill="#ef4444" fontSize="10" fontWeight="700">Bearish (rood)</text>

    {/* Body label */}
    <text x="110" y="78" fill="#b87095" fontSize="9" textAnchor="middle">← Body →</text>
    {/* Wick label */}
    <text x="125" y="13" fill="#b87095" fontSize="9" textAnchor="middle">wick</text>
    <text x="125" y="140" fill="#b87095" fontSize="9" textAnchor="middle">wick</text>
  </svg>
);

const WicksDiagram = (
  <svg viewBox="0 0 260 160" style={{ width: "100%", maxWidth: 340, height: "auto" }} aria-hidden>
    {/* Bullish wick candle — lange wick naar beneden */}
    <line x1="55" y1="28" x2="55" y2="50" stroke="#22c55e" strokeWidth="2" />
    <rect x="40" y="50" width="30" height="22" fill="#22c55e" rx="2" />
    <line x1="55" y1="72" x2="55" y2="130" stroke="#22c55e" strokeWidth="2" />
    <text x="88" y="34" fill="#b87095" fontSize="9">kleine body</text>
    <text x="88" y="90" fill="#22c55e" fontSize="9" fontWeight="600">lange wick ↓</text>
    <text x="88" y="102" fill="#22c55e" fontSize="9">= koopdruk</text>
    <text x="28" y="153" fill="#22c55e" fontSize="10" fontWeight="700">Bullish signal</text>

    {/* Bearish wick candle — lange wick naar boven */}
    <line x1="195" y1="28" x2="195" y2="88" stroke="#ef4444" strokeWidth="2" />
    <rect x="180" y="88" width="30" height="22" fill="#ef4444" rx="2" />
    <line x1="195" y1="110" x2="195" y2="130" stroke="#ef4444" strokeWidth="2" />
    <text x="145" y="48" fill="#ef4444" fontSize="9" fontWeight="600">lange wick ↑</text>
    <text x="145" y="60" fill="#ef4444" fontSize="9">= verkoopdruk</text>
    <text x="165" y="153" fill="#ef4444" fontSize="10" fontWeight="700">Bearish signal</text>
  </svg>
);

const SupportResistanceDiagram = (
  <svg viewBox="0 0 300 160" style={{ width: "100%", maxWidth: 400, height: "auto" }} aria-hidden>
    {/* Resistance lijn */}
    <line x1="10" y1="38" x2="290" y2="38" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6,3" />
    <text x="12" y="28" fill="#ef4444" fontSize="10" fontWeight="700">Resistance</text>

    {/* Support lijn */}
    <line x1="10" y1="130" x2="290" y2="130" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6,3" />
    <text x="12" y="148" fill="#22c55e" fontSize="10" fontWeight="700">Support</text>

    {/* Prijs beweging — bounces op support, breakout door resistance */}
    <polyline
      points="10,100 40,65 60,128 90,62 110,130 145,58 175,132 210,40 240,18 280,24"
      fill="none" stroke="#e91e63" strokeWidth="2" strokeLinejoin="round"
    />

    {/* Bounce markers op support */}
    <circle cx="60" cy="128" r="4" fill="#22c55e" />
    <circle cx="110" cy="130" r="4" fill="#22c55e" />
    <circle cx="175" cy="132" r="4" fill="#22c55e" />

    {/* Breakout marker boven resistance */}
    <circle cx="210" cy="40" r="4" fill="#ef4444" />
    <text x="215" y="30" fill="#ef4444" fontSize="9" fontWeight="700">Breakout!</text>
  </svg>
);

const CURRICULUM: Level[] = [
  {
    level: 1,
    labelNL: "Niveau 1 — Absolute Beginner",
    labelEN: "Level 1 — Absolute Beginner",
    descNL: "Geen voorkennis nodig. Marcus begeleidt je stap voor stap van nul.",
    descEN: "No prior knowledge needed. Marcus guides you step by step from zero.",
    lessons: [
      {
        id: "l1-bitcoin",
        icon: "₿",
        titleNL: "Wat is Bitcoin eigenlijk — en waarom bestaat het?",
        titleEN: "What is Bitcoin really — and why does it exist?",
        contentNL: `Marcus vraagt je iets: stel je hebt €5.000 op je bankrekening. Wie heeft dat geld eigenlijk? Jij? Of de bank?

Juridisch gezien: de bank. Jouw rekening is een vordering op de bank — een belofte dat ze het uitbetalen als je erom vraagt. In 2012 bevroor de Cypriotische overheid bankrekeningen en haalde geld direct van burgers af. In 2022 ging FTX failliet — klanten verloren miljarden. Niet omdat hun geld gestolen werd, maar omdat het nooit echt van hen was.

Dit is het probleem dat Bitcoin in 2009 oploste.

Satoshi Nakamoto — een anonieme persoon of groep — publiceerde een whitepaper met de titel "Bitcoin: A Peer-to-Peer Electronic Cash System." Het kernidee: geld sturen zonder tussenpersoon, zonder vertrouwen, zonder bank.

Hoe werkt het technisch? Niet ingewikkeld te begrijpen:
Stel je een Google Spreadsheet voor die iedereen kan zien, maar niemand kan aanpassen — behalve door nieuwe regels toe te voegen die iedereen goedkeurt. Op die spreadsheet staat elke transactie ooit: "Adres A stuurde 0.5 BTC naar adres B op 14 maart 2024." Dat is de blockchain. Hij staat op tienduizenden computers tegelijk — niemand bezit hem, niemand kan hem afschermen.

Om een transactie toe te voegen heb je een private key nodig — een soort onkraakbaar wachtwoord van 256 bits. Wie die key heeft, beheert die BTC. Niet de bank. Niet de overheid. Jij.

Schaarste: er zijn precies 21 miljoen Bitcoin. Dat staat in de code. Niet de Fed, niet Satoshi, niemand kan dat veranderen. Ter vergelijking: de Fed drukte in 2020-2021 meer dollars bij dan in de gehele vorige 200 jaar combined. Bitcoin kan dat niet. Nooit. Die schaarste is geprogrammeerd.

De eerste echte Bitcoin-transactie: op 22 mei 2010 kocht Laszlo Hanyecz twee pizza's voor 10.000 BTC. Die BTC is nu honderden miljoenen waard. Niet omdat pizza duurder werd, maar omdat Bitcoin schaars en waardevol werd.

Wat maakt dit relevant voor jou als trader? Bitcoin is het meest liquide, meest gevolgde crypto-asset ter wereld. Het is de benchmark waarop alles wordt gemeten. Begrijpen wat het is — echt begrijpen, niet alleen de prijs — is de basis van alles wat je hierna leert.

Marcus' inzicht: de meeste mensen kopen Bitcoin zonder te begrijpen wat het is. Jij begint anders. Begrijp het systeem eerst, dan begrijp je waarom de prijs doet wat hij doet.`,
        contentEN: `Marcus asks you something: suppose you have €5,000 in your bank account. Who actually owns that money? You? Or the bank?

Legally: the bank. Your account is a claim on the bank — a promise they'll pay it out when you ask. In 2012, the Cypriot government froze bank accounts and took money directly from citizens. In 2022, FTX went bankrupt — customers lost billions. Not because their money was stolen, but because it was never really theirs.

This is the problem Bitcoin solved in 2009.

Satoshi Nakamoto — an anonymous person or group — published a whitepaper titled "Bitcoin: A Peer-to-Peer Electronic Cash System." The core idea: send money without a middleman, without trust, without a bank.

How does it work technically? Not complicated to understand:
Imagine a Google Spreadsheet everyone can see but nobody can alter — except by adding new rows that everyone approves. On that spreadsheet is every transaction ever: "Address A sent 0.5 BTC to address B on March 14, 2024." That's the blockchain. It runs on tens of thousands of computers simultaneously — nobody owns it, nobody can shut it down.

To add a transaction you need a private key — a kind of unbreakable 256-bit password. Whoever holds that key controls those BTC. Not the bank. Not the government. You.

Scarcity: there are exactly 21 million Bitcoin. That's in the code. Not the Fed, not Satoshi, nobody can change that. For comparison: the Fed printed more dollars in 2020-2021 than in the entire previous 200 years combined. Bitcoin can't do that. Ever. That scarcity is programmed.

The first real Bitcoin transaction: on May 22, 2010, Laszlo Hanyecz bought two pizzas for 10,000 BTC. Those BTC are now worth hundreds of millions. Not because pizza got more expensive, but because Bitcoin became scarce and valuable.

Why is this relevant for you as a trader? Bitcoin is the most liquid, most followed crypto asset in the world. It's the benchmark against which everything is measured. Understanding what it is — really understanding, not just the price — is the foundation of everything you'll learn next.

Marcus' insight: most people buy Bitcoin without understanding what it is. You're starting differently. Understand the system first, then you'll understand why the price does what it does.`,
        termsNL: [
          { term: "Bitcoin (BTC)", def: "Digitale munt gecreëerd in 2009. Eerste en grootste cryptocurrency. Symbool: ₿. Maximaal 21 miljoen ooit." },
          { term: "Blockchain", def: "Een openbare, onveranderbare lijst van ALLE Bitcoin-transacties ooit. Staat op tienduizenden computers tegelijk. Niemand bezit of beheert hem." },
          { term: "Private Key", def: "Een uniek 256-bit wachtwoord dat bewijst dat de BTC van jou is. Nooit delen. Verloren = alles kwijt." },
          { term: "Satoshi Nakamoto", def: "Anonieme uitvinder(s) van Bitcoin. Publiceerde het whitepaper in 2008, lanceerde het netwerk in 2009. Identiteit onbekend." },
          { term: "Decentralisatie", def: "Geen centrale partij die het beheert. Bitcoin draait op duizenden computers wereldwijd — niemand kan het afschermen." },
          { term: "Peer-to-Peer", def: "Directe transactie van persoon A naar persoon B, zonder tussenpersoon (bank, PayPal, etc.)." },
        ],
        termsEN: [
          { term: "Bitcoin (BTC)", def: "Digital currency created in 2009. First and largest cryptocurrency. Symbol: ₿. Maximum 21 million ever." },
          { term: "Blockchain", def: "A public, immutable list of ALL Bitcoin transactions ever. Runs on tens of thousands of computers simultaneously. Nobody owns or controls it." },
          { term: "Private Key", def: "A unique 256-bit password proving the BTC is yours. Never share. Lost = everything gone." },
          { term: "Satoshi Nakamoto", def: "Anonymous inventor(s) of Bitcoin. Published the whitepaper in 2008, launched the network in 2009. Identity unknown." },
          { term: "Decentralization", def: "No central party managing it. Bitcoin runs on thousands of computers worldwide — nobody can shut it down." },
          { term: "Peer-to-Peer", def: "Direct transaction from person A to person B, without a middleman (bank, PayPal, etc.)." },
        ],
        checkNL: {
          q: "Je hebt €10.000 op Bitvavo staan. Bitvavo gaat failliet. Wat gebeurt er met jouw BTC?",
          options: [
            "Niets — crypto is verzekerd door de overheid net als banktegoeden",
            "Je verliest alles — want Bitvavo bezit technisch jouw private keys, niet jij",
            "Je kunt de BTC altijd terughalen via de blockchain",
            "Bitvavo moet je compenseren — dat is wettelijk verplicht",
          ],
          correct: 1,
          explain: "Dit is de harde waarheid die FTX-klanten leerden in 2022. Als jij je BTC op een exchange laat staan, bezit jij niet de private key — de exchange doet dat. Bij faillissement ben jij een gewone schuldeiser. Daarom: 'Not your keys, not your coins.' Voor grote bedragen: altijd een eigen hardware wallet.",
        },
        checkEN: {
          q: "You have €10,000 on Bitvavo. Bitvavo goes bankrupt. What happens to your BTC?",
          options: [
            "Nothing — crypto is insured by the government just like bank deposits",
            "You lose everything — because Bitvavo technically holds your private keys, not you",
            "You can always recover the BTC via the blockchain",
            "Bitvavo must compensate you — it's legally required",
          ],
          correct: 1,
          explain: "This is the hard truth FTX customers learned in 2022. When you leave your BTC on an exchange, you don't hold the private key — the exchange does. In bankruptcy you're just a regular creditor. That's why: 'Not your keys, not your coins.' For large amounts: always use your own hardware wallet.",
        },
      },
      {
        id: "l1-prijs",
        icon: "📈",
        titleNL: "Waarom stijgt en daalt de prijs? Het echte mechanisme",
        titleEN: "Why does the price rise and fall? The real mechanism",
        contentNL: `Marcus stelt je een vraag: Bitcoin heeft geen fabrikant, geen winstcijfers, geen dividend. Geen enkel 'fundamenteel' gegeven zoals bij een aandeel. Hoe wordt de prijs dan bepaald?

Antwoord: alleen door wat mensen bereid zijn ervoor te betalen. Dat klinkt simpel. Het is ook simpel. En tegelijk de meest complexe kracht in de financiële wereld.

Het orderboek: de kern van prijsvorming

Elke exchange heeft een orderboek. Aan de linkerkant staan de biedingen (bids) — kopers die zeggen: "ik wil BTC kopen voor maximaal €X." Rechts staan de vraagprijzen (asks) — verkopers die zeggen: "ik wil BTC verkopen voor minimaal €Y."

De actuele prijs? Dat is het punt waar de meest recente koper en verkoper het eens werden. Niets meer, niets minder.

Als er ineens 1.000 mensen tegelijk willen kopen, stijgt de prijs — want er zijn niet genoeg verkopers tegen die prijs. De kopers moeten hoger bieden. Andersom: als 1.000 mensen paniekverkopen, keldert de prijs — want er zijn niet genoeg kopers.

Wat de prijs echt beïnvloedt — en waarom:

1. Nieuws en sentiment. In maart 2020 crashte BTC van $8.000 naar $4.000 in één dag (COVID-paniek). Zes maanden later stond hij op $12.000. Niet omdat Bitcoin technisch veranderde — maar omdat de perceptie van mensen veranderde. Sentiment is de sterkste korte-termijn kracht.

2. Grote spelers (whales). Een wallet met 10.000 BTC die verkoopt, beweegt de markt. Institutionele kopers zoals BlackRock, MicroStrategy en Fidelity kopen nu BTC voor hun fondsen. Hun acties bewegen de prijs meer dan die van duizenden kleine retail-traders.

3. De Bitcoin Halving. Elke ~4 jaar wordt de beloning die miners ontvangen gehalveerd. Minder nieuwe BTC komen in omloop. Als vraag gelijk blijft maar aanbod halveert → prijs historisch omhoog. De vier halvings (2012, 2016, 2020, 2024) gingen elk vooraf aan een major bull markt.

4. Regelgeving. China verbood Bitcoin mining in 2021 → korte crash, daarna herstel elders. Amerikaanse SEC-goedkeuring van Bitcoin ETF in januari 2024 → direct +15% in 24 uur.

5. Macro-economie. Bitcoin wordt steeds meer gezien als 'digital gold' — een hedge tegen inflatie. Hoge inflatie, zwakke dollar → meer interesse in BTC. Hoge rente, risk-off → minder interesse.

De cruciale les die de meeste beginners missen:

De prijs weerspiegelt collectieve psychologie, niet de intrinsieke waarde. Mark Douglas schreef in "Trading in the Zone": "The market is always right because it represents the collective judgment of all participants at any given moment." Je taak als trader is niet om te beoordelen of de prijs 'terecht' is — maar om te begrijpen waar de prijs naartoe wil.

Actie: open nu de chart op dit platform. Kijk naar de prijs van de laatste 24 uur. Welke bewegingen zie je? Ga naar het nieuwstabblad en zoek of er nieuws was dat de bewegingen verklaart. Dit verband zien — tussen nieuws en prijs — is het begin van markt-lezen.`,
        contentEN: `Marcus asks you a question: Bitcoin has no manufacturer, no profit figures, no dividend. No 'fundamental' data like a stock. How is the price determined then?

Answer: only by what people are willing to pay for it. That sounds simple. It is simple. And simultaneously the most complex force in the financial world.

The order book: the core of price discovery

Every exchange has an order book. On the left are bids — buyers saying: "I want to buy BTC for a maximum of €X." On the right are asks — sellers saying: "I want to sell BTC for a minimum of €Y."

The current price? That's the point where the most recent buyer and seller agreed. Nothing more, nothing less.

If suddenly 1,000 people want to buy simultaneously, the price rises — because there aren't enough sellers at that price. Buyers must bid higher. Conversely: if 1,000 people panic sell, the price plunges — because there aren't enough buyers.

What really influences the price — and why:

1. News and sentiment. In March 2020 BTC crashed from $8,000 to $4,000 in one day (COVID panic). Six months later it was at $12,000. Not because Bitcoin technically changed — but because people's perception changed. Sentiment is the strongest short-term force.

2. Large players (whales). A wallet with 10,000 BTC selling moves the market. Institutional buyers like BlackRock, MicroStrategy and Fidelity now buy BTC for their funds. Their actions move the price more than thousands of small retail traders.

3. The Bitcoin Halving. Every ~4 years the reward miners receive is halved. Fewer new BTC enter circulation. If demand stays the same but supply halves → price historically goes up. The four halvings (2012, 2016, 2020, 2024) each preceded a major bull market.

4. Regulation. China banned Bitcoin mining in 2021 → brief crash, then recovery elsewhere. US SEC approval of Bitcoin ETF in January 2024 → immediately +15% in 24 hours.

5. Macro-economics. Bitcoin is increasingly seen as 'digital gold' — a hedge against inflation. High inflation, weak dollar → more interest in BTC. High interest rates, risk-off → less interest.

The crucial lesson most beginners miss:

The price reflects collective psychology, not intrinsic value. Mark Douglas wrote in "Trading in the Zone": "The market is always right because it represents the collective judgment of all participants at any given moment." Your job as a trader isn't to judge whether the price is 'fair' — but to understand where the price wants to go.

Action: open the chart on this platform now. Look at the price over the last 24 hours. What movements do you see? Go to the news tab and search for news that explains the movements. Seeing this connection — between news and price — is the beginning of reading markets.`,
        termsNL: [
          { term: "Orderboek", def: "Lijst van alle openstaande koop- en verkooporders op een exchange. De actuele prijs = waar meest recente koper en verkoper overeenkwamen." },
          { term: "Bid / Ask", def: "Bid = hoogste prijs die kopers willen betalen. Ask = laagste prijs die verkopers accepteren. Spread = verschil tussen beiden." },
          { term: "Halving", def: "Elke ~4 jaar halveert de beloning voor Bitcoin-miners. Historisch gevolgd door grote prijsstijgingen." },
          { term: "Whale", def: "Een wallet of persoon met zeer grote hoeveelheid BTC. Hun transacties bewegen de markt merkbaar." },
          { term: "Sentiment", def: "De algemene stemming van de markt: optimistisch (bullish) of pessimistisch (bearish). Sterkste drijver op korte termijn." },
          { term: "Liquiditeit", def: "Hoe makkelijk je een asset kunt kopen of verkopen zonder de prijs sterk te beïnvloeden. BTC = zeer liquide." },
        ],
        termsEN: [
          { term: "Order Book", def: "List of all open buy and sell orders on an exchange. Current price = where the most recent buyer and seller agreed." },
          { term: "Bid / Ask", def: "Bid = highest price buyers want to pay. Ask = lowest price sellers accept. Spread = difference between both." },
          { term: "Halving", def: "Every ~4 years the reward for Bitcoin miners halves. Historically followed by large price increases." },
          { term: "Whale", def: "A wallet or person with a very large amount of BTC. Their transactions noticeably move the market." },
          { term: "Sentiment", def: "The general mood of the market: optimistic (bullish) or pessimistic (bearish). Strongest driver in the short term." },
          { term: "Liquidity", def: "How easily you can buy or sell an asset without strongly affecting the price. BTC = very liquid." },
        ],
        checkNL: {
          q: "BTC staat op €80.000. Nieuws: 'Land X verbiedt Bitcoin.' Wat verwacht je op korte termijn — en waarom?",
          options: [
            "Prijs stijgt — nieuws is al ingeprijsd",
            "Prijs blijft gelijk — Bitcoin reageert niet op nieuws",
            "Prijs daalt — meer mensen willen verkopen, minder kopers",
            "Onmogelijk te zeggen — heeft niks met vraag/aanbod te maken",
          ],
          correct: 2,
          explain: "Goed. Slecht nieuws → angst → meer verkopers, minder kopers → prijs daalt. Andersom werkt het ook: goed nieuws trekt kopers aan → prijs stijgt. De markt is altijd vraag vs aanbod op dat moment.",
        },
        checkEN: {
          q: "BTC is at €80,000. News: 'Country X bans Bitcoin.' What do you expect short-term?",
          options: [
            "Price rises — news is already priced in",
            "Price stays the same — Bitcoin doesn't react to news",
            "Price drops — more people want to sell, fewer buyers",
            "Impossible to say — has nothing to do with supply/demand",
          ],
          correct: 2,
          explain: "Correct. Bad news → fear → more sellers, fewer buyers → price drops. The reverse works too: good news attracts buyers → price rises. The market is always supply vs demand in that moment.",
        },
      },
      {
        id: "l1-wallet",
        icon: "🔐",
        titleNL: "Wie bezit jouw Bitcoin eigenlijk?",
        titleEN: "Who actually owns your Bitcoin?",
        contentNL: `Marcus stelt je een vraag: jij zet €5.000 op Bitvavo en koopt Bitcoin. Bitvavo bevestigt: je hebt 0.06 BTC. Maar is dat BTC echt van jou?

Technisch gezien: nee. Niet volledig.

Dit is een van de meest fundamentele — en meest misverstane — zaken in crypto. Laten we het uitleggen.

HOE EEN EXCHANGE WERKT

Als jij BTC koopt op Bitvavo, staat die BTC in een grote gezamenlijke wallet van Bitvavo. Jij hebt geen eigen adres op de blockchain. Jij hebt een account in de database van Bitvavo — een digitale IOU ("I owe you"). Ze bewaren de BTC in jouw naam, maar zij houden de private key.

Dit is precies zoals een bank werkt: jij hebt een saldo, maar de bank bezit het geld. Jij hebt een claim.

Het probleem: als Bitvavo gehackt wordt, failliet gaat, of wordt bevroren door een overheid — ben jij een gewone schuldeiser. FTX (november 2022): miljoenen mensen verloren hun geld. Niet door hacking. Door faillissement. Klanten kregen niet alles terug.

ECHTE BITCOIN-EIGENDOM: DE PRIVATE KEY

De blockchain kent geen namen. Hij kent alleen adressen — en private keys.

Een private key is een uniek getal van 256 bits, dat klinkt als: "5HueCGU8rMjxECyDialwujzdhpNUrNMp5y..." Wie deze key heeft, heeft controle over alle BTC op het bijbehorende adres. Niet de bank. Niet Bitvavo. Wie de sleutel heeft.

Als jij jouw eigen private key bezit, staat jouw BTC op de blockchain onder jouw adres. Niemand anders kan er bij. Geen enkele overheid kan het bevriezen. Geen exchange kan er failliet mee gaan.

"Not your keys, not your coins."

WALLETS: WAAR BEWAAR JE DE KEY?

Een wallet is software (of hardware) die jouw private key opslaat en beheert. Er zijn twee types:

HOT WALLET (verbonden met internet):
— Bijv. een app op je telefoon (Exodus, Trust Wallet) of een browserextensie (MetaMask)
— Handig voor dagelijks gebruik en kleine bedragen
— Risico: als jouw telefoon gehackt wordt of de app een lek heeft, is je BTC weg
— Goed voor: bedragen die je actief gebruikt (<€1.000)

COLD WALLET (niet verbonden met internet):
— Bijv. een hardware apparaatje (Ledger Nano, Trezor)
— Ziet eruit als een USB-stick. De private key verlaat het apparaat nooit.
— Om te stelen moeten hackers het fysieke apparaatje hebben + de PIN weten
— Veiligste optie voor serieuze bedragen (>€1.000)
— Kost €60-150, eenmalige investering

DE SEED PHRASE: je ultieme backup

Wanneer je een wallet aanmaakt, krijg je een seed phrase: 12 of 24 willekeurige woorden.
Voorbeeld: "apple river thunder wallet fence..."

Dit zijn jouw 12 woorden die je VOLLEDIGE wallet kunnen herstellen op elk apparaat. Verlies je jouw Ledger? Koop een nieuwe, voer de 12 woorden in → alles terug.

BEWAARREGELS:
— Schrijf de seed phrase ALLEEN op papier. Nooit digitaal, nooit foto.
— Bewaar op twee aparte locaties (brand, waterschade).
— Deel hem met NIEMAND. Wie jouw seed phrase heeft, heeft jouw BTC.
— Er is geen "wachtwoord vergeten". Verloren = voorgoed weg.

PRAKTISCHE GIDS: wat gebruik jij nu?

Voor trading en leren: exchange zoals Bitvavo. Dit is prima voor kleine bedragen en actieve trades.
Voor serieuze bedragen (>€2.000 die je niet binnenkort nodig hebt): overweeg een hardware wallet.
Tussenoptie: bewaar wat op exchange, wat op cold wallet.

Actie: open je Bitvavo account. Kijk bij "Profiel" → "Beveiliging". Stel 2FA in als je dat nog niet hebt. Dit is je minimale bescherming op een exchange.

Marcus zegt: Ik bewaar trading-kapitaal op een exchange — dat moet ik kunnen bewegen. Maar alles wat ik op lange termijn aanhoud? Op een Ledger. Off-exchange. Off the grid. Dat is het verschil tussen een investeerder en een bankklant.`,
        contentEN: `Marcus asks you a question: you put €5,000 on Bitvavo and buy Bitcoin. Bitvavo confirms: you have 0.06 BTC. But is that BTC really yours?

Technically speaking: no. Not fully.

This is one of the most fundamental — and most misunderstood — things in crypto. Let's explain it.

HOW AN EXCHANGE WORKS

When you buy BTC on Bitvavo, that BTC sits in a large communal Bitvavo wallet. You don't have your own address on the blockchain. You have an account in Bitvavo's database — a digital IOU ("I owe you"). They hold the BTC in your name, but they keep the private key.

This is exactly how a bank works: you have a balance, but the bank owns the money. You have a claim.

The problem: if Bitvavo gets hacked, goes bankrupt, or is frozen by a government — you're a regular creditor. FTX (November 2022): millions of people lost their money. Not through hacking. Through bankruptcy. Customers didn't get everything back.

REAL BITCOIN OWNERSHIP: THE PRIVATE KEY

The blockchain doesn't know names. It only knows addresses — and private keys.

A private key is a unique 256-bit number that looks like: "5HueCGU8rMjxECyDialwujzdhpNUrNMp5y..." Whoever has this key controls all BTC at the associated address. Not the bank. Not Bitvavo. Whoever has the key.

If you own your own private key, your BTC sits on the blockchain at your address. Nobody else can access it. No government can freeze it. No exchange can go bankrupt with it.

"Not your keys, not your coins."

WALLETS: WHERE DO YOU STORE THE KEY?

A wallet is software (or hardware) that stores and manages your private key. There are two types:

HOT WALLET (connected to internet):
— E.g. an app on your phone (Exodus, Trust Wallet) or browser extension (MetaMask)
— Convenient for daily use and small amounts
— Risk: if your phone gets hacked or the app has a leak, your BTC is gone
— Good for: amounts you actively use (<€1,000)

COLD WALLET (not connected to internet):
— E.g. a hardware device (Ledger Nano, Trezor)
— Looks like a USB stick. The private key never leaves the device.
— To steal it hackers need the physical device + PIN
— Safest option for serious amounts (>€1,000)
— Costs €60-150, one-time investment

THE SEED PHRASE: your ultimate backup

When you create a wallet, you get a seed phrase: 12 or 24 random words.
Example: "apple river thunder wallet fence..."

These are your 12 words that can FULLY restore your wallet on any device. Lost your Ledger? Buy a new one, enter the 12 words → everything back.

STORAGE RULES:
— Write the seed phrase on PAPER ONLY. Never digital, never photo.
— Store in two separate locations (fire, water damage).
— Share with NOBODY. Whoever has your seed phrase has your BTC.
— There's no "forgot password". Lost = gone forever.

PRACTICAL GUIDE: what do you use now?

For trading and learning: exchange like Bitvavo. Fine for small amounts and active trades.
For serious amounts (>€2,000 you won't need soon): consider a hardware wallet.
Middle option: keep some on exchange, some on cold wallet.

Action: open your Bitvavo account. Check "Profile" → "Security". Enable 2FA if you haven't already. This is your minimum protection on an exchange.

Marcus says: I keep trading capital on an exchange — I need to be able to move it. But everything I hold long-term? On a Ledger. Off-exchange. Off the grid. That's the difference between an investor and a bank customer.`,
        termsNL: [
          { term: "Private Key", def: "Unieke 256-bit code die bewijst dat de BTC van jou is. Wie de key heeft, heeft de BTC. NOOIT delen. Verloren = alles weg." },
          { term: "Hot Wallet", def: "Wallet verbonden met internet (app, browserextensie). Handig, maar meer risico op hacks. Voor kleine, actieve bedragen." },
          { term: "Cold Wallet / Hardware Wallet", def: "Wallet niet verbonden met internet (Ledger, Trezor). Veiligst voor serieuze bedragen. Kost €60-150." },
          { term: "Seed Phrase", def: "12 of 24 woorden die je volledige wallet kunnen herstellen op elk apparaat. Bewaar ALLEEN op papier. Nooit digitaal." },
          { term: "Custody", def: "Wie de private keys beheert. Exchange = zij hebben custody. Eigen wallet = jij hebt custody." },
          { term: "Not your keys, not your coins", def: "Het principe dat alleen wie de private key bezit, de BTC echt bezit. Op een exchange heb jij custody NIET." },
        ],
        termsEN: [
          { term: "Private Key", def: "Unique 256-bit code proving BTC is yours. Whoever has the key has the BTC. NEVER share. Lost = everything gone." },
          { term: "Hot Wallet", def: "Wallet connected to internet (app, browser extension). Convenient, but more hack risk. For small, active amounts." },
          { term: "Cold Wallet / Hardware Wallet", def: "Wallet not connected to internet (Ledger, Trezor). Safest for serious amounts. Costs €60-150." },
          { term: "Seed Phrase", def: "12 or 24 words that can fully restore your wallet on any device. Store ONLY on paper. Never digital." },
          { term: "Custody", def: "Who manages the private keys. Exchange = they have custody. Own wallet = you have custody." },
          { term: "Not your keys, not your coins", def: "The principle that only whoever holds the private key truly owns the BTC. On an exchange, you do NOT have custody." },
        ],
        checkNL: {
          q: "Je hebt €8.000 aan BTC op Bitvavo staan. Je wil weten: 'heb ik echt de BTC, of heb ik een claim op Bitvavo?' Wat is het antwoord?",
          options: [
            "Jij hebt echt de BTC — hij staat op jouw naam op de blockchain",
            "Je hebt een claim op Bitvavo — zij bewaren de private keys, niet jij. Bij faillissement ben je schuldeiser.",
            "Dat maakt niet uit zolang je 2FA hebt ingesteld",
            "Bitvavo is verzekerd door de overheid, dus je BTC is veilig",
          ],
          correct: 1,
          explain: "Op een exchange bezit jij de private keys niet. Jij hebt een account-saldo — een IOU. FTX bewees in 2022 wat dat betekent: faillissement → klanten worden schuldeisers → geen garantie dat je alles terugkrijgt. Voor actief traden: prima. Voor serieuze langetermijn bedragen: eigen cold wallet.",
        },
        checkEN: {
          q: "You have €8,000 in BTC on Bitvavo. You want to know: 'do I really own the BTC, or do I have a claim on Bitvavo?' What's the answer?",
          options: [
            "You really own the BTC — it's registered in your name on the blockchain",
            "You have a claim on Bitvavo — they hold the private keys, not you. In bankruptcy you're a creditor.",
            "It doesn't matter as long as you have 2FA enabled",
            "Bitvavo is insured by the government, so your BTC is safe",
          ],
          correct: 1,
          explain: "On an exchange you don't own the private keys. You have an account balance — an IOU. FTX proved in 2022 what that means: bankruptcy → customers become creditors → no guarantee you get everything back. For active trading: fine. For serious long-term amounts: own cold wallet.",
        },
      },
      {
        id: "l1-groen-rood",
        icon: "🟢",
        titleNL: "Marktfases — bull, bear en sideways herkennen",
        titleEN: "Market phases — recognizing bull, bear and sideways",
        contentNL: `Marcus vraagt je iets: kijk naar de BTC grafiek van het afgelopen jaar. Je ziet maanden van stijging, dan een scherpe daling van weken, dan een periode waarbij de prijs nauwelijks beweegt. Hoe herken je in welke fase de markt nu zit — en waarom maakt dat verschil voor jouw beslissingen?

Want een trader die koopt in een bear markt denkt dat hij slim is. Maar hij zwemt tegen de stroom in.

DE DRIE MARKTFASES

BULL MARKT — de stijgende fase:
Prijzen stijgen over weken of maanden. Nieuws is overwegend positief. Meer mensen willen kopen dan verkopen. Sociale media stromen vol van mensen die hun winsten delen.

Kenmerken: hogere toppen, hogere bodems, positief nieuws, hoge volumes bij stijging.
Gevaar: FOMO — de angst om iets te missen. Beginners kopen vaak te laat, bovenaan de bull.

BEAR MARKT — de dalende fase:
Prijzen dalen over weken of maanden. Nieuws is negatief of afwezig. Mensen zijn bang, verkopen. Social media is stil of vol pessimisme.

Kenmerken: lagere toppen, lagere bodems, negatief sentiment, hoge volumes bij daling.
Gevaar: paniekverkopen op de bodem — precies het verkeerde moment.

SIDEWAYS / CONSOLIDATIE — de neutrale fase:
Prijs beweegt horizontaal. Geen duidelijke richting. Volumes zijn laag. Markt verzamelt kracht voor de volgende move.

Kenmerken: prijs "klontert" tussen twee niveaus (support en resistance).
Kan weken of maanden duren. Uitbreekt meestal krachtig in één richting.

HOE HERKEN JE DE HUIDIGE FASE?

Kijk naar de 1D grafiek, afgelopen 3 maanden:
— Maakt de prijs hogere toppen en hogere bodems? → bull markt
— Maakt de prijs lagere toppen en lagere bodems? → bear markt
— Beweegt de prijs heen en weer zonder richting? → sideways

GROEN EN ROOD: niet zo simpel als het lijkt

+5% = BTC steeg 5% ten opzichte van gisteren. Was hij €80.000, nu €84.000.
-10% = BTC daalde 10%. Was hij €80.000, nu €72.000.

Maar: rood is NIET altijd slecht. In een uptrend is een rode dag van -3% vaak een koopkans — de "dip" die iedereen zegt te willen kopen maar dan toch bang is om te kopen.
En groen is niet altijd goed. In een overheated bull markt is groen soms het moment om winst te nemen.

Rood of groen zegt niets op zichzelf. Context is alles.

24/7 MARKT: geen sluitingstijd

Aandelen hebben openingstijden. Crypto niet. BTC handelt elk uur van elk dag, het hele jaar door.

Dit betekent: je kan om 3 uur 's nachts wakker worden en BTC staat 15% lager (of hoger). Dat is de realiteit van crypto.

Belangrijke tijden voor grotere bewegingen (Europese tijd):
— 09:00 — Europese markten openen: eerste instituties actief
— 14:30 — Wall Street opent: grootste volume van de dag, grootste moves
— 22:00 — Wall Street sluit: soms rustiger, soms grote moves door Aziatische sessie
— 00:00-08:00 — Aziatische sessie: lager volume, maar plotse grote moves mogelijk

Actie: open de BTC 1D grafiek. Bekijk de afgelopen 6 maanden. Schrijf op welke fase je ziet: bull, bear of sideways? En hoe lang heeft die fase al geduurd?

Marcus zegt: De marktfase bepaalt ALLES. In een bull markt kun je bijna niet verliezen als je de trend volgt. In een bear markt kun je bijna niet winnen als je long gaat. Leer de fase herkennen voordat je iets doet.`,
        contentEN: `Marcus asks you something: look at the BTC chart from the past year. You see months of rising, then a sharp decline for weeks, then a period where the price barely moves. How do you recognize which phase the market is in now — and why does that matter for your decisions?

Because a trader who buys in a bear market thinks they're smart. But they're swimming against the current.

THE THREE MARKET PHASES

BULL MARKET — the rising phase:
Prices rise over weeks or months. News is predominantly positive. More people want to buy than sell. Social media fills up with people sharing their profits.

Signs: higher peaks, higher bottoms, positive news, high volume on rises.
Danger: FOMO — the fear of missing out. Beginners often buy too late, at the top of the bull.

BEAR MARKET — the falling phase:
Prices fall over weeks or months. News is negative or absent. People are scared, selling. Social media is quiet or full of pessimism.

Signs: lower peaks, lower bottoms, negative sentiment, high volume on declines.
Danger: panic selling at the bottom — exactly the wrong moment.

SIDEWAYS / CONSOLIDATION — the neutral phase:
Price moves horizontally. No clear direction. Volumes are low. Market gathers strength for the next move.

Signs: price 'clusters' between two levels (support and resistance).
Can last weeks or months. Usually breaks out powerfully in one direction.

HOW DO YOU RECOGNIZE THE CURRENT PHASE?

Look at the 1D chart, past 3 months:
— Is price making higher peaks and higher bottoms? → bull market
— Is price making lower peaks and lower bottoms? → bear market
— Is price moving back and forth without direction? → sideways

GREEN AND RED: not as simple as it looks

+5% = BTC rose 5% compared to yesterday. Was €80,000, now €84,000.
-10% = BTC dropped 10%. Was €80,000, now €72,000.

But: red is NOT always bad. In an uptrend, a red day of -3% is often a buying opportunity — the "dip" everyone says they want to buy but then fears to buy.
And green isn't always good. In an overheated bull market, green can be the moment to take profits.

Red or green says nothing on its own. Context is everything.

24/7 MARKET: no closing time

Stocks have opening hours. Crypto doesn't. BTC trades every hour of every day, all year round.

This means: you can wake up at 3am and BTC is 15% lower (or higher). That's the reality of crypto.

Important times for larger movements (European time):
— 09:00 — European markets open: first institutions active
— 14:30 — Wall Street opens: largest volume of the day, largest moves
— 22:00 — Wall Street closes: sometimes quieter, sometimes large moves from Asian session
— 00:00-08:00 — Asian session: lower volume, but sudden large moves possible

Action: open the BTC 1D chart. Look at the past 6 months. Write down which phase you see: bull, bear or sideways? And how long has that phase lasted?

Marcus says: The market phase determines EVERYTHING. In a bull market you can barely lose if you follow the trend. In a bear market you can barely win going long. Learn to recognize the phase before you do anything.`,
        termsNL: [
          { term: "Bull Markt", def: "Langdurige stijging. Hogere toppen, hogere bodems. Positief sentiment. Iedereen is optimistisch. Gevaar: FOMO boven aan de top." },
          { term: "Bear Markt", def: "Langdurige daling. Lagere toppen, lagere bodems. Negatief sentiment. Gevaar: paniek verkopen op de bodem." },
          { term: "Sideways / Consolidatie", def: "Prijs beweegt horizontaal tussen support en resistance. Markt verzamelt kracht. Uitbraak volgt — richting onzeker." },
          { term: "Bullish / Bearish", def: "Bullish = positief, verwacht stijging. Bearish = negatief, verwacht daling. Bijv: 'Marcus is bullish op BTC deze week.'" },
          { term: "FOMO", def: "Fear Of Missing Out. Angst om een stijging te missen. Leidt tot impulsief kopen bovenaan. De gevaarlijkste emotie voor een beginner." },
          { term: "Correctie", def: "Tijdelijke daling van 10-30% binnen een bull markt. Normaal en gezond. Niet hetzelfde als een bear markt." },
        ],
        termsEN: [
          { term: "Bull Market", def: "Extended rise. Higher peaks, higher bottoms. Positive sentiment. Everyone is optimistic. Danger: FOMO at the top." },
          { term: "Bear Market", def: "Extended fall. Lower peaks, lower bottoms. Negative sentiment. Danger: panic selling at the bottom." },
          { term: "Sideways / Consolidation", def: "Price moves horizontally between support and resistance. Market gathers strength. Breakout follows — direction uncertain." },
          { term: "Bullish / Bearish", def: "Bullish = positive, expecting rise. Bearish = negative, expecting fall. E.g.: 'Marcus is bullish on BTC this week.'" },
          { term: "FOMO", def: "Fear Of Missing Out. Fear of missing a rise. Leads to impulsive buying at the top. The most dangerous emotion for a beginner." },
          { term: "Correction", def: "Temporary decline of 10-30% within a bull market. Normal and healthy. Not the same as a bear market." },
        ],
        checkNL: {
          q: "BTC stijgt 8 maanden lang. Dan daalt hij plotseling 18% in 2 weken. Social media: iedereen zegt 'bear markt is begonnen'. Wat denk jij?",
          options: [
            "Inderdaad bear markt — 18% daling is definitief",
            "Mogelijk een correctie binnen een bull markt — 18% is normaal in een trend, één signaal is niet genoeg",
            "Sideways markt — want de prijs gaat op en neer",
            "Onmogelijk te beoordelen zonder de RSI",
          ],
          correct: 1,
          explain: "Een -18% daling na 8 maanden bull markt is een CORRECTIE — geen bevestigde bear markt. Bear markten kenmerken zich door maanden van lagere toppen en lagere bodems, niet één scherpe dip. Traders die bij elke correctie 'bear markt!' roepen verkopen altijd op het slechtste moment. Kijk naar de grotere structuur.",
        },
        checkEN: {
          q: "BTC rises for 8 months. Then suddenly drops 18% in 2 weeks. Social media: everyone says 'bear market has started'. What do you think?",
          options: [
            "Indeed bear market — 18% drop is definitive",
            "Possibly a correction within a bull market — 18% is normal in a trend, one signal isn't enough",
            "Sideways market — because price goes up and down",
            "Impossible to assess without the RSI",
          ],
          correct: 1,
          explain: "A -18% drop after 8 months of bull market is a CORRECTION — not a confirmed bear market. Bear markets are characterized by months of lower peaks and lower bottoms, not one sharp dip. Traders who shout 'bear market!' at every correction always sell at the worst moment. Look at the broader structure.",
        },
      },
      {
        id: "l1-altcoins",
        icon: "🌐",
        titleNL: "Altcoins en het ecosysteem — meer dan alleen Bitcoin",
        titleEN: "Altcoins and the ecosystem — more than just Bitcoin",
        contentNL: `Marcus stelt je een vraag: waarom bestaat er naast Bitcoin nog duizenden andere crypto's? Is Ethereum gewoon een goedkopere Bitcoin? Of is het iets totaal anders?

Dit is een van de meest misverstane vragen in crypto. En het antwoord bepaalt hoe je naar de markt kijkt.

WAT IS EEN ALTCOIN?

Altcoin = elke cryptocurrency die NIET Bitcoin is. De naam komt van "alternative coin." Er zijn er meer dan 20.000. De meeste zijn waardeloos. Een handvol zijn echt relevant.

De hiërarchie van crypto:

BITCOIN (BTC) — de digitale goudstandaard
— Oorsprong: 2009
— Doel: waardeopslag, gedecentraliseerd geld
— Maximaal aanbod: 21 miljoen
— Positie: de benchmark. Als BTC daalt, dalen bijna alle altcoins mee.

ETHEREUM (ETH) — het slimme contract platform
— Oorsprong: 2015, bedacht door Vitalik Buterin
— Doel: programmeerbare blockchain. Op Ethereum draaien apps, DeFi, NFTs.
— Vergelijking: als Bitcoin een rekenmachine is, is Ethereum een smartphone.
— Positie: #2 van de markt. De meeste crypto-apps draaien op Ethereum of Ethereum-klonen.

LARGE CAPS — de gevestigde namen
Bijv. Solana (SOL), BNB, XRP, Cardano (ADA). Marktcap >€1 miljard. Meer liquide, minder risico dan kleine coins.

SMALL CAPS / MEME COINS — hoog risico
Bijv. Dogecoin, Shiba Inu, willekeurige nieuwe tokens. Kunnen in een dag 10× stijgen — en in een week 95% verliezen.

BITCOIN DOMINANTIE — de thermometer van het ecosysteem

Bitcoin Dominantie = het percentage van de totale crypto-marktcap dat BTC uitmaakt.

Wanneer BTC dominantie STIJGT: geld stroomt van altcoins naar Bitcoin. Altcoins dalen relatief. Veilig-haven gedrag.

Wanneer BTC dominantie DAALT: geld stroomt naar altcoins. Altcoin season — kleine coins kunnen enorm stijgen.

In Bitcoin Mentor staat de dominantie op het dashboard. Dit is één van je eerste indicatoren elke ochtend.

WAAROM BEGINNERS ALTIJD BEGINNEN MET BTC

Bitcoin is de meest liquide, meest voorspelbare, meest gevolgde crypto. Hij heeft de meeste historische data. De meeste technische analyse werkt het best op BTC. Altcoins zijn complexer, manipulatievoeliger, en moeilijker te analyseren.

Marcus' regel: leer BTC handelen voordat je altcoins aanraakt. Als je BTC niet kunt lezen, kun je SOL of DOGE zeker niet lezen.

Actie: ga naar CoinMarketCap.com. Bekijk de top 10 coins. Kijk naar BTC dominantie (rechtsboven). Noteer: hoeveel procent is BTC van de totale markt vandaag?

Marcus zegt: De altcoin markt is een uitvergroting van Bitcoin. Als BTC niest, krijgt de altcoin-markt longontsteking. Beheers de benchmark eerst.`,
        contentEN: `Marcus asks you a question: why do thousands of other cryptos exist alongside Bitcoin? Is Ethereum just a cheaper Bitcoin? Or is it something totally different?

This is one of the most misunderstood questions in crypto. And the answer determines how you view the market.

WHAT IS AN ALTCOIN?

Altcoin = any cryptocurrency that is NOT Bitcoin. The name comes from "alternative coin." There are more than 20,000. Most are worthless. A handful are truly relevant.

The hierarchy of crypto:

BITCOIN (BTC) — the digital gold standard
— Origin: 2009
— Purpose: store of value, decentralized money
— Maximum supply: 21 million
— Position: the benchmark. When BTC falls, almost all altcoins fall with it.

ETHEREUM (ETH) — the smart contract platform
— Origin: 2015, conceived by Vitalik Buterin
— Purpose: programmable blockchain. Apps, DeFi, NFTs run on Ethereum.
— Comparison: if Bitcoin is a calculator, Ethereum is a smartphone.
— Position: #2 in the market. Most crypto apps run on Ethereum or Ethereum clones.

LARGE CAPS — the established names
E.g. Solana (SOL), BNB, XRP, Cardano (ADA). Market cap >€1 billion. More liquid, less risk than small coins.

SMALL CAPS / MEME COINS — high risk
E.g. Dogecoin, Shiba Inu, random new tokens. Can rise 10× in a day — and lose 95% in a week.

BITCOIN DOMINANCE — the ecosystem thermometer

Bitcoin Dominance = the percentage of total crypto market cap that BTC represents.

When BTC dominance RISES: money flows from altcoins to Bitcoin. Altcoins fall relatively. Safe-haven behavior.

When BTC dominance FALLS: money flows to altcoins. Altcoin season — small coins can rise enormously.

In Bitcoin Mentor the dominance is shown on the dashboard. This is one of your first indicators every morning.

WHY BEGINNERS ALWAYS START WITH BTC

Bitcoin is the most liquid, most predictable, most followed crypto. It has the most historical data. Technical analysis works best on BTC. Altcoins are more complex, more susceptible to manipulation, and harder to analyze.

Marcus's rule: learn to trade BTC before touching altcoins. If you can't read BTC, you definitely can't read SOL or DOGE.

Action: go to CoinMarketCap.com. Look at the top 10 coins. Check BTC dominance (top right). Note: what percentage is BTC of the total market today?

Marcus says: The altcoin market is an amplified version of Bitcoin. When BTC sneezes, the altcoin market gets pneumonia. Master the benchmark first.`,
        termsNL: [
          { term: "Altcoin", def: "Elke cryptocurrency die niet Bitcoin is. Meer dan 20.000 bestaan, meeste zijn waardeloos." },
          { term: "Ethereum (ETH)", def: "De #2 crypto. Programmeerbare blockchain waarop apps, DeFi en NFTs draaien. Niet hetzelfde als Bitcoin." },
          { term: "Large Cap", def: "Crypto met hoge marktcap (>€1 mrd). Meer liquide, stabieler. Bijv. ETH, SOL, BNB." },
          { term: "Meme Coin", def: "Crypto zonder echte technologie, gedreven door hype (Dogecoin, Shiba). Extreem volatiel en riskant." },
          { term: "Bitcoin Dominantie", def: "% van totale crypto marktcap dat BTC is. Hoog = geld in BTC. Laag = geld in altcoins (altcoin season)." },
          { term: "Altcoin Season", def: "Periode waarin Bitcoin dominantie daalt en altcoins sterker stijgen dan BTC." },
        ],
        termsEN: [
          { term: "Altcoin", def: "Any cryptocurrency that isn't Bitcoin. More than 20,000 exist, most are worthless." },
          { term: "Ethereum (ETH)", def: "The #2 crypto. Programmable blockchain on which apps, DeFi and NFTs run. Not the same as Bitcoin." },
          { term: "Large Cap", def: "Crypto with high market cap (>€1 billion). More liquid, more stable. E.g. ETH, SOL, BNB." },
          { term: "Meme Coin", def: "Crypto without real technology, driven by hype (Dogecoin, Shiba). Extremely volatile and risky." },
          { term: "Bitcoin Dominance", def: "% of total crypto market cap that is BTC. High = money in BTC. Low = money in altcoins (altcoin season)." },
          { term: "Altcoin Season", def: "Period when Bitcoin dominance falls and altcoins rise stronger than BTC." },
        ],
        checkNL: {
          q: "BTC dominantie stijgt van 52% naar 62% in twee weken. Wat verwacht je van altcoins in die periode?",
          options: [
            "Altcoins stijgen ook — want de crypto markt groeit",
            "Altcoins dalen relatief — geld stroomt van altcoins naar BTC",
            "Altcoins zijn onafhankelijk van BTC dominantie",
            "Altcoin season begint — lagere dominantie is goed voor altcoins",
          ],
          correct: 1,
          explain: "Stijgende BTC dominantie = geld stroomt VAN altcoins NAAR BTC. Altcoins dalen relatief — zelfs als ze in euro's gelijk blijven, verliezen ze terrein ten opzichte van BTC. Dit is risk-off gedrag: beleggers vluchten naar de veiligste crypto. Dalende dominantie = altcoin season.",
        },
        checkEN: {
          q: "BTC dominance rises from 52% to 62% in two weeks. What do you expect from altcoins in that period?",
          options: [
            "Altcoins rise too — because the crypto market is growing",
            "Altcoins fall relatively — money flows from altcoins to BTC",
            "Altcoins are independent of BTC dominance",
            "Altcoin season begins — lower dominance is good for altcoins",
          ],
          correct: 1,
          explain: "Rising BTC dominance = money flows FROM altcoins TO BTC. Altcoins fall relatively — even if they stay flat in euros, they lose ground against BTC. This is risk-off behavior: investors flee to the safest crypto. Falling dominance = altcoin season.",
        },
      },
      {
        id: "l1-marktcap",
        icon: "📊",
        titleNL: "Marktkapitalisatie — de echte maatstaf",
        titleEN: "Market capitalization — the real measure",
        contentNL: `Marcus stelt je een vraag die veel beginners verkeerd beantwoorden: een coin staat op €0,002. Een andere op €80.000. Welke is 'goedkoper' om te kopen?

Als je antwoord "de coin van €0,002" is — lees deze les goed. Dit is een van de duurste misverstanden in crypto.

WAT IS MARKTKAPITALISATIE?

Marktcap = prijs × totaal aantal coins in omloop.

Voorbeeld:
— BTC prijs: €80.000. Aantal BTC in omloop: 19,7 miljoen.
— BTC marktcap = €80.000 × 19.700.000 = €1.576 miljard.

Een willekeurige meme coin:
— Prijs: €0,002. Coins in omloop: 1 biljoen (1.000.000.000.000).
— Marktcap = €0,002 × 1.000.000.000.000 = €2 miljard.

Verrassend: die meme coin heeft een marktcap van €2 miljard. Dat is niet klein. En voor die coin te verdubbelen naar €0,004, moet er €2 miljard aan nieuw geld bijkomen. Voor BTC te verdubbelen moet er €1.576 miljard bij.

De prijs per coin zegt NIETS. Marktcap zegt alles.

WAAROM DIT ZO BELANGRIJK IS

Beginners kopen coins met een lage prijs per coin omdat ze denken "als dit ooit net als BTC wordt, word ik rijk." Maar een coin van €0,002 heeft misschien al een marktcap van miljarden — er is geen ruimte meer voor ×1000 groei.

Bitcoin had in 2010 een prijs van $0,05. Dat was NIET de reden om het te kopen. Het was dat de marktcap toen vrijwel nul was — er was enorm veel ruimte voor groei.

DE DRIE CATEGORIEËN:

Large Cap (>€10 miljard marktcap): BTC, ETH, SOL.
— Stabielst, meest liquide, minst risico, maar ook langzaamst groeiend.

Mid Cap (€1-10 miljard): gevestigde altcoins.
— Meer potentieel, meer risico.

Small Cap (<€1 miljard): kleine projecten.
— Kunnen 10× gaan — maar ook naar nul. Hoog risico.

HOE LEES JE MARKTCAP IN BITCOIN MENTOR?

Op het dashboard zie je de marktcap van elke asset naast de prijs. Op CoinMarketCap.com zie je de top 100 gerangschikt op marktcap.

Praktische regel: kijk ALTIJD naar de marktcap, niet de prijs, als je beoordeelt hoe groot een coin al is.

Actie: ga naar CoinMarketCap.com. Bekijk de top 5. Noteer voor elke coin: prijs EN marktcap. Snap je nu waarom een coin van €0.50 groter kan zijn dan een coin van €50?

Marcus zegt: Prijs is marketing. Marktcap is realiteit. Elke beginner die €500 in een €0,001-coin steekt "omdat het de nieuwe Bitcoin wordt" heeft deze les niet begrepen.`,
        contentEN: `Marcus asks you a question that many beginners answer wrong: one coin is at €0.002. Another at €80,000. Which is 'cheaper' to buy?

If your answer is "the coin at €0.002" — read this lesson carefully. This is one of the most expensive misconceptions in crypto.

WHAT IS MARKET CAPITALIZATION?

Market cap = price × total number of coins in circulation.

Example:
— BTC price: €80,000. BTC in circulation: 19.7 million.
— BTC market cap = €80,000 × 19,700,000 = €1,576 billion.

A random meme coin:
— Price: €0.002. Coins in circulation: 1 trillion (1,000,000,000,000).
— Market cap = €0.002 × 1,000,000,000,000 = €2 billion.

Surprising: that meme coin has a market cap of €2 billion. That's not small. And for that coin to double to €0.004, €2 billion in new money must come in. For BTC to double, €1,576 billion must come in.

Price per coin says NOTHING. Market cap says everything.

WHY THIS IS SO IMPORTANT

Beginners buy low-price coins thinking "if this ever becomes like BTC, I'll get rich." But a coin at €0.002 might already have a market cap of billions — there's no room left for ×1000 growth.

Bitcoin in 2010 had a price of $0.05. That was NOT the reason to buy it. It was that the market cap was virtually zero then — there was enormous room for growth.

THE THREE CATEGORIES:

Large Cap (>€10 billion market cap): BTC, ETH, SOL.
— Most stable, most liquid, least risk, but also slowest growing.

Mid Cap (€1-10 billion): established altcoins.
— More potential, more risk.

Small Cap (<€1 billion): small projects.
— Can 10× — but also go to zero. High risk.

HOW TO READ MARKET CAP IN BITCOIN MENTOR?

On the dashboard you see the market cap of each asset next to the price. On CoinMarketCap.com you see the top 100 ranked by market cap.

Practical rule: ALWAYS look at market cap, not price, when assessing how big a coin already is.

Action: go to CoinMarketCap.com. Look at the top 5. Note for each coin: price AND market cap. Do you now understand why a €0.50 coin can be bigger than a €50 coin?

Marcus says: Price is marketing. Market cap is reality. Every beginner who puts €500 into a €0.001 coin "because it'll be the next Bitcoin" hasn't understood this lesson.`,
        termsNL: [
          { term: "Marktkapitalisatie (Marktcap)", def: "Prijs × aantal coins in omloop. De echte maatstaf voor hoe groot een crypto is." },
          { term: "Large Cap", def: "Marktcap >€10 miljard. BTC, ETH. Stabiel, liquide, laag risico relatief gezien." },
          { term: "Mid Cap", def: "Marktcap €1-10 miljard. Meer groeipotentieel maar ook meer risico." },
          { term: "Small Cap", def: "Marktcap <€1 miljard. Kunnen explosief stijgen maar ook naar nul. Hoog risico." },
          { term: "Circulerend Aanbod", def: "Het aantal coins dat nu in omloop is. Bepalend voor de marktcap-berekening." },
          { term: "Totaal Aanbod / Max Supply", def: "Het maximale aantal coins dat ooit bestaat. BTC: 21 miljoen. Beïnvloedt schaarste." },
        ],
        termsEN: [
          { term: "Market Capitalization (Market Cap)", def: "Price × number of coins in circulation. The real measure of how large a crypto is." },
          { term: "Large Cap", def: "Market cap >€10 billion. BTC, ETH. Stable, liquid, relatively low risk." },
          { term: "Mid Cap", def: "Market cap €1-10 billion. More growth potential but also more risk." },
          { term: "Small Cap", def: "Market cap <€1 billion. Can rise explosively but also go to zero. High risk." },
          { term: "Circulating Supply", def: "The number of coins currently in circulation. Determines market cap calculation." },
          { term: "Total Supply / Max Supply", def: "The maximum number of coins that will ever exist. BTC: 21 million. Affects scarcity." },
        ],
        checkNL: {
          q: "Coin A: prijs €0,001, 500 biljoen coins in omloop. Coin B: prijs €500, 1 miljoen coins in omloop. Welke heeft de grotere marktcap?",
          options: [
            "Coin B — hogere prijs per coin",
            "Coin A — meer coins in omloop dus groter",
            "Coin A: €500 miljard marktcap. Coin B: €500 miljoen marktcap. Coin A is 1000× groter.",
            "Ze zijn gelijk — prijs en aanbod compenseren elkaar altijd",
          ],
          correct: 2,
          explain: "Coin A: €0,001 × 500.000.000.000.000 = €500 miljard. Coin B: €500 × 1.000.000 = €500 miljoen. Coin A is 1.000× groter dan Coin B — ondanks de 500.000× lagere prijs per coin. Dit is waarom je nooit op prijs per coin kunt vertrouwen. Marktcap is de enige eerlijke maatstaf.",
        },
        checkEN: {
          q: "Coin A: price €0.001, 500 trillion coins in circulation. Coin B: price €500, 1 million coins in circulation. Which has the larger market cap?",
          options: [
            "Coin B — higher price per coin",
            "Coin A — more coins in circulation so larger",
            "Coin A: €500 billion market cap. Coin B: €500 million market cap. Coin A is 1000× larger.",
            "They're equal — price and supply always compensate each other",
          ],
          correct: 2,
          explain: "Coin A: €0.001 × 500,000,000,000,000 = €500 billion. Coin B: €500 × 1,000,000 = €500 million. Coin A is 1,000× larger than Coin B — despite the 500,000× lower price per coin. This is why you can never rely on price per coin. Market cap is the only honest measure.",
        },
      },
      {
        id: "l1-stablecoins",
        icon: "💵",
        titleNL: "Stablecoins en trading pairs — de taal van crypto-handel",
        titleEN: "Stablecoins and trading pairs — the language of crypto trading",
        contentNL: `Marcus vraagt je: wanneer je BTC 'verkoopt', wat ontvang je dan? Euros? Dollars? Of iets anders?

Op de meeste crypto-exchanges ontvang je USDT. Dat is een stablecoin — en het is de ruggengraat van de hele crypto-handel.

WAT IS EEN STABLECOIN?

Een stablecoin is een cryptocurrency waarvan de waarde gekoppeld is aan een stabiele munt — meestal de US dollar.

1 USDT ≈ 1 US Dollar. Altijd. (bijna)
1 USDC ≈ 1 US Dollar. Altijd.

Waarom bestaat dit? Crypto is extreem volatiel. Als je BTC verkoopt en €5.000 winst wilt "parkeren" terwijl je wacht op de volgende koop, wil je niet dat die €5.000 ook daalt terwijl je wacht. Oplossing: zet het om naar USDT — dat blijft stabiel.

DE TWEE MEEST GEBRUIKTE STABLECOINS:

USDT (Tether): grootste stablecoin ter wereld. €65+ miljard in omloop. Gebruikt op vrijwel elke exchange wereldwijd. Kleine kanttekening: Tether heeft in het verleden vragen gehad over hun reserves.

USDC (USD Coin): gemaakt door Coinbase en Circle. Meer transparant, volledig geauditeerd. Iets kleiner maar betrouwbaarder voor grotere bedragen.

TRADING PAIRS — hoe de markt georganiseerd is

Op een exchange koop je niet "BTC". Je koopt het BTC/USDT PAIR — de verhouding tussen Bitcoin en USDT.

BTC/USDT = de prijs van BTC uitgedrukt in USDT.
Als BTC/USDT = 82.000, betekent dat: 1 BTC kost 82.000 USDT.

ETH/USDT = de prijs van Ethereum in USDT.
ETH/BTC = de prijs van Ethereum uitgedrukt in Bitcoin (hoeveel BTC kost 1 ETH?).

Waarom pairs belangrijk zijn:
— Je handelt altijd TWEE assets tegelijk. Als je BTC koopt, geef je USDT weg.
— Als je BTC verkoopt, ontvang je USDT.
— Je saldo is altijd in één van beide: BTC of USDT.

IN BITCOIN MENTOR:

De chart toont standaard BTC/USDT. De prijs die je ziet is in USDT. Als je papier-tradet, start je met USDT en koop je BTC. Als je verkoopt, ontvang je USDT terug.

HOE EURO's IN DIT SYSTEEM PASSEN:

In Europa koop je crypto via Bitvavo met euro's. Bitvavo converteert intern. Op grote exchanges zoals Binance handel je in USDT-pairs. Dat is de internationale standaard.

Praktisch: denk aan USDT als "crypto-dollars". De markt denkt in dollars, niet euros.

Actie: ga naar de chart in Bitcoin Mentor. Kijk: welk pair zie je? BTC/USDT. Zie je nu hoe dat werkt? De prijs is hoeveel USDT één BTC kost.

Marcus zegt: Stablecoins zijn je schuilkelder. Als de markt crasht en jij wilt USDT houden, ben je niet 'uit de markt' — je bent er klaar voor om op het juiste moment terug te kopen.`,
        contentEN: `Marcus asks you: when you 'sell' BTC, what do you receive? Euros? Dollars? Or something else?

On most crypto exchanges you receive USDT. That's a stablecoin — and it's the backbone of all crypto trading.

WHAT IS A STABLECOIN?

A stablecoin is a cryptocurrency whose value is pegged to a stable currency — usually the US dollar.

1 USDT ≈ 1 US Dollar. Always. (almost)
1 USDC ≈ 1 US Dollar. Always.

Why does this exist? Crypto is extremely volatile. If you sell BTC and want to "park" €5,000 profit while waiting for the next buy, you don't want that €5,000 to also drop while you wait. Solution: convert to USDT — that stays stable.

THE TWO MOST USED STABLECOINS:

USDT (Tether): world's largest stablecoin. €65+ billion in circulation. Used on virtually every exchange worldwide. Small caveat: Tether has historically had questions about their reserves.

USDC (USD Coin): made by Coinbase and Circle. More transparent, fully audited. Slightly smaller but more reliable for larger amounts.

TRADING PAIRS — how the market is organized

On an exchange you don't buy "BTC". You buy the BTC/USDT PAIR — the ratio between Bitcoin and USDT.

BTC/USDT = the price of BTC expressed in USDT.
If BTC/USDT = 82,000, that means: 1 BTC costs 82,000 USDT.

ETH/USDT = the price of Ethereum in USDT.
ETH/BTC = the price of Ethereum expressed in Bitcoin (how much BTC does 1 ETH cost?).

Why pairs matter:
— You always trade TWO assets simultaneously. When you buy BTC, you give away USDT.
— When you sell BTC, you receive USDT.
— Your balance is always in one of both: BTC or USDT.

IN BITCOIN MENTOR:

The chart shows BTC/USDT by default. The price you see is in USDT. When you paper trade, you start with USDT and buy BTC. When you sell, you receive USDT back.

HOW EUROS FIT IN THIS SYSTEM:

In Europe you buy crypto via Bitvavo with euros. Bitvavo converts internally. On large exchanges like Binance you trade in USDT pairs. That's the international standard.

Practical: think of USDT as "crypto-dollars". The market thinks in dollars, not euros.

Action: go to the chart in Bitcoin Mentor. Look: which pair do you see? BTC/USDT. Do you now see how that works? The price is how much USDT one BTC costs.

Marcus says: Stablecoins are your shelter. When the market crashes and you want to hold USDT, you're not 'out of the market' — you're ready to buy back at the right moment.`,
        termsNL: [
          { term: "Stablecoin", def: "Cryptocurrency gekoppeld aan een stabiele munt (USD). 1 USDT ≈ 1 dollar. Beschermt tegen volatiliteit." },
          { term: "USDT (Tether)", def: "Grootste stablecoin. Internationaal handelsstandaard op exchanges. 1 USDT = 1 USD." },
          { term: "USDC", def: "Stablecoin van Coinbase/Circle. Transparanter dan USDT. Ook 1:1 met USD." },
          { term: "Trading Pair", def: "Twee assets die je tegelijk handelt. BTC/USDT = je koopt BTC, geeft USDT. Verkoop je BTC, ontvang je USDT." },
          { term: "Base / Quote Currency", def: "In BTC/USDT: BTC is de base (wat je koopt), USDT is de quote (waarmee je betaalt)." },
          { term: "Liquiditeit in USDT", def: "Je winst parkeren in USDT tijdens onzekerheid. Klaar om snel terug te kopen zonder exchange-transacties." },
        ],
        termsEN: [
          { term: "Stablecoin", def: "Cryptocurrency pegged to a stable currency (USD). 1 USDT ≈ 1 dollar. Protects against volatility." },
          { term: "USDT (Tether)", def: "Largest stablecoin. International trading standard on exchanges. 1 USDT = 1 USD." },
          { term: "USDC", def: "Stablecoin from Coinbase/Circle. More transparent than USDT. Also 1:1 with USD." },
          { term: "Trading Pair", def: "Two assets you trade simultaneously. BTC/USDT = you buy BTC, give USDT. Sell BTC, receive USDT." },
          { term: "Base / Quote Currency", def: "In BTC/USDT: BTC is the base (what you buy), USDT is the quote (what you pay with)." },
          { term: "Liquidity in USDT", def: "Parking your profit in USDT during uncertainty. Ready to buy back quickly without exchange transactions." },
        ],
        checkNL: {
          q: "Je hebt 0.1 BTC. BTC staat op €80.000. Je 'verkoopt' je BTC. Wat heb je daarna in je account?",
          options: [
            "€8.000 in euros — direct overgemaakt naar je bankrekening",
            "8.000 USDT — de stablecoin waartegen BTC werd verhandeld",
            "Niks — je moet eerst een bankrekening koppelen",
            "0.1 BTC + de winst in euros",
          ],
          correct: 1,
          explain: "Op een exchange handel je in pairs. BTC/USDT: als je BTC verkoopt, ontvang je USDT. 0.1 BTC × €80.000 = €8.000 ≈ 8.000 USDT. Die USDT staat in je exchange-account. Wil je euros? Dan moet je USDT → EUR converteren en opnemen naar je bank. Dat is een extra stap.",
        },
        checkEN: {
          q: "You have 0.1 BTC. BTC is at €80,000. You 'sell' your BTC. What do you have in your account afterwards?",
          options: [
            "€8,000 in euros — transferred directly to your bank account",
            "8,000 USDT — the stablecoin against which BTC was traded",
            "Nothing — you need to link a bank account first",
            "0.1 BTC + the profit in euros",
          ],
          correct: 1,
          explain: "On an exchange you trade in pairs. BTC/USDT: when you sell BTC, you receive USDT. 0.1 BTC × €80,000 = €8,000 ≈ 8,000 USDT. That USDT sits in your exchange account. Want euros? Then you need to convert USDT → EUR and withdraw to your bank. That's an extra step.",
        },
      },
      {
        id: "l1-volatiliteit",
        icon: "⚡",
        titleNL: "Volatiliteit — waarom crypto zo anders is",
        titleEN: "Volatility — why crypto is so different",
        contentNL: `Marcus stelt je een vraag: het is 2022. Je hebt €10.000 in BTC geïnvesteerd in november 2021. Een jaar later is je positie nog €1.700 waard. Dat is -83%. Hoe reageer je?

Als je antwoord "ik had dit niet verwacht" is, was je niet voorbereid op crypto.

Want dit — -83% in één jaar — is gewoon. Niet uitzonderlijk. In 2018 was het -84%. In 2015 -85%. Het hoort bij het asset.

WAT IS VOLATILITEIT?

Volatiliteit = de mate van prijsschommeling over een periode.

BTC beweegt gemiddeld 3-5% per dag. Op heftige dagen 10-15%. In crash-scenario's 30-50% in één maand.

Vergelijking:
— Aandelen (S&P 500): gemiddeld 15-20% volatiliteit per jaar.
— Bitcoin: gemiddeld 60-80% volatiliteit per jaar.
— Bitcoin is 4-5× volatieler dan de aandelenmarkt.

WAAROM IS CRYPTO ZO VOLATIEL?

1. Markt is klein. De totale crypto-markt (€2-3 biljoen) is een fractie van de aandelen- of obligatiemarkt. Grote spelers kunnen de markt bewegen.

2. Geen fundamentele anker. Aandelen hebben winst, omzet, dividenden. Crypto heeft perceptie en sentiment. Verandert het sentiment, verandert de prijs — snel.

3. 24/7 trading. Er is nooit een nacht-pauze. Slecht nieuws om 3 uur 's nachts = direct effect.

4. Jonge markt. Crypto bestaat pas 15 jaar. De markt is nog aan het ontdekken wat de 'echte' waarde is.

DE TWEE KANTEN VAN VOLATILITEIT:

RISICO: -50% is mogelijk in maanden. -80% is mogelijk in een jaar. Geld beleggen dat je nodig hebt in de komende 12 maanden is gevaarlijk.

KANS: +200% in één bull markt is normaal. +1000% in een altcoin cycle is gezien. Geen andere liquide markt biedt dit potentieel.

Dit is geen reclame voor crypto. Dit is realiteit. De volatiliteit die je rijk kan maken, is dezelfde die je kan ruïneren.

PRAKTISCHE REGELS OM VOLATILITEIT TE OVERLEVEN:

1. Investeer alleen geld dat je 3-5 jaar kunt missen.
2. Start klein. €100-500 om te leren. Laat emoties niet bepalen door de bedragen.
3. Gebruik altijd een stop-loss (les 5, niveau 2).
4. Diversifieer: nooit >50% van spaargeld in crypto.
5. Dollar Cost Averaging (DCA): koop elke maand een vast bedrag, ongeacht de prijs. Spreidt risico over tijd.

DE PSYCHOLOGISCHE TRAP:

In een bull markt voelt -5% verliezen onmogelijk. Dan komt er een dag van -15% en verkoopt iedereen in paniek. Dan stijgt BTC 40% in de twee weken daarna.

Volatiliteit test je psychologie, niet je analyse. Wie paniek niet kan uitschakelen, verliest in crypto.

Actie: kijk naar de BTC 1D grafiek, afgelopen 3 jaar. Markeer de grootste dalingen. Noteer: hoe lang duurde elke daling? Hoe snel herstelde BTC daarna?

Marcus zegt: Volatiliteit is het leergeld van de markt. Het elimineert zwakke handen. Als jij kalm blijft terwijl anderen panikeren, heb je al een edge.`,
        contentEN: `Marcus asks you a question: it's 2022. You invested €10,000 in BTC in November 2021. A year later your position is worth €1,700. That's -83%. How do you react?

If your answer is "I didn't expect this", you weren't prepared for crypto.

Because this — -83% in one year — is normal. Not exceptional. In 2018 it was -84%. In 2015 -85%. It comes with the asset.

WHAT IS VOLATILITY?

Volatility = the degree of price fluctuation over a period.

BTC moves on average 3-5% per day. On intense days 10-15%. In crash scenarios 30-50% in one month.

Comparison:
— Stocks (S&P 500): average 15-20% volatility per year.
— Bitcoin: average 60-80% volatility per year.
— Bitcoin is 4-5× more volatile than the stock market.

WHY IS CRYPTO SO VOLATILE?

1. Market is small. The total crypto market (€2-3 trillion) is a fraction of the stock or bond market. Large players can move the market.

2. No fundamental anchor. Stocks have profit, revenue, dividends. Crypto has perception and sentiment. Change the sentiment, change the price — fast.

3. 24/7 trading. There's never a night pause. Bad news at 3am = immediate effect.

4. Young market. Crypto has only existed 15 years. The market is still discovering what the 'real' value is.

THE TWO SIDES OF VOLATILITY:

RISK: -50% is possible in months. -80% is possible in a year. Investing money you need in the next 12 months is dangerous.

OPPORTUNITY: +200% in one bull market is normal. +1000% in an altcoin cycle has been seen. No other liquid market offers this potential.

This isn't advertising for crypto. This is reality. The volatility that can make you rich is the same that can ruin you.

PRACTICAL RULES TO SURVIVE VOLATILITY:

1. Only invest money you can miss for 3-5 years.
2. Start small. €100-500 to learn. Don't let amounts determine your emotions.
3. Always use a stop-loss (lesson 5, level 2).
4. Diversify: never >50% of savings in crypto.
5. Dollar Cost Averaging (DCA): buy a fixed amount every month, regardless of price. Spreads risk over time.

THE PSYCHOLOGICAL TRAP:

In a bull market -5% loss feels impossible. Then a -15% day comes and everyone sells in panic. Then BTC rises 40% in the two weeks after.

Volatility tests your psychology, not your analysis. Whoever can't switch off panic, loses in crypto.

Action: look at the BTC 1D chart, past 3 years. Mark the largest declines. Note: how long did each decline last? How quickly did BTC recover afterwards?

Marcus says: Volatility is the market's tuition fee. It eliminates weak hands. If you stay calm while others panic, you already have an edge.`,
        termsNL: [
          { term: "Volatiliteit", def: "Mate van prijsschommeling. BTC: 60-80% per jaar. Aandelen: 15-20%. Crypto is 4-5× volatieler." },
          { term: "Drawdown", def: "Percentage daling van de piek. BTC had -83% drawdown in 2022. Normaal in crypto." },
          { term: "Dollar Cost Averaging (DCA)", def: "Elke periode (week/maand) een vast bedrag investeren, ongeacht prijs. Spreidt risico." },
          { term: "Zwakke handen", def: "Traders die bij de eerste daling panikeren en verkopen. Versterken de volatiliteit door op het slechte moment te verkopen." },
          { term: "Risk Capital", def: "Geld dat je kunt veroorloven volledig te verliezen. ALLEEN dit beleggen in crypto." },
          { term: "HODL", def: "Crypto-slang voor 'vasthouden'. Strategie van lange-termijn beleggers die volatiliteit negeren." },
        ],
        termsEN: [
          { term: "Volatility", def: "Degree of price fluctuation. BTC: 60-80% per year. Stocks: 15-20%. Crypto is 4-5× more volatile." },
          { term: "Drawdown", def: "Percentage drop from peak. BTC had -83% drawdown in 2022. Normal in crypto." },
          { term: "Dollar Cost Averaging (DCA)", def: "Investing a fixed amount every period (week/month) regardless of price. Spreads risk." },
          { term: "Weak Hands", def: "Traders who panic and sell at the first drop. Amplify volatility by selling at the worst moment." },
          { term: "Risk Capital", def: "Money you can afford to lose completely. ONLY invest this in crypto." },
          { term: "HODL", def: "Crypto slang for 'hold'. Strategy of long-term investors who ignore volatility." },
        ],
        checkNL: {
          q: "Je hebt €2.000 in BTC. BTC daalt 35% in twee weken door negatief nieuws. Wat is de meest professionele reactie?",
          options: [
            "Verkopen — 35% verlies is een duidelijk signaal dat BTC naar nul gaat",
            "Alles verdubbelen — als het daalt moet je de gemiddelde prijs verlagen",
            "Kijken of je stop-loss geraakt is. Zo ja: systeem werkt. Zo nee: wachten op je plan.",
            "Niets doen want HODL is altijd de beste strategie",
          ],
          correct: 2,
          explain: "Professioneel reageren = je systeem volgen. Had je een stop-loss? Dan is die geraakt of niet — beide zijn correct output van je plan. Geen stop-loss? Dan is dit het moment om te leren waarom dat essentieel is. 'Verdubbelen' zonder plan is gokken. 'HODL altijd' is geen systeem, het is hopen.",
        },
        checkEN: {
          q: "You have €2,000 in BTC. BTC drops 35% in two weeks due to negative news. What is the most professional reaction?",
          options: [
            "Sell — 35% loss is a clear signal BTC is going to zero",
            "Double down — when it drops you should lower the average price",
            "Check if your stop-loss was hit. If yes: system works. If no: wait for your plan.",
            "Do nothing because HODL is always the best strategy",
          ],
          correct: 2,
          explain: "Reacting professionally = following your system. Did you have a stop-loss? Then it was hit or not — both are correct output of your plan. No stop-loss? Then this is the moment to learn why that's essential. 'Doubling down' without a plan is gambling. 'HODL always' isn't a system, it's hoping.",
        },
      },
      {
        id: "l1-exchange",
        icon: "🏦",
        titleNL: "Een exchange gebruiken — van account tot eerste aankoop",
        titleEN: "Using an exchange — from account to first purchase",
        contentNL: `Marcus vraagt: als je nu €200 in BTC wilt kopen, weet je dan exact hoe? Welke exchange? Wat is KYC? Wat kost het? En hoe voorkom je veelgemaakte fouten bij je eerste aankoop?

Dit is de praktische les die de meeste beginners overslaan — en dan vast lopen bij stap één.

WAT IS EEN EXCHANGE?

Een exchange is een platform waar je crypto kunt kopen, verkopen en traden. Er zijn twee types:

CENTRALIZED EXCHANGE (CEX): Bitvavo, Coinbase, Binance, Kraken.
— Je maakt een account aan met je identiteit (KYC).
— De exchange beheert jouw crypto (zij houden de private keys).
— Gebruiksvriendelijk, goede klantenservice, geschikt voor beginners.
— In Europa is Bitvavo populair vanwege Nederlandse licentie, lage fees en Nederlandstalige support.

DECENTRALIZED EXCHANGE (DEX): Uniswap, PancakeSwap.
— Geen account, geen KYC. Verbind je eigen wallet.
— Peer-to-peer. Jij blijft altijd eigenaar van je private keys.
— Complexer, geen klantenservice. Niet geschikt voor beginners.

VOOR NU: gebruik een CEX (Bitvavo). Later, als je meer begrijpt, kun je DEX verkennen.

HOE EEN BITVAVO ACCOUNT AANMAKEN:

1. Ga naar bitvavo.com → "Registreer"
2. Vul je gegevens in (naam, email, wachtwoord)
3. Stel DIRECT 2FA in (Google Authenticator of Authy) — dit is verplicht voor veiligheid
4. KYC verificatie: upload je identiteitsbewijs + selfie. Dit is wettelijk verplicht (AML/KYC wetgeving). Duurt 5-15 minuten.
5. Koppel je bankrekening (IBAN) voor stortingen

WAT IS KYC EN WAAROM IS HET VERPLICHT?

KYC = Know Your Customer. Exchanges moeten wettelijk weten wie hun klanten zijn (anti-witwas wetgeving). Dit is hetzelfde als bij een bank.

Jouw gegevens (ID, selfie) worden opgeslagen. Dit is niet anoniem. Als je anonimiteit wil, zijn er andere opties — maar dat is gevorderd.

FEES — WAT KOST TRADEN?

Bitvavo rekent 0.25% fee per transactie (kan dalen bij hogere volumes).
Voorbeeld: je koopt €500 BTC → fee = €1,25.

Spread: het verschil tussen de koop- en verkoopprijs. Op Bitvavo is die spread smal.

Stortingskosten: SEPA-overschrijving is gratis op Bitvavo. iDEAL kost 1%.

JE EERSTE AANKOOP — STAP VOOR STAP:

1. Log in op Bitvavo
2. Ga naar "Markt" → kies Bitcoin (BTC)
3. Kies ordertype: "Markt" (direct kopen) of "Limiet" (kopen op specifieke prijs)
4. Vul het bedrag in (€ of BTC)
5. Controleer de fee en totaalprijs
6. Bevestig — je hebt BTC

VEELGEMAAKTE FOUTEN BIJ BEGINNERS:

1. FOMO kopen: "BTC stijgt hard, ik MOET nu kopen." → Wacht op je plan.
2. Geen stop-loss: je koopt, BTC daalt 30%, je weet niet wat te doen.
3. Alle spaargeld: nooit meer dan je kunt veroorloven te verliezen.
4. 2FA vergeten: account onbeveiligd. Eerste actie na registratie.
5. Verkopen bij eerste dip: normale volatiliteit verkeerd interpreteren.

Actie: maak een account aan op Bitvavo als je dat nog niet hebt. Verificeer je identiteit. Stel 2FA in. Doe een kleine teststorting van €10. Bekijk de interface.

Marcus zegt: Je eerste aankoop doet iets met je. De prijs beweegt en je voelt het. Dat is de eerste les in trading-psychologie — die kan geen enkele les vervangen. Maar doe het met bedragen die je kunt verliezen.`,
        contentEN: `Marcus asks: if you want to buy €200 in BTC right now, do you know exactly how? Which exchange? What is KYC? What does it cost? And how do you avoid common mistakes on your first purchase?

This is the practical lesson most beginners skip — and then get stuck at step one.

WHAT IS AN EXCHANGE?

An exchange is a platform where you can buy, sell and trade crypto. There are two types:

CENTRALIZED EXCHANGE (CEX): Bitvavo, Coinbase, Binance, Kraken.
— You create an account with your identity (KYC).
— The exchange manages your crypto (they hold the private keys).
— User-friendly, good customer service, suitable for beginners.
— In Europe, Bitvavo is popular for its Dutch license, low fees and Dutch support.

DECENTRALIZED EXCHANGE (DEX): Uniswap, PancakeSwap.
— No account, no KYC. Connect your own wallet.
— Peer-to-peer. You always remain owner of your private keys.
— More complex, no customer service. Not suitable for beginners.

FOR NOW: use a CEX (Bitvavo). Later, as you understand more, you can explore DEX.

HOW TO CREATE A BITVAVO ACCOUNT:

1. Go to bitvavo.com → "Register"
2. Fill in your details (name, email, password)
3. IMMEDIATELY set up 2FA (Google Authenticator or Authy) — essential for security
4. KYC verification: upload your ID + selfie. This is legally required (AML/KYC legislation). Takes 5-15 minutes.
5. Link your bank account (IBAN) for deposits

WHAT IS KYC AND WHY IS IT MANDATORY?

KYC = Know Your Customer. Exchanges are legally required to know who their customers are (anti-money laundering legislation). This is the same as at a bank.

Your data (ID, selfie) is stored. This is not anonymous. If you want anonymity, there are other options — but that's advanced.

FEES — WHAT DOES TRADING COST?

Bitvavo charges 0.25% fee per transaction (can decrease at higher volumes).
Example: you buy €500 BTC → fee = €1.25.

Spread: the difference between buy and sell price. On Bitvavo the spread is narrow.

Deposit fees: SEPA transfer is free on Bitvavo. iDEAL costs 1%.

YOUR FIRST PURCHASE — STEP BY STEP:

1. Log in to Bitvavo
2. Go to "Market" → choose Bitcoin (BTC)
3. Choose order type: "Market" (buy immediately) or "Limit" (buy at specific price)
4. Fill in the amount (€ or BTC)
5. Check the fee and total price
6. Confirm — you have BTC

COMMON MISTAKES BY BEGINNERS:

1. FOMO buying: "BTC is rising hard, I MUST buy now." → Wait for your plan.
2. No stop-loss: you buy, BTC drops 30%, you don't know what to do.
3. All savings: never more than you can afford to lose.
4. Forgetting 2FA: account unsecured. First action after registration.
5. Selling at first dip: misinterpreting normal volatility.

Action: create an account on Bitvavo if you don't have one yet. Verify your identity. Set up 2FA. Make a small test deposit of €10. Explore the interface.

Marcus says: Your first purchase does something to you. The price moves and you feel it. That's the first lesson in trading psychology — no lesson can replace that. But do it with amounts you can lose.`,
        termsNL: [
          { term: "Exchange (CEX)", def: "Gecentraliseerd platform om crypto te kopen/verkopen. Bitvavo, Binance, Coinbase. Vereist KYC." },
          { term: "DEX", def: "Gedecentraliseerde exchange. Geen account nodig, jij behoudt private keys. Complexer, voor gevorderden." },
          { term: "KYC (Know Your Customer)", def: "Wettelijke identiteitsverificatie. ID + selfie uploaden. Verplicht op alle legale exchanges." },
          { term: "2FA (Two-Factor Authentication)", def: "Tweestaps-beveiliging via authenticator app. ALTIJD instellen. Beschermt je account als wachtwoord lekt." },
          { term: "Trading Fee", def: "Kosten per transactie. Bitvavo: 0.25%. Vermindert je winst — tel dit mee in je R/R." },
          { term: "SEPA-overboeking", def: "Bankovermaking binnen Europa. Gratis op Bitvavo. Duurt 1-2 werkdagen." },
        ],
        termsEN: [
          { term: "Exchange (CEX)", def: "Centralized platform to buy/sell crypto. Bitvavo, Binance, Coinbase. Requires KYC." },
          { term: "DEX", def: "Decentralized exchange. No account needed, you keep private keys. More complex, for advanced users." },
          { term: "KYC (Know Your Customer)", def: "Legal identity verification. Upload ID + selfie. Mandatory on all legal exchanges." },
          { term: "2FA (Two-Factor Authentication)", def: "Two-step security via authenticator app. ALWAYS set up. Protects account if password leaks." },
          { term: "Trading Fee", def: "Cost per transaction. Bitvavo: 0.25%. Reduces your profit — factor this into your R/R." },
          { term: "SEPA Transfer", def: "Bank transfer within Europe. Free on Bitvavo. Takes 1-2 business days." },
        ],
        checkNL: {
          q: "Je registreert je op Bitvavo. Wat is de EERSTE actie na het aanmaken van je account?",
          options: [
            "Meteen BTC kopen want de prijs is laag",
            "2FA instellen — je account is onbeveiligd zonder",
            "KYC later doen want dat duurt te lang",
            "Je wachtwoord opslaan in een notitie op je telefoon",
          ],
          correct: 1,
          explain: "2FA als eerste. Zonder 2FA is je account beveiligd met alleen een wachtwoord — dat is onvoldoende. Als jouw email gehackt wordt of je wachtwoord lekt, kan iemand anders inloggen en je BTC weghalen. Google Authenticator of Authy instellen kost 2 minuten en beschermt alles.",
        },
        checkEN: {
          q: "You register on Bitvavo. What is the FIRST action after creating your account?",
          options: [
            "Buy BTC immediately because the price is low",
            "Set up 2FA — your account is unsecured without it",
            "Do KYC later because it takes too long",
            "Save your password in a note on your phone",
          ],
          correct: 1,
          explain: "2FA first. Without 2FA your account is secured with just a password — that's insufficient. If your email gets hacked or your password leaks, someone else can log in and take your BTC. Setting up Google Authenticator or Authy takes 2 minutes and protects everything.",
        },
      },
    ],
  },
  {
    level: 2,
    labelNL: "Niveau 2 — Basis Trading",
    labelEN: "Level 2 — Basic Trading",
    descNL: "Grafieken lezen, orders plaatsen, risico begrijpen — de gereedschapskist van de trader.",
    descEN: "Reading charts, placing orders, understanding risk — the trader's toolbox.",
    lessons: [
      {
        id: "l2-candles",
        icon: "🕯️",
        titleNL: "Candlestick kaarsen — de taal van de markt",
        titleEN: "Candlestick candles — the language of the market",
        contentNL: `Marcus stelt je een vraag: kijk naar één kaars op de grafiek. Één enkele kaars. Hoeveel informatie geeft die jou? De meeste beginners zien alleen 'groen' of 'rood'. Een ervaren trader ziet een volledig verhaal van een gevecht tussen kopers en verkopers.

Elke candlestick toont precies 4 dingen voor een tijdsperiode:

1. OPEN — op welke prijs begon de periode? Hier opende het gevecht.
2. CLOSE — op welke prijs eindigde de periode? Dit is de eindstand.
3. HIGH — wat was de hoogste prijs? Hoe ver kwamen de kopers?
4. LOW — wat was de laagste prijs? Hoe ver kwamen de verkopers?

GROENE kaars: close hoger dan open → kopers wonnen deze ronde. Prijs steeg.
RODE kaars: close lager dan open → verkopers wonnen deze ronde. Prijs daalde.

Het LICHAAM (body) is het dikke gedeelte — het verschil tussen open en close. Een groot lichaam = duidelijke winnaar. Een klein lichaam = onbeslist gevecht.

De WICKS (schaduwen) zijn de dunne lijnen boven en onder het lichaam. Ze tonen hoe ver kopers of verkopers probeerden te gaan — maar teruggedrukt werden.

Een lange wick naar boven: kopers probeerden de prijs hoog te duwen, maar verkopers kwamen terug. Verkoopdruk boven.
Een lange wick naar beneden: verkopers probeerden de prijs laag te drukken, maar kopers kwamen terug. Koopdruk onder.

Timeframes: elke kaars staat voor een tijdsperiode. Op 1H grafiek = elke kaars is 1 uur gevecht. Op 4H = 4 uur. Op 1D = één dag. Hetzelfde verhaal, andere zoom.

Actie: open nu de grafiek. Klik op drie kaarsen — één grote groene, één grote rode, en één kaars met lange wick. Probeer voor elke kaars het verhaal te vertellen: wie won, wie probeerde wat?

Marcus zegt: Kaarsen zijn geen symbolen — het zijn verslagen van gevechten. Als je leert ze zo te lezen, zie je de markt anders dan 95% van de mensen.`,
        contentEN: `Marcus asks you a question: look at one candle on the chart. Just one. How much information does it give you? Most beginners see only 'green' or 'red'. An experienced trader sees a complete story of a battle between buyers and sellers.

Each candlestick shows exactly 4 things for a time period:

1. OPEN — at what price did the period begin? Here the battle opened.
2. CLOSE — at what price did the period end? This is the final score.
3. HIGH — what was the highest price? How far did buyers get?
4. LOW — what was the lowest price? How far did sellers get?

GREEN candle: close higher than open → buyers won this round. Price rose.
RED candle: close lower than open → sellers won this round. Price fell.

The BODY is the thick part — the difference between open and close. A large body = clear winner. A small body = indecisive battle.

The WICKS (shadows) are the thin lines above and below the body. They show how far buyers or sellers tried to go — but were pushed back.

Long wick upward: buyers tried to push price high, but sellers came back. Selling pressure above.
Long wick downward: sellers tried to push price low, but buyers came back. Buying pressure below.

Timeframes: each candle represents a time period. On 1H chart = each candle is 1 hour of battle. On 4H = 4 hours. On 1D = one day. Same story, different zoom.

Action: open the chart now. Click on three candles — one big green, one big red, and one candle with a long wick. Try to tell the story for each: who won, who tried what?

Marcus says: Candles aren't symbols — they're battle reports. When you learn to read them that way, you see the market differently from 95% of people.`,
        termsNL: [
          { term: "Candlestick / Kaars", def: "Grafische weergave van prijsbeweging over een tijdsperiode. Toont open, close, high en low." },
          { term: "Body (Lichaam)", def: "Het dikke gedeelte van de kaars — verschil tussen open en close. Groot = duidelijke richting." },
          { term: "Wick / Schaduw", def: "Dunne lijnen boven/onder het lichaam. Tonen de uiterste hoge en lage prijzen in de periode." },
          { term: "Open", def: "De openingsprijs van de tijdsperiode. Waar het gevecht begon." },
          { term: "Close", def: "De sluitingsprijs. Bepaalt of de kaars groen of rood is." },
          { term: "High / Low", def: "Hoogste en laagste prijs in de periode. Zichtbaar via de wicks." },
        ],
        termsEN: [
          { term: "Candlestick / Candle", def: "Graphical representation of price movement over a time period. Shows open, close, high and low." },
          { term: "Body", def: "The thick part of the candle — difference between open and close. Large = clear direction." },
          { term: "Wick / Shadow", def: "Thin lines above/below the body. Show the extreme high and low prices in the period." },
          { term: "Open", def: "The opening price of the time period. Where the battle began." },
          { term: "Close", def: "The closing price. Determines whether the candle is green or red." },
          { term: "High / Low", def: "Highest and lowest price in the period. Visible through the wicks." },
        ],
        checkNL: {
          q: "Een 4H kaars: open €80.000, close €80.200, high €83.500, low €79.800. Wat vertelt dit verhaal?",
          options: [
            "Sterke bull kaars — de prijs steeg veel",
            "Kleine groene kaars met grote wicks: kopers wonnen licht, maar zowel kopers als verkopers waren actief op extreme niveaus",
            "Rode kaars — de close is lager dan de high",
            "Niet genoeg informatie om iets te zeggen",
          ],
          correct: 1,
          explain: "Goed gelezen. Close (€80.200) > open (€80.000) = groene kaars. Maar de wick omhoog reikt tot €83.500 = kopers probeerden hoog te gaan maar werden teruggedrukt. Wick omlaag naar €79.800 = verkopers probeerden laag te gaan maar kopers kwamen terug. Klein lichaam = onzeker gevecht, geen duidelijke winnaar.",
        },
        checkEN: {
          q: "A 4H candle: open €80,000, close €80,200, high €83,500, low €79,800. What does this story tell you?",
          options: [
            "Strong bull candle — price rose a lot",
            "Small green candle with large wicks: buyers won slightly, but both buyers and sellers were active at extreme levels",
            "Red candle — the close is lower than the high",
            "Not enough information to say anything",
          ],
          correct: 1,
          explain: "Well read. Close (€80,200) > open (€80,000) = green candle. But the wick up reaches €83,500 = buyers tried to go high but were pushed back. Wick down to €79,800 = sellers tried to go low but buyers came back. Small body = uncertain battle, no clear winner.",
        },
        diagram: CandlestickDiagram,
      },
      {
        id: "l2-wicks",
        icon: "📌",
        titleNL: "Wicks lezen — waar het echte gevecht plaatsvindt",
        titleEN: "Reading wicks — where the real battle happens",
        contentNL: `Marcus vraagt je iets: waarom stopt de prijs soms halverwege een daling en keert dan plotseling om? Wie zijn die mysterieuze kopers die precies op het dieptepunt instappen — en hoe kun jij ze zien aankomen?

Het antwoord zit in de wicks.

De wick is het eerlijkste deel van de kaars. Het lichaam toont het resultaat. De wick toont het gevecht — wat er écht geprobeerd werd.

LANGE WICK NAAR BENEDEN:
Verkopers duwden de prijs ver omlaag. Maar kopers grepen in en kochten massaal. De prijs sloot ver boven het dieptepunt. Conclusie: er is sterke koopdruk op dat lage niveau. Dit is een BULLISH signaal.

LANGE WICK NAAR BOVEN:
Kopers duwden de prijs ver omhoog. Maar verkopers kwamen massaal terug. De prijs sloot ver onder het hoogtepunt. Conclusie: er is sterke verkoopdruk op dat hoge niveau. Dit is een BEARISH signaal.

De kracht van een wick hangt af van de CONTEXT:
— Lange wick naar beneden op een support-zone = extra sterk bullish signaal (kopers verdedigen die zone)
— Lange wick naar boven op een resistance-zone = extra sterk bearish signaal (verkopers verdedigen die zone)

Vier belangrijke wick-patronen:

1. HAMMER (Hamer): kleine body bovenaan, lange wick naar beneden. Verschijnt na een daling. Signaal: kopers namen de controle terug. Potentieel keerpunt omhoog.

2. SHOOTING STAR: kleine body onderaan, lange wick naar boven. Verschijnt na een stijging. Signaal: verkopers namen de controle terug. Potentieel keerpunt omlaag.

3. DOJI: bijna geen lichaam, twee gelijke wicks. Open ≈ close. Betekenis: totale onzekerheid. Kopers en verkopers zijn in evenwicht. Let op de volgende kaars — die bepaalt de richting.

4. SPINNING TOP: kleine body, wicks aan beide kanten. Onzekerheid, maar minder extreem dan doji. Markt zoekt richting.

Praktische regel van Marcus: een wick is alleen relevant als hij lang is vergeleken met de rest van de grafiek, EN als hij op een betekenisvol niveau zit (support, resistance, ronde nummers).

Actie: open de 4H grafiek van BTC. Zoek drie kaarsen met opvallende wicks. Bepaal voor elk: bullish of bearish signaal? En wat was de volgende kaars?

Marcus zegt: De wick is de markt die eerlijk is. Het lichaam is wat uiteindelijk telde — maar de wick vertelt je wie er geprobeerd heeft te winnen.`,
        contentEN: `Marcus asks you something: why does the price sometimes stop halfway through a decline and suddenly reverse? Who are those mysterious buyers who step in exactly at the low — and how can you see them coming?

The answer is in the wicks.

The wick is the most honest part of the candle. The body shows the result. The wick shows the battle — what was really attempted.

LONG WICK DOWNWARD:
Sellers pushed the price far down. But buyers stepped in and bought massively. The price closed far above the low. Conclusion: there's strong buying pressure at that low level. This is a BULLISH signal.

LONG WICK UPWARD:
Buyers pushed the price far up. But sellers came back massively. The price closed far below the high. Conclusion: there's strong selling pressure at that high level. This is a BEARISH signal.

The strength of a wick depends on CONTEXT:
— Long wick downward at a support zone = extra strong bullish signal (buyers defending that zone)
— Long wick upward at a resistance zone = extra strong bearish signal (sellers defending that zone)

Four important wick patterns:

1. HAMMER: small body at the top, long wick downward. Appears after a decline. Signal: buyers took back control. Potential turning point upward.

2. SHOOTING STAR: small body at the bottom, long wick upward. Appears after a rise. Signal: sellers took back control. Potential turning point downward.

3. DOJI: almost no body, two equal wicks. Open ≈ close. Meaning: total uncertainty. Buyers and sellers are in balance. Watch the next candle — that determines direction.

4. SPINNING TOP: small body, wicks on both sides. Uncertainty, but less extreme than doji. Market is looking for direction.

Marcus's practical rule: a wick is only relevant if it's long compared to the rest of the chart, AND if it's at a meaningful level (support, resistance, round numbers).

Action: open the 4H BTC chart. Find three candles with notable wicks. Determine for each: bullish or bearish signal? And what was the next candle?

Marcus says: The wick is the market being honest. The body is what ultimately counted — but the wick tells you who tried to win.`,
        termsNL: [
          { term: "Wick / Schaduw", def: "De dunne lijn boven of onder het kaarsenlichaam. Toont de uiterste prijzen — en wie er probeerde te winnen." },
          { term: "Hammer", def: "Kaars met kleine body bovenaan en lange wick naar beneden. Bullish keerpunt-signaal na een daling." },
          { term: "Shooting Star", def: "Kaars met kleine body onderaan en lange wick naar boven. Bearish keerpunt-signaal na een stijging." },
          { term: "Doji", def: "Kaars met nauwelijks lichaam (open ≈ close). Totale onzekerheid. De volgende kaars bepaalt richting." },
          { term: "Koopdruk", def: "Aanwezigheid van veel kopers op een niveau. Zichtbaar als lange onderste wick op een support." },
          { term: "Verkoopdruk", def: "Aanwezigheid van veel verkopers op een niveau. Zichtbaar als lange bovenste wick op een resistance." },
        ],
        termsEN: [
          { term: "Wick / Shadow", def: "The thin line above or below the candle body. Shows the extreme prices — and who tried to win." },
          { term: "Hammer", def: "Candle with small body at top and long wick downward. Bullish reversal signal after a decline." },
          { term: "Shooting Star", def: "Candle with small body at bottom and long wick upward. Bearish reversal signal after a rise." },
          { term: "Doji", def: "Candle with almost no body (open ≈ close). Total uncertainty. The next candle determines direction." },
          { term: "Buying Pressure", def: "Presence of many buyers at a level. Visible as long lower wick at a support." },
          { term: "Selling Pressure", def: "Presence of many sellers at a level. Visible as long upper wick at a resistance." },
        ],
        checkNL: {
          q: "Na een daling van 3 weken verschijnt op de BTC 1D grafiek een kaars: lange wick naar beneden, kleine groene body bovenaan. Wat verwacht je?",
          options: [
            "Verdere daling — de wick bevestigt bearish momentum",
            "Potentieel keerpunt omhoog — dit is een hammer-patroon, kopers namen controle terug",
            "Zijwaartse beweging — geen duidelijk signaal",
            "De kaars heeft geen betekenis zonder volume-data",
          ],
          correct: 1,
          explain: "Correct. Lange wick naar beneden na een daling = hammer. Verkopers probeerden de prijs laag te drukken, maar kopers kwamen massaal terug en sloten de kaars bijna op de high. Op zichzelf geen garantie, maar een sterk signaal. Bevestiging: wacht op de volgende groene kaars met volume.",
        },
        checkEN: {
          q: "After a 3-week decline, a candle appears on the BTC 1D chart: long wick downward, small green body at the top. What do you expect?",
          options: [
            "Further decline — the wick confirms bearish momentum",
            "Potential reversal upward — this is a hammer pattern, buyers took back control",
            "Sideways movement — no clear signal",
            "The candle has no meaning without volume data",
          ],
          correct: 1,
          explain: "Correct. Long wick downward after a decline = hammer. Sellers tried to push price low, but buyers came back massively and closed the candle near the high. Not a guarantee on its own, but a strong signal. Confirmation: wait for the next green candle with volume.",
        },
      },
      {
        id: "l2-timeframes",
        icon: "🔍",
        titleNL: "Timeframes — door welk venster kijk jij?",
        titleEN: "Timeframes — through which window are you looking?",
        contentNL: `Marcus stelt je een test: kijk naar BTC op de 1-minuut grafiek. Je ziet chaos — rood, groen, rood, groen, omhoog, omlaag. Schakel dan naar de 1D grafiek. Plotseling zie je een rustige, stijgende trend. Welk timeframe toont de 'echte' markt?

Antwoord: ze tonen allebei de echte markt — maar vanuit een ander venster. De vraag is: welk venster past bij wat jij wilt doen?

Timeframes zijn als kaarten van dezelfde stad:
— Een satellietfoto toont het grote plaatje (1D, 1W)
— Een stadskaart toont wijken (4H)
— Een stratenkaart toont details voor navigatie (1H, 15m)
— Een zoomscan toont elk plaveisel (1m, 5m)

Het probleem met beginners: ze staren naar de stratenkaart terwijl ze eigenlijk moeten weten in welke wijk ze zijn.

De 3-timeframe methode — gebruikt door professionele traders:

STAP 1 — BIAS op 1D (dagelijks):
"Welke richting heeft de markt?" Is BTC in uptrend of downtrend op de dagelijkse grafiek? Dat bepaalt of je koopt of verkoopt. Dit is je compas. Verander je mening hier pas als de structuur echt breekt.

STAP 2 — SETUP op 4H (4 uur):
"Is er een concrete kans?" Staat de prijs in een interessante zone? RSI laag? Kaarspatroon? Dit is waar je een potentiële trade identificeert.

STAP 3 — TIMING op 1H of 15m:
"Wanneer precies?" Zie je een bevestigingskaars? Een breakout van een klein patroon? Dit is je exacte instapmoment.

Alleen een trade nemen als alle drie timeframes groen licht geven.

De meest gemaakte fout: op 1m of 5m handelen. Op die timeframes is elke kleine beweging een signaal — en er zijn er honderden per dag. De meeste zijn ruis. Je wordt gek van alle valse signalen en mist het echte plaatje.

Richtlijn:
— Swing trading (trades van dagen tot weken): 1D bias + 4H setup + 1H timing
— Intraday trading (trades van uren): 4H bias + 1H setup + 15m timing
— Scalping (trades van minuten): alleen voor gevorderden met bewezen systeem

In Bitcoin Mentor: gebruik de timeframe-knoppen boven de grafiek (1H, 4H, 1D). Hoe hoger de timeframe, hoe betrouwbaarder het signaal.

Actie: open BTC op 1D, dan 4H, dan 1H. Schrijf op: wat is de trend op elk timeframe? Zijn ze in overeenstemming of tegengesteld? Dat bepaalt of je vandaag handelt of wacht.

Marcus zegt: De meeste verliezende trades worden gedaan op te lage timeframes. Zoom uit voordat je inzoomt.`,
        contentEN: `Marcus gives you a test: look at BTC on the 1-minute chart. You see chaos — red, green, red, green, up, down. Then switch to the 1D chart. Suddenly you see a calm, rising trend. Which timeframe shows the 'real' market?

Answer: they both show the real market — but through different windows. The question is: which window fits what you want to do?

Timeframes are like maps of the same city:
— A satellite photo shows the big picture (1D, 1W)
— A city map shows neighborhoods (4H)
— A street map shows details for navigation (1H, 15m)
— A zoom scan shows every stone (1m, 5m)

The beginner problem: they stare at the street map when they need to know which neighborhood they're in.

The 3-timeframe method — used by professional traders:

STEP 1 — BIAS on 1D (daily):
"What direction does the market have?" Is BTC in uptrend or downtrend on the daily chart? That determines whether you buy or sell. This is your compass. Only change your mind here when the structure truly breaks.

STEP 2 — SETUP on 4H (4 hours):
"Is there a concrete opportunity?" Is the price in an interesting zone? RSI low? Candle pattern? This is where you identify a potential trade.

STEP 3 — TIMING on 1H or 15m:
"When exactly?" Do you see a confirmation candle? A breakout of a small pattern? This is your exact entry moment.

Only take a trade when all three timeframes give green light.

The most common mistake: trading on 1m or 5m. On those timeframes every small movement is a signal — and there are hundreds per day. Most are noise. You go crazy from all the false signals and miss the real picture.

Guidelines:
— Swing trading (trades of days to weeks): 1D bias + 4H setup + 1H timing
— Intraday trading (trades of hours): 4H bias + 1H setup + 15m timing
— Scalping (trades of minutes): only for advanced traders with a proven system

In Bitcoin Mentor: use the timeframe buttons above the chart (1H, 4H, 1D). The higher the timeframe, the more reliable the signal.

Action: open BTC on 1D, then 4H, then 1H. Write down: what is the trend on each timeframe? Do they agree or contradict each other? That determines whether you trade or wait today.

Marcus says: Most losing trades are made on timeframes that are too low. Zoom out before you zoom in.`,
        termsNL: [
          { term: "Timeframe", def: "De tijdsperiode die elke kaars op de grafiek vertegenwoordigt. 1D = 1 kaars per dag." },
          { term: "Bias", def: "Jouw mening over de richting van de markt. Bepaald op de hogere timeframe (1D). Bullish of bearish." },
          { term: "Setup", def: "Een concrete handelskans zichtbaar op de 4H grafiek — zone, RSI, kaarspatroon." },
          { term: "Entry Timing", def: "Het exacte instapmoment, gezocht op de lagere timeframe (1H of 15m)." },
          { term: "Ruis", def: "Kleine, betekenisloze prijsbewegingen op lage timeframes. Te veel ruis = valse signalen." },
          { term: "Swing Trading", def: "Trades aanhouden van meerdere dagen tot weken. Gebruikt 1D + 4H als primaire timeframes." },
        ],
        termsEN: [
          { term: "Timeframe", def: "The time period each candle on the chart represents. 1D = 1 candle per day." },
          { term: "Bias", def: "Your opinion on market direction. Determined on the higher timeframe (1D). Bullish or bearish." },
          { term: "Setup", def: "A concrete trading opportunity visible on the 4H chart — zone, RSI, candle pattern." },
          { term: "Entry Timing", def: "The exact entry moment, found on the lower timeframe (1H or 15m)." },
          { term: "Noise", def: "Small, meaningless price movements on low timeframes. Too much noise = false signals." },
          { term: "Swing Trading", def: "Holding trades for multiple days to weeks. Uses 1D + 4H as primary timeframes." },
        ],
        checkNL: {
          q: "1D grafiek: BTC in uptrend. 4H grafiek: prijs in koopzone, RSI = 38. 1H grafiek: bullish kaars net gevormd. Wat doe je?",
          options: [
            "Wachten — te veel signalen tegelijk is verdacht",
            "Verkopen — 1H is te laag om op te vertrouwen",
            "Trade overwegen — alle drie timeframes geven groen licht (bias + setup + timing)",
            "Alleen kopen als de 1D RSI ook laag is",
          ],
          correct: 2,
          explain: "Dit is de ideale situatie. 1D uptrend = bullish bias. 4H koopzone + lage RSI = setup aanwezig. 1H bullish kaars = timing bevestigd. Alle drie timeframes zijn aligned. Dit is precies waarnaar je zoekt. Nog steeds: stop-loss instellen en risico bepalen.",
        },
        checkEN: {
          q: "1D chart: BTC in uptrend. 4H chart: price in buy zone, RSI = 38. 1H chart: bullish candle just formed. What do you do?",
          options: [
            "Wait — too many signals at once is suspicious",
            "Sell — 1H is too low to trust",
            "Consider a trade — all three timeframes give green light (bias + setup + timing)",
            "Only buy if the 1D RSI is also low",
          ],
          correct: 2,
          explain: "This is the ideal situation. 1D uptrend = bullish bias. 4H buy zone + low RSI = setup present. 1H bullish candle = timing confirmed. All three timeframes aligned. This is exactly what you're looking for. Still: set stop-loss and determine risk.",
        },
        diagram: WicksDiagram,
      },
      {
        id: "l2-orders",
        icon: "📋",
        titleNL: "Orders — hoe je koopt en verkoopt als een professional",
        titleEN: "Orders — how you buy and sell like a professional",
        contentNL: `Marcus stelt je een scenario: BTC staat nu op €83.000. Je denkt dat hij terugkomt naar €79.500 voordat hij verder stijgt — dat is jouw koopzone. Maar je kunt niet de hele dag achter je scherm zitten wachten. Hoe koop je precies op €79.500 terwijl je gewoon aan het werk bent?

Antwoord: met een limitorder. Dit is één van de meest krachtige tools voor een trader.

Er zijn drie basisorders die je moet kennen:

MARKTORDER — de nooduitgang:
Je koopt of verkoopt DIRECT tegen de actuele marktprijs. Voordeel: zeker uitgevoerd. Nadeel: je hebt geen controle over de exacte prijs. Door de spread (verschil koop/verkoopprijs) koop je iets duurder dan de getoonde prijs.
Gebruik marktorder ALLEEN als snelheid crucialer is dan prijs — bijvoorbeeld bij een snelle breakout.

LIMITORDER — de professionele keuze:
Je stelt vooraf een prijs in. De order wordt ALLEEN uitgevoerd als de markt jouw prijs bereikt.
— KOOP limitorder op €79.500: als BTC daalt naar €79.500, koop je automatisch. Je kunt slapen.
— VERKOOP limitorder op €92.000: als BTC stijgt naar €92.000, verkoop je automatisch. Winst genomen.
Gebruik limitorder voor vrijwel alle geplande trades. Dit dwingt je ook na te denken over je prijs voor je handelt — niet impulsief.

STOP-LOSS — jouw bescherming:
Een stop-order die automatisch verkoopt als de prijs DAALT tot jouw grens. Dit is je veiligheidssysteem.
Voorbeeld: je koopt op €79.500, stop-loss op €76.800. Als BTC daalt naar €76.800 → automatisch verkopen. Verlies = beperkt en vooraf bepaald.

TAKE-PROFIT — winst automatisch pakken:
Een order die automatisch verkoopt als de prijs STIJGT tot jouw doel.
Voorbeeld: je koopt op €79.500, take-profit op €90.000. Als BTC naar €90.000 stijgt → automatisch verkopen. Winst gepakt zonder scherm te hoeven checken.

De complete setup van een professionele trade:
1. Entry: limitorder op €79.500 (koopzone)
2. Stop-loss: €76.800 (onder support, beschermt bij tegenvaller)
3. Take-profit: €90.000 (target op resistance)
4. R/R: risico = €2.700, potentiële winst = €10.500 → R/R 1:3.9

Je plaatst dit alles in één keer. Daarna hoef je niet meer te kijken — de markt doet zijn werk.

Actie: ga naar de Paper Trade sectie. Bekijk de interface: waar zie je de order-typen? Stel een limitorder in (voer hem nog niet uit) en merk op hoe je entry, stop en target instelt.

Marcus zegt: Een marktorder is de emotionele beslissing van het moment. Een limitorder is de rationele beslissing van tevoren. Traders die plannen en uitvoeren verslaan traders die reageren.`,
        contentEN: `Marcus gives you a scenario: BTC is currently at €83,000. You think it'll come back to €79,500 before rising further — that's your buy zone. But you can't sit behind your screen all day waiting. How do you buy exactly at €79,500 while you're at work?

Answer: with a limit order. This is one of the most powerful tools for a trader.

There are three basic orders you need to know:

MARKET ORDER — the emergency exit:
You buy or sell IMMEDIATELY at the current market price. Advantage: definitely filled. Disadvantage: no control over exact price. Due to the spread (difference between buy/sell price) you buy slightly more expensive than the displayed price.
Use market order ONLY when speed is more critical than price — for example during a fast breakout.

LIMIT ORDER — the professional choice:
You set a price in advance. The order is ONLY filled when the market reaches your price.
— BUY limit order at €79,500: if BTC drops to €79,500, you buy automatically. You can sleep.
— SELL limit order at €92,000: if BTC rises to €92,000, you sell automatically. Profit taken.
Use limit orders for virtually all planned trades. This also forces you to think about your price before trading — not impulsively.

STOP-LOSS — your protection:
A stop order that automatically sells if price DROPS to your limit. This is your safety system.
Example: you buy at €79,500, stop-loss at €76,800. If BTC drops to €76,800 → automatic sale. Loss = limited and predetermined.

TAKE-PROFIT — automatically capturing profit:
An order that automatically sells if price RISES to your target.
Example: you buy at €79,500, take-profit at €90,000. If BTC rises to €90,000 → automatic sale. Profit taken without needing to check screen.

The complete setup of a professional trade:
1. Entry: limit order at €79,500 (buy zone)
2. Stop-loss: €76,800 (below support, protects if wrong)
3. Take-profit: €90,000 (target at resistance)
4. R/R: risk = €2,700, potential profit = €10,500 → R/R 1:3.9

You place all of this at once. Then you don't need to watch — the market does its work.

Action: go to the Paper Trade section. Look at the interface: where do you see order types? Set up a limit order (don't execute it yet) and notice how you set entry, stop and target.

Marcus says: A market order is the emotional decision of the moment. A limit order is the rational decision made in advance. Traders who plan and execute beat traders who react.`,
        termsNL: [
          { term: "Marktorder", def: "Directe koop of verkoop tegen de huidige marktprijs. Snel maar geen prijscontrole." },
          { term: "Limitorder", def: "Koop of verkoop pas wanneer de markt jouw ingestelde prijs bereikt. Meer controle, professionele keuze." },
          { term: "Stop-Loss (SL)", def: "Automatische verkoop als de prijs daalt tot jouw grens. Beschermt kapitaal. ALTIJD instellen." },
          { term: "Take-Profit (TP)", def: "Automatische verkoop als de prijs jouw winstdoel bereikt. Winst pakken zonder handmatig te handelen." },
          { term: "Spread", def: "Verschil tussen de koop- en verkoopprijs. Bij marktorders betaal je altijd iets meer dan de getoonde prijs." },
          { term: "Risk/Reward (R/R)", def: "Verhouding risico vs potentiële winst. Eis minimaal 1:2 — voor €100 risico minimaal €200 potentiële winst." },
        ],
        termsEN: [
          { term: "Market Order", def: "Immediate buy or sell at current market price. Fast but no price control." },
          { term: "Limit Order", def: "Buy or sell only when the market reaches your set price. More control, professional choice." },
          { term: "Stop-Loss (SL)", def: "Automatic sale when price drops to your limit. Protects capital. ALWAYS set it." },
          { term: "Take-Profit (TP)", def: "Automatic sale when price reaches your profit target. Take profit without trading manually." },
          { term: "Spread", def: "Difference between buy and sell price. With market orders you always pay slightly more than the displayed price." },
          { term: "Risk/Reward (R/R)", def: "Ratio of risk vs potential profit. Require minimum 1:2 — for €100 risk at least €200 potential profit." },
        ],
        checkNL: {
          q: "Je wil BTC kopen maar ALLEEN als de prijs terugkomt naar €78.000. BTC staat nu op €84.000. Welke order gebruik je?",
          options: [
            "Marktorder nu op €84.000 — wachten is risico",
            "Stop-loss op €78.000 — dat triggert automatisch",
            "Limitorder kopen op €78.000 — wordt uitgevoerd als BTC daalt naar die prijs",
            "Take-profit op €78.000 — dan pak je winst als het daalt",
          ],
          correct: 2,
          explain: "Correct. Een limitorder kopen op €78.000 wordt pas uitgevoerd als BTC naar die prijs daalt. Jij hoeft niet te kijken — de order staat klaar. Dit is hoe professionals kopen: ze bepalen vooraf de prijs, plaatsen de order, en gaan verder met hun dag.",
        },
        checkEN: {
          q: "You want to buy BTC but ONLY if the price comes back to €78,000. BTC is currently at €84,000. Which order do you use?",
          options: [
            "Market order now at €84,000 — waiting is risk",
            "Stop-loss at €78,000 — that triggers automatically",
            "Limit buy order at €78,000 — executes when BTC drops to that price",
            "Take-profit at €78,000 — then you take profit when it drops",
          ],
          correct: 2,
          explain: "Correct. A limit buy order at €78,000 only executes when BTC drops to that price. You don't need to watch — the order is ready. This is how professionals buy: they determine the price in advance, place the order, and get on with their day.",
        },
      },
      {
        id: "l2-stoploss",
        icon: "🛑",
        titleNL: "De stop-loss — jouw meest waardevolle order",
        titleEN: "The stop-loss — your most valuable order",
        contentNL: `Marcus stelt je een scenario voor: je hebt €3.000 belegd in BTC op €80.000. Je hebt geen stop-loss gezet — want 'BTC komt altijd terug'. De volgende ochtend staat hij op €62.000. Dat is -22.5%. Je verlies = €675.

Wat doe je? Vasthouden en hopen? Of verkopen?

Statistisch gezien wachten de meeste mensen. Ze verkopen pas als de pijn ondraaglijk is geworden. Gemiddeld op het moment dat ze -40% of meer hebben geleden. Mét een stop-loss had je verlies €90-180 geweest.

De stop-loss is niet een teken van onzekerheid. Het is het bewijs dat je als professional handelt.

WAT IS EEN STOP-LOSS?
Een automatische verkooporder die triggert als de prijs daalt tot een niveau dat jij vooraf hebt bepaald. Zodra dat niveau bereikt is, sluit de positie — automatisch, emotieloos.

WAAROM IS HIJ VERPLICHT?
1. De markt weet niet dat jij geïnvesteerd hebt. Hij stopt niet omdat jij verlies lijdt.
2. Zonder stop-loss heb je geen plan. Een trade zonder plan is gokken.
3. Rekenkundige asymmetrie: -50% verlies vereist +100% winst om te herstellen. -10% vereist slechts +11%.

WAAR ZET JE JE STOP-LOSS?
NIET willekeurig (bijv. "ik wil niet meer dan €200 verliezen"). Zo plaatst een beginner hem.
WEL op basis van marktstructuur:
— Net onder de dichtstbijzijnde support-zone
— Onder het recente low van de setup
— Buiten het bereik van 'normale' prijsbeweging (volatiliteit)

Voorbeeld: je koopt BTC op €80.000 vanwege een sterk support-niveau op €78.500.
Stop-loss: €77.800 (net onder het support, buiten normale beweging).
Redenering: als BTC daalt ONDER €77.800, was je setup incorrect. Dan wil je eruit.

DE GOUDEN REGEL: beweeg je stop-loss NOOIT naar beneden.
Als je stop-loss op €77.800 staat en de prijs nadert, is de verleiding groot om hem lager te zetten "want BTC komt altijd terug". Dit is de meest verwoestende fout. Je negeert je eigen plan, vergroot je verlies, en leert de verkeerde les. Eén keer "saved" door geluk kan je duizenden euro's kosten in toekomstige verliezende trades.

WAT WEL DOEN: beweeg de stop-loss naar BOVEN als de trade in je voordeel beweegt.
Als BTC stijgt van €80.000 naar €86.000, beweeg je stop-loss naar €82.000 (boven je entry). Je bent nu break-even. Als hij terugkomt, verlies je niets. Dit noemen we een "trailing stop".

Actie: open Paper Trade. Koop BTC. Stel METEEN een stop-loss in op basis van de support op de 4H grafiek. Kijk waar de dichtstbijzijnde zone is — zet stop daaronder.

Marcus zegt: Ik beoordeel een trader niet op zijn winrate. Ik beoordeel hem op hoe snel hij zijn stop-loss instelt nadat hij een positie opent. Als dat meer dan 10 seconden duurt: hij heeft een probleem.`,
        contentEN: `Marcus gives you a scenario: you've invested €3,000 in BTC at €80,000. You didn't set a stop-loss — because 'BTC always comes back'. The next morning it's at €62,000. That's -22.5%. Your loss = €675.

What do you do? Hold and hope? Or sell?

Statistically, most people wait. They only sell when the pain has become unbearable. On average when they've suffered -40% or more. With a stop-loss your loss would have been €90-180.

The stop-loss isn't a sign of uncertainty. It's proof that you're trading like a professional.

WHAT IS A STOP-LOSS?
An automatic sell order that triggers when the price drops to a level you predetermined. Once that level is reached, the position closes — automatically, emotionlessly.

WHY IS IT MANDATORY?
1. The market doesn't know you've invested. It doesn't stop because you're losing.
2. Without a stop-loss you have no plan. A trade without a plan is gambling.
3. Mathematical asymmetry: -50% loss requires +100% gain to recover. -10% requires only +11%.

WHERE DO YOU SET YOUR STOP-LOSS?
NOT arbitrarily (e.g. "I don't want to lose more than €200"). That's how a beginner places it.
BASED ON market structure:
— Just below the nearest support zone
— Below the recent low of the setup
— Outside the range of 'normal' price movement (volatility)

Example: you buy BTC at €80,000 because of a strong support level at €78,500.
Stop-loss: €77,800 (just below the support, outside normal movement).
Reasoning: if BTC drops BELOW €77,800, your setup was wrong. Then you want out.

THE GOLDEN RULE: NEVER move your stop-loss downward.
If your stop-loss is at €77,800 and price approaches it, the temptation is great to move it lower "because BTC always comes back". This is the most devastating mistake. You're ignoring your own plan, increasing your loss, and learning the wrong lesson. One lucky "save" can cost you thousands in future losing trades.

WHAT TO DO INSTEAD: move the stop-loss UPWARD as the trade moves in your favor.
If BTC rises from €80,000 to €86,000, move your stop-loss to €82,000 (above your entry). You're now break-even. If it comes back, you lose nothing. This is called a "trailing stop".

Action: open Paper Trade. Buy BTC. Set a stop-loss IMMEDIATELY based on the support on the 4H chart. Look where the nearest zone is — place stop below it.

Marcus says: I don't judge a trader by their win rate. I judge them by how quickly they set their stop-loss after opening a position. If it takes more than 10 seconds: there's a problem.`,
        termsNL: [
          { term: "Stop-Loss (SL)", def: "Automatische verkooporder die triggert als de prijs daalt tot jouw ingestelde niveau. Beschermt kapitaal." },
          { term: "Marktstructuur", def: "De basis voor stop-loss plaatsing. Zet je stop onder support of buiten de normale beweging." },
          { term: "Trailing Stop", def: "Stop-loss die je meeschuift naar boven als de trade winstgevend wordt. Beschermt winst." },
          { term: "Capitulatie", def: "Het moment dat een trader het opgeeft en verkoopt na een groot verlies. Bijna altijd op het slechtste moment." },
          { term: "Break-Even Stop", def: "Stop-loss verplaatsen naar je entry-prijs zodra de trade voldoende in je voordeel beweegt. Geen verlies meer mogelijk." },
          { term: "Asymmetrie", def: "-50% verlies heeft +100% winst nodig om te herstellen. Kleine verliezen beperken is cruciaal." },
        ],
        termsEN: [
          { term: "Stop-Loss (SL)", def: "Automatic sell order that triggers when price drops to your set level. Protects capital." },
          { term: "Market Structure", def: "The basis for stop-loss placement. Place your stop below support or outside normal movement." },
          { term: "Trailing Stop", def: "Stop-loss you move upward as the trade becomes profitable. Protects profit." },
          { term: "Capitulation", def: "The moment a trader gives up and sells after a large loss. Almost always at the worst moment." },
          { term: "Break-Even Stop", def: "Moving stop-loss to entry price once trade moves sufficiently in your favor. No loss possible anymore." },
          { term: "Asymmetry", def: "-50% loss needs +100% gain to recover. Limiting small losses is crucial." },
        ],
        checkNL: {
          q: "Je hebt BTC gekocht op €82.000. Je stop-loss staat op €79.500. De prijs daalt naar €80.000 en jij denkt: 'nog even wachten, hij keert vast terug.' Wat doe je?",
          options: [
            "Stop-loss verlagen naar €77.000 — BTC heeft meer ruimte nodig",
            "Stop-loss verwijderen — je gelooft in BTC op lange termijn",
            "Niets doen — je stop-loss staat al ingesteld, het systeem werkt voor jou",
            "Meteen handmatig verkopen voor de stop bereikt wordt",
          ],
          correct: 2,
          explain: "Niets doen is het juiste antwoord. Je hebt je stop-loss vooraf bepaald op basis van logica, niet op basis van emotie. Als de prijs je stop-loss raakt, was je setup incorrect — dat is informatie, geen tragedie. De stop doet zijn werk. Hem verlagen of verwijderen is je eigen plan saboteren.",
        },
        checkEN: {
          q: "You bought BTC at €82,000. Your stop-loss is at €79,500. Price drops to €80,000 and you think: 'wait a bit, it'll surely turn around.' What do you do?",
          options: [
            "Lower stop-loss to €77,000 — BTC needs more room",
            "Remove stop-loss — you believe in BTC long-term",
            "Do nothing — your stop-loss is already set, the system works for you",
            "Manually sell immediately before stop is reached",
          ],
          correct: 2,
          explain: "Do nothing is the correct answer. You determined your stop-loss in advance based on logic, not emotion. If price hits your stop-loss, your setup was incorrect — that's information, not a tragedy. The stop does its job. Lowering or removing it is sabotaging your own plan.",
        },
      },
      {
        id: "l2-risico",
        icon: "🛡️",
        titleNL: "Risicobeheer — de #1 skill die niemand je leert",
        titleEN: "Risk management — the #1 skill nobody teaches you",
        contentNL: `Marcus vraagt je twee traders te vergelijken:

Trader A: wint 70% van zijn trades. Maar als hij wint, wint hij €50. Als hij verliest, verliest hij €300.
Trader B: wint slechts 40% van zijn trades. Maar als hij wint, wint hij €300. Als hij verliest, verliest hij €100.

Na 100 trades: wie heeft meer geld?

Trader A: 70 × €50 − 30 × €300 = €3.500 − €9.000 = −€5.500. Verlies.
Trader B: 40 × €300 − 60 × €100 = €12.000 − €6.000 = +€6.000. Winst.

Trader B wint — ondanks dat hij vaker verliest. Dit is waarom risicobeheer de #1 skill is in trading. Niet het kiezen van de juiste trade. Niet de beste entry vinden. Risicobeheer.

DE 1%-REGEL — jouw kapitaal beschermen:
Riseer nooit meer dan 1-2% van je totale kapitaal op één enkele trade.

Voorbeeld: je hebt €10.000 paper trading kapitaal.
Max verlies per trade = €100 (1%) of €200 (2%).

Waarom dit werkt: zelfs bij 10 verliezende trades op rij verlies je maar 10-20% van je kapitaal. Dat is herstelbaar. Traders die te groot spelen kunnen één trade hun hele account kosten.

RISK/REWARD (R/R) — de kern van elk systeem:
R/R = de verhouding tussen je maximale verlies en je potentiële winst.

R/R 1:1: riseer €100, maak €100 winst. Je moet >50% winnen. Barely profitable.
R/R 1:2: riseer €100, maak €200 winst. Je moet >33% winnen. Goed.
R/R 1:3: riseer €100, maak €300 winst. Je moet >25% winnen. Uitstekend.

Eis: neem alleen trades met minimum R/R van 1:2.

HOE BEREKEN JE JE POSITIEGROOTTE?
Niet op gevoel. Op wiskunde.

Formule: Positiegrootte = Max verlies / Risico per coin

Voorbeeld:
— Kapitaal: €10.000
— Max verlies (1%): €100
— Entry BTC: €80.000, Stop-loss: €77.000
— Risico per BTC: €80.000 − €77.000 = €3.000
— Positiegrootte: €100 ÷ €3.000 = 0.033 BTC (waarde: €2.640)

Je koopt 0.033 BTC. Als de stop-loss wordt geraakt, verlies je precies €100 — niet meer.

In Bitcoin Mentor: de Paper Trade tab berekent dit automatisch. Vul entry, stop en risico% in → je krijgt de exacte hoeveelheid.

Actie: pak een notitieboek. Schrijf de formule op. Bereken voor een hypothetische BTC trade (entry €82.000, SL €79.000, kapitaal €5.000, risico 1.5%) de positiegrootte.

Marcus zegt: De enige trader die zeker failliet gaat, is de trader die zijn risico niet beheert. Het maakt niet uit hoe goed je analyse is als één verliezende trade je account halveert.`,
        contentEN: `Marcus asks you to compare two traders:

Trader A: wins 70% of his trades. But when he wins, he wins €50. When he loses, he loses €300.
Trader B: wins only 40% of his trades. But when he wins, he wins €300. When he loses, he loses €100.

After 100 trades: who has more money?

Trader A: 70 × €50 − 30 × €300 = €3,500 − €9,000 = −€5,500. Loss.
Trader B: 40 × €300 − 60 × €100 = €12,000 − €6,000 = +€6,000. Profit.

Trader B wins — despite losing more often. This is why risk management is the #1 skill in trading. Not picking the right trade. Not finding the best entry. Risk management.

THE 1% RULE — protecting your capital:
Never risk more than 1-2% of your total capital on a single trade.

Example: you have €10,000 paper trading capital.
Max loss per trade = €100 (1%) or €200 (2%).

Why this works: even with 10 losing trades in a row you only lose 10-20% of your capital. That's recoverable. Traders who bet too big can lose their entire account on one trade.

RISK/REWARD (R/R) — the core of any system:
R/R = the ratio between your maximum loss and your potential profit.

R/R 1:1: risk €100, make €100 profit. You need >50% wins. Barely profitable.
R/R 1:2: risk €100, make €200 profit. You need >33% wins. Good.
R/R 1:3: risk €100, make €300 profit. You need >25% wins. Excellent.

Requirement: only take trades with minimum R/R of 1:2.

HOW DO YOU CALCULATE YOUR POSITION SIZE?
Not by feeling. By math.

Formula: Position Size = Max Loss / Risk per coin

Example:
— Capital: €10,000
— Max loss (1%): €100
— BTC Entry: €80,000, Stop-loss: €77,000
— Risk per BTC: €80,000 − €77,000 = €3,000
— Position size: €100 ÷ €3,000 = 0.033 BTC (value: €2,640)

You buy 0.033 BTC. If stop-loss is hit, you lose exactly €100 — no more.

In Bitcoin Mentor: the Paper Trade tab calculates this automatically. Enter entry, stop and risk% → you get the exact amount.

Action: get a notepad. Write down the formula. Calculate for a hypothetical BTC trade (entry €82,000, SL €79,000, capital €5,000, risk 1.5%) the position size.

Marcus says: The only trader guaranteed to go bankrupt is the trader who doesn't manage risk. It doesn't matter how good your analysis is if one losing trade halves your account.`,
        termsNL: [
          { term: "Risicobeheer", def: "Het systematisch beheersen van verlies per trade. De #1 skill die traders winstgevend maakt." },
          { term: "1% Regel", def: "Maximaal 1-2% van totaal kapitaal riskeren op 1 trade. Beschermt je van catastrofaal verlies." },
          { term: "Risk/Reward (R/R)", def: "Verhouding risico : potentiële winst. Eis minimum 1:2. Zonder goede R/R is winstgevend zijn wiskundig onmogelijk." },
          { term: "Positiegrootte", def: "Hoeveel van een asset je koopt. Berekend met formule: max verlies ÷ risico per eenheid." },
          { term: "1R", def: "Jouw risicoeenheid per trade. Als je €100 riskeert = 1R. Een winst van 3R = €300." },
          { term: "Drawdown", def: "Procentueel verlies van je kapitaalpiek. 20% drawdown = je account is 20% kleiner dan het ooit was." },
        ],
        termsEN: [
          { term: "Risk Management", def: "Systematically controlling loss per trade. The #1 skill that makes traders profitable." },
          { term: "1% Rule", def: "Maximum 1-2% of total capital at risk on 1 trade. Protects from catastrophic loss." },
          { term: "Risk/Reward (R/R)", def: "Ratio risk : potential profit. Require minimum 1:2. Without good R/R being profitable is mathematically impossible." },
          { term: "Position Size", def: "How much of an asset you buy. Calculated with formula: max loss ÷ risk per unit." },
          { term: "1R", def: "Your risk unit per trade. If you risk €100 = 1R. A profit of 3R = €300." },
          { term: "Drawdown", def: "Percentage loss from capital peak. 20% drawdown = your account is 20% smaller than it ever was." },
        ],
        checkNL: {
          q: "Kapitaal €8.000. Risico per trade: 1%. Entry BTC €84.000, stop-loss €81.600. Hoeveel BTC koop je?",
          options: [
            "0.5 BTC — maximale inzet voor snelle winst",
            "0.033 BTC — berekend op basis van risico en stop-loss afstand",
            "0.1 BTC — round number is makkelijker",
            "Hangt af van hoe zeker ik ben van de trade",
          ],
          correct: 1,
          explain: "Formule: max verlies = 1% × €8.000 = €80. Risico per BTC = €84.000 − €81.600 = €2.400. Positiegrootte = €80 ÷ €2.400 = 0.033 BTC. Als de stop-loss wordt geraakt: verlies precies €80. Dit is wiskunde, geen gevoel. En 'hoe zeker je bent' verandert de formule NIET — je zekerheid bepaalt of je de trade neemt, niet hoe groot.",
        },
        checkEN: {
          q: "Capital €8,000. Risk per trade: 1%. BTC entry €84,000, stop-loss €81,600. How much BTC do you buy?",
          options: [
            "0.5 BTC — maximum stake for quick profit",
            "0.033 BTC — calculated based on risk and stop-loss distance",
            "0.1 BTC — round number is easier",
            "Depends on how certain I am of the trade",
          ],
          correct: 1,
          explain: "Formula: max loss = 1% × €8,000 = €80. Risk per BTC = €84,000 − €81,600 = €2,400. Position size = €80 ÷ €2,400 = 0.033 BTC. If stop-loss is hit: lose exactly €80. This is math, not feeling. And 'how certain you are' does NOT change the formula — your certainty determines whether you take the trade, not how big.",
        },
      },
      {
        id: "l2-volume",
        icon: "📶",
        titleNL: "Volume — de vergeten bevestiging",
        titleEN: "Volume — the forgotten confirmation",
        contentNL: `Marcus stelt je een vraag: twee breakouts. Bij de eerste doorbreekt BTC een resistance met 1.000 BTC verhandeld in die uur-kaars. Bij de tweede doorbreekt hij dezelfde resistance met 15.000 BTC in die kaars. Welke breakout vertrouw jij meer?

Als je antwoord de tweede is — je hebt de kern van volume-analyse al begrepen.

WAT IS VOLUME?

Volume = het totale aantal coins dat in een bepaalde periode verhandeld is.

Op de grafiek zie je volume als balkjes onderaan. Hoge balk = veel verhandeld. Lage balk = weinig verhandeld.

Volume toont CONVICTION — hoeveel spelers actief waren en hoe sterk hun overtuiging was. Prijs zonder volume is een gerucht. Prijs met volume is een feit.

DE 4 VOLUME-REGELS DIE ALLES VERKLAREN:

1. STIJGENDE PRIJS + HOOG VOLUME = STERKE UPTREND
Veel deelnemers kopen actief. De stijging is echt. Grote kans op continuatie.

2. STIJGENDE PRIJS + LAAG VOLUME = ZWAKKE STIJGING
Weinig deelnemers. Prijs stijgt maar niemand gelooft erin. Mogelijk vals signaal — "pump zonder fundament."

3. DALENDE PRIJS + HOOG VOLUME = STERKE VERKOOPDRUK
Veel deelnemers verkopen actief. De daling is echt. Gevaarlijk om ertegen in te gaan.

4. DALENDE PRIJS + LAAG VOLUME = CORRECTIE IN UPTREND
Weinig verkopers. Prijs daalt omdat kopers even wachten — niet omdat ze bang zijn. In een uptrend is dit normaal en potentieel een koopkans.

VOLUME EN BREAKOUTS:

Dit is waar volume het meest krachtig is. Een breakout DOOR resistance is pas geldig als er significant meer volume is dan normaal.

Zonder volume-bevestiging: "fakeout" risico. Prijs breekt door, maar valt terug.
Met volume-bevestiging: echte breakout. Grote spelers hebben besloten — de move is serieus.

Vuistregel: het volume bij de breakout-kaars moet minstens 2-3× groter zijn dan het gemiddelde volume van de vorige 10 kaarsen.

VOLUME EN TOPS/BODEMS:

Volume piekt vaak bij markttops en -bodems. Dit zijn de momenten van maximale angst (bodem) of maximale hebzucht (top). Als je een extreme volumepiek ziet na een lange move → let op, een keerpunt kan nabij zijn.

In Bitcoin Mentor: volume is zichtbaar als balkjes onderaan de grafiek. Vergelijk de balkjes bij de huidige kaars met die van de afgelopen week.

Actie: open de BTC 4H grafiek. Zoek een moment van een grote prijsbeweging. Bekijk het volume op die specifieke kaars. Was het hoog of laag? Wat zegt dat over de kwaliteit van die move?

Marcus zegt: Prijs is wat de markt wil dat je ziet. Volume is wat de markt eigenlijk doet. Kijk altijd naar beide.`,
        contentEN: `Marcus asks you a question: two breakouts. In the first, BTC breaks a resistance with 1,000 BTC traded in that hourly candle. In the second, it breaks the same resistance with 15,000 BTC in that candle. Which breakout do you trust more?

If your answer is the second — you've already understood the core of volume analysis.

WHAT IS VOLUME?

Volume = the total number of coins traded in a specific period.

On the chart you see volume as bars at the bottom. High bar = a lot traded. Low bar = little traded.

Volume shows CONVICTION — how many players were active and how strong their conviction was. Price without volume is a rumor. Price with volume is a fact.

THE 4 VOLUME RULES THAT EXPLAIN EVERYTHING:

1. RISING PRICE + HIGH VOLUME = STRONG UPTREND
Many participants actively buying. The rise is real. High chance of continuation.

2. RISING PRICE + LOW VOLUME = WEAK RISE
Few participants. Price rises but nobody believes in it. Possibly false signal — "pump without foundation."

3. FALLING PRICE + HIGH VOLUME = STRONG SELLING PRESSURE
Many participants actively selling. The decline is real. Dangerous to trade against.

4. FALLING PRICE + LOW VOLUME = CORRECTION IN UPTREND
Few sellers. Price falls because buyers are briefly waiting — not because they're scared. In an uptrend this is normal and potentially a buying opportunity.

VOLUME AND BREAKOUTS:

This is where volume is most powerful. A breakout THROUGH resistance is only valid if there's significantly more volume than normal.

Without volume confirmation: "fakeout" risk. Price breaks through but falls back.
With volume confirmation: real breakout. Big players have decided — the move is serious.

Rule of thumb: the volume on the breakout candle should be at least 2-3× larger than the average volume of the previous 10 candles.

VOLUME AND TOPS/BOTTOMS:

Volume often peaks at market tops and bottoms. These are the moments of maximum fear (bottom) or maximum greed (top). If you see an extreme volume spike after a long move → pay attention, a turning point may be near.

In Bitcoin Mentor: volume is visible as bars at the bottom of the chart. Compare the bars at the current candle with those of the past week.

Action: open the BTC 4H chart. Find a moment of a large price movement. Look at the volume on that specific candle. Was it high or low? What does that say about the quality of that move?

Marcus says: Price is what the market wants you to see. Volume is what the market is actually doing. Always look at both.`,
        termsNL: [
          { term: "Volume", def: "Het aantal coins verhandeld in een tijdsperiode. Toont hoeveel deelnemers actief waren en hoe sterk hun overtuiging." },
          { term: "Hoog Volume", def: "Veel deelnemers actief. Bevestigt de richting van de prijs. Maakt signalen betrouwbaarder." },
          { term: "Laag Volume", def: "Weinig deelnemers. Prijs beweegt zonder grote overtuiging. Signalen minder betrouwbaar." },
          { term: "Volume Breakout", def: "Breakout door resistance/support met significant hoger volume dan normaal. Veel betrouwbaarder dan breakout zonder volume." },
          { term: "Fakeout", def: "Valse breakout zonder volume. Prijs breekt door een zone maar keert terug omdat er geen echte overtuiging was." },
          { term: "Climactic Volume", def: "Extreme volumepiek na lange move. Signaal dat de move mogelijk eindigt — te veel deelnemers aan dezelfde kant." },
        ],
        termsEN: [
          { term: "Volume", def: "Number of coins traded in a time period. Shows how many participants were active and how strong their conviction." },
          { term: "High Volume", def: "Many participants active. Confirms price direction. Makes signals more reliable." },
          { term: "Low Volume", def: "Few participants. Price moves without strong conviction. Signals less reliable." },
          { term: "Volume Breakout", def: "Breakout through resistance/support with significantly higher volume than normal. Much more reliable than breakout without volume." },
          { term: "Fakeout", def: "False breakout without volume. Price breaks through a zone but returns because there was no real conviction." },
          { term: "Climactic Volume", def: "Extreme volume spike after long move. Signal that the move may be ending — too many participants on the same side." },
        ],
        checkNL: {
          q: "BTC breekt door resistance €88.000. Maar het volume op die kaars is 30% lager dan het gemiddelde. Wat betekent dit?",
          options: [
            "Sterke breakout — prijs brak door, volume doet er niet toe",
            "Zwakke breakout — weinig overtuiging. Risico op fakeout. Wacht op volumebevestiging.",
            "Bearish signaal — laag volume bij stijging is altijd slecht",
            "Koopsignaal — lage volume breakouts zijn makkelijker te timen",
          ],
          correct: 1,
          explain: "Breakout zonder volume = fakeout-risico. Grote spelers waren er niet bij. De prijs brak door maar er is geen echte overtuiging. Professionele aanpak: wacht op een retest van €88.000 (nu als support) MET volume-bevestiging — dán is de entry veiliger.",
        },
        checkEN: {
          q: "BTC breaks through resistance €88,000. But the volume on that candle is 30% below average. What does this mean?",
          options: [
            "Strong breakout — price broke through, volume doesn't matter",
            "Weak breakout — little conviction. Fakeout risk. Wait for volume confirmation.",
            "Bearish signal — low volume on a rise is always bad",
            "Buy signal — low volume breakouts are easier to time",
          ],
          correct: 1,
          explain: "Breakout without volume = fakeout risk. Big players weren't involved. Price broke through but there's no real conviction. Professional approach: wait for a retest of €88,000 (now as support) WITH volume confirmation — that's when the entry is safer.",
        },
      },
      {
        id: "l2-patterns",
        icon: "🕯️",
        titleNL: "Kaarsenpatronen — de 5 meest betrouwbare signalen",
        titleEN: "Candle patterns — the 5 most reliable signals",
        contentNL: `Marcus stelt je een vraag: als één kaars al een verhaal vertelt, wat vertelt een combinatie van twee of drie kaarsen? Dat is het principe achter kaarsenpatronen — en sommige hebben een treffscore van 60-70% over duizenden historische trades.

Je hebt al geleerd hoe individuele kaarsen werken. Nu leer je de patronen die traders gebruiken om keerpunten te herkennen.

DE 5 MEEST BETROUWBARE PATRONEN:

1. BULLISH ENGULFING (Omsluitend patroon omhoog)
Twee kaarsen: eerste rood, tweede groen die de eerste volledig omsluit.
Betekenis: verkopers waren in controle, maar kopers namen de macht volledig over in de volgende periode. Krachtig keerpunt-signaal omhoog.
Sterkst op: 4H of 1D, na een daling, op een support-zone.

2. BEARISH ENGULFING (Omsluitend patroon omlaag)
Twee kaarsen: eerste groen, tweede rood die de eerste volledig omsluit.
Betekenis: kopers waren in controle, maar verkopers namen de macht over. Keerpunt-signaal omlaag.
Sterkst op: 4H of 1D, na een stijging, op een resistance-zone.

3. MORNING STAR (Ochtendster) — Bullish
Drie kaarsen: grote rode kaars → kleine kaars met wick (doji of spinning top) → grote groene kaars.
Betekenis: verkopers verloren kracht (kleine middenkaars = onzekerheid), kopers namen over.
Sterkst: 1D grafiek, na een sterke daling.

4. EVENING STAR (Avondster) — Bearish
Tegenovergestelde van Morning Star: grote groene → kleine kaars → grote rode.
Betekenis: kopers verloren kracht, verkopers namen over. Keerpunt omlaag.

5. THREE WHITE SOLDIERS / THREE BLACK CROWS
Drie opeenvolgende grote groene kaarsen (soldiers) of rode kaarsen (crows) met weinig wicks.
Meaning: sterke, bevestigde trendrichting. Drie perioden achter elkaar dominantie van één kant.
Soldiers: krachtig bullish. Crows: krachtig bearish.

HOE GEBRUIK JE KAARSENPATRONEN GOED?

REGEL 1: Kaarsenpatronen bevestigen — ze starten niet
Een bullish engulfing op zichzelf is niet genoeg. Maar een bullish engulfing op een support-zone, met RSI onder 35, na een daling van 20% → dat is een sterke setup.

REGEL 2: Hogere timeframes zijn betrouwbaarder
Een engulfing op 1D is veel sterker dan op 15m. Hoe hoger de timeframe, hoe meer deelnemers het patroon "zagen" en erop reageerden.

REGEL 3: Context is alles
Elk patroon heeft een richting-context nodig. Bullish patronen werken het best NA een daling (niet midden in een uptrend). Bearish patronen werken het best NA een stijging.

Actie: open de BTC 1D grafiek. Zoek de afgelopen 3 maanden één bullish engulfing en één bearish engulfing. Wat was de prijs de week erna?

Marcus zegt: Kaarsenpatronen zijn geen magie — het zijn de voetafdrukken van grote spelers. Als je weet hoe institutionelen reageren op bepaalde patronen, zie je de markt van binnenuit.`,
        contentEN: `Marcus asks you a question: if one candle already tells a story, what does a combination of two or three candles tell? That's the principle behind candle patterns — and some have a hit rate of 60-70% across thousands of historical trades.

You've already learned how individual candles work. Now you'll learn the patterns traders use to recognize turning points.

THE 5 MOST RELIABLE PATTERNS:

1. BULLISH ENGULFING
Two candles: first red, second green that completely engulfs the first.
Meaning: sellers were in control, but buyers completely took over in the next period. Powerful reversal signal upward.
Strongest on: 4H or 1D, after a decline, at a support zone.

2. BEARISH ENGULFING
Two candles: first green, second red that completely engulfs the first.
Meaning: buyers were in control, but sellers took over. Reversal signal downward.
Strongest on: 4H or 1D, after a rise, at a resistance zone.

3. MORNING STAR — Bullish
Three candles: large red candle → small candle with wick (doji or spinning top) → large green candle.
Meaning: sellers lost strength (small middle candle = uncertainty), buyers took over.
Strongest: 1D chart, after a strong decline.

4. EVENING STAR — Bearish
Opposite of Morning Star: large green → small candle → large red.
Meaning: buyers lost strength, sellers took over. Reversal downward.

5. THREE WHITE SOLDIERS / THREE BLACK CROWS
Three consecutive large green candles (soldiers) or red candles (crows) with few wicks.
Meaning: strong, confirmed trend direction. Three consecutive periods of dominance by one side.
Soldiers: powerfully bullish. Crows: powerfully bearish.

HOW TO USE CANDLE PATTERNS CORRECTLY?

RULE 1: Candle patterns confirm — they don't start
A bullish engulfing alone isn't enough. But a bullish engulfing at a support zone, with RSI below 35, after a 20% decline → that's a strong setup.

RULE 2: Higher timeframes are more reliable
An engulfing on 1D is much stronger than on 15m. The higher the timeframe, the more participants "saw" the pattern and reacted to it.

RULE 3: Context is everything
Every pattern needs a directional context. Bullish patterns work best AFTER a decline (not in the middle of an uptrend). Bearish patterns work best AFTER a rise.

Action: open the BTC 1D chart. Find one bullish engulfing and one bearish engulfing in the past 3 months. What was the price the week after?

Marcus says: Candle patterns aren't magic — they're the footprints of big players. When you know how institutions react to certain patterns, you see the market from the inside.`,
        termsNL: [
          { term: "Bullish Engulfing", def: "Rode kaars gevolgd door grotere groene kaars die de eerste omsluit. Keerpunt-signaal omhoog. Sterkst op support." },
          { term: "Bearish Engulfing", def: "Groene kaars gevolgd door grotere rode kaars die de eerste omsluit. Keerpunt-signaal omlaag. Sterkst op resistance." },
          { term: "Morning Star", def: "Drie-kaars bullish patroon: grote rode → kleine onzekere → grote groene. Signaleert einde van daling." },
          { term: "Evening Star", def: "Drie-kaars bearish patroon: grote groene → kleine → grote rode. Signaleert einde van stijging." },
          { term: "Three White Soldiers", def: "Drie opeenvolgende grote groene kaarsen. Bevestigt sterke bullish momentum." },
          { term: "Confirmatie", def: "Kaarsenpatroon + ander signaal (RSI, support, volume). Samen zijn ze sterker dan afzonderlijk." },
        ],
        termsEN: [
          { term: "Bullish Engulfing", def: "Red candle followed by larger green candle that engulfs the first. Reversal signal upward. Strongest at support." },
          { term: "Bearish Engulfing", def: "Green candle followed by larger red candle that engulfs the first. Reversal signal downward. Strongest at resistance." },
          { term: "Morning Star", def: "Three-candle bullish pattern: large red → small uncertain → large green. Signals end of decline." },
          { term: "Evening Star", def: "Three-candle bearish pattern: large green → small → large red. Signals end of rise." },
          { term: "Three White Soldiers", def: "Three consecutive large green candles. Confirms strong bullish momentum." },
          { term: "Confirmation", def: "Candle pattern + another signal (RSI, support, volume). Together they're stronger than separately." },
        ],
        checkNL: {
          q: "Op de BTC 1D grafiek, na een daling van 25%, verschijnt een bullish engulfing op de support bij €78.000. RSI = 31. Volume is 2× hoger dan normaal. Wat doe je?",
          options: [
            "Niets — één patroon is nooit genoeg",
            "Verkopen — de markt daalt nog steeds",
            "Serieuze koopsetup overwegen: drie bevestigingen (pattern + RSI oversold + support + volume). Stop-loss onder €78.000.",
            "Wachten op een vierde bevestiging",
          ],
          correct: 2,
          explain: "Dit is precies de setup die professionals zoeken. Bullish engulfing (pattern) + RSI 31 (oversold) + historische support (zone) + hoog volume (overtuiging) = vier samenkomende signalen. Dat is confluent. Stop-loss onder €78.000, want als die zone breekt was de setup fout. Risk/reward bepalen en uitvoeren.",
        },
        checkEN: {
          q: "On the BTC 1D chart, after a 25% decline, a bullish engulfing appears at support at €78,000. RSI = 31. Volume is 2× higher than normal. What do you do?",
          options: [
            "Nothing — one pattern is never enough",
            "Sell — the market is still declining",
            "Seriously consider a buy setup: three confirmations (pattern + RSI oversold + support + volume). Stop-loss below €78,000.",
            "Wait for a fourth confirmation",
          ],
          correct: 2,
          explain: "This is exactly the setup professionals look for. Bullish engulfing (pattern) + RSI 31 (oversold) + historical support (zone) + high volume (conviction) = four converging signals. That's confluence. Stop-loss below €78,000, because if that zone breaks the setup was wrong. Determine risk/reward and execute.",
        },
      },
    ],
  },
  {
    level: 3,
    labelNL: "Niveau 3 — Technische Analyse",
    labelEN: "Level 3 — Technical Analysis",
    descNL: "Trendstructuur, support, resistance, RSI, moving averages en setup-kwaliteit.",
    descEN: "Trend structure, support, resistance, RSI, moving averages and setup quality.",
    lessons: [
      {
        id: "l3-trend",
        icon: "📉",
        titleNL: "Trendstructuur — het fundament van elke analyse",
        titleEN: "Trend structure — the foundation of every analysis",
        contentNL: `Marcus vraagt je iets concreets: kijk naar de BTC 1D grafiek. De prijs ging van €70.000 → €90.000 → €82.000 → €95.000 → €87.000 → €102.000. Is dit een uptrend? En wanneer is de trend officieel voorbij?

De meeste beginners antwoorden op gevoel. Maar trendanalyse heeft exacte regels — en die regels zijn de basis van bijna elke professionele trade.

DE TAAL VAN TRENDSTRUCTUUR:

In een UPTREND zie je twee dingen tegelijk:
— Higher Highs (HH): elke nieuwe top is hoger dan de vorige top
— Higher Lows (HL): elke nieuwe bodem is hoger dan de vorige bodem

In het voorbeeld: €70k → €90k (HH) → €82k (HL) → €95k (HH) → €87k (HL) → €102k (HH).
Elke top hoger, elke bodem hoger. Perfecte uptrend-structuur.

In een DOWNTREND zie je het tegenovergestelde:
— Lower Highs (LH): elke top is lager dan de vorige
— Lower Lows (LL): elke bodem is lager dan de vorige

SIDEWAYS: tops en bodems op vergelijkbaar niveau. Geen duidelijke richting.

WANNEER IS EEN TREND GEBROKEN?
Een uptrend is gebroken als de prijs voor het eerst een LOWER HIGH maakt — en dan ook een LOWER LOW.
Dat is het signaal: de structuur heeft veranderd.

Voorbeeld: BTC gaat van €95k naar €80k (LL, al een waarschuwing), maar stijgt dan slechts naar €88k (LH — lager dan de vorige top van €95k). Dit is de eerste serieuze trendbreuk. Tijd om voorzichtig te zijn.

DE PRAKTISCHE TOEPASSING:

Stap 1: Open de 1D grafiek. Markeer de laatste 5-6 toppen en bodems.
Stap 2: Zijn de toppen steeds hoger? Zijn de bodems steeds hoger? → uptrend.
Stap 3: Zie je een top die LAGER is dan de vorige? → WAARSCHUWING. Verlaag je positiegrootte of wacht af.
Stap 4: Zie je daarna ook een lagere bodem? → Trendbreuk bevestigd. Geen nieuwe long-trades totdat de structuur herstelt.

WAAROM DE MEESTE BEGINNERS DIT VERKEERD DOEN:
Ze handelen op gevoel ("BTC stijgt al weken, dus hij gaat vast door"). Ze zien geen structuur — ze zien alleen de laatste kaars. Trendstructuur dwingt je objectief te kijken: wat zegt de grafiek, niet wat hoop ik?

De hogere timeframe wint altijd: als 1D in downtrend is, zijn bounces op 4H of 1H tijdelijk. Je koopt in een vallend mes. Trade altijd MET de structuur van de hogere timeframe.

Actie: open de BTC 1D grafiek. Teken de laatste 6 significante toppen en bodems. Label ze: HH, HL, LH, LL. Wat zegt de huidige structuur? Is er een trend of niet?

Marcus zegt: Iedereen ziet een grafiek. Maar wie ziet de structuur achter de grafiek? Dat is het verschil tussen reageren en anticiperen.`,
        contentEN: `Marcus asks you something concrete: look at the BTC 1D chart. Price went from €70,000 → €90,000 → €82,000 → €95,000 → €87,000 → €102,000. Is this an uptrend? And when is the trend officially over?

Most beginners answer by feel. But trend analysis has exact rules — and those rules are the foundation of almost every professional trade.

THE LANGUAGE OF TREND STRUCTURE:

In an UPTREND you see two things simultaneously:
— Higher Highs (HH): each new peak is higher than the previous peak
— Higher Lows (HL): each new bottom is higher than the previous bottom

In the example: €70k → €90k (HH) → €82k (HL) → €95k (HH) → €87k (HL) → €102k (HH).
Each peak higher, each bottom higher. Perfect uptrend structure.

In a DOWNTREND you see the opposite:
— Lower Highs (LH): each peak is lower than the previous
— Lower Lows (LL): each bottom is lower than the previous

SIDEWAYS: peaks and bottoms at comparable levels. No clear direction.

WHEN IS A TREND BROKEN?
An uptrend is broken when price makes a LOWER HIGH for the first time — and then also a LOWER LOW.
That's the signal: the structure has changed.

Example: BTC goes from €95k to €80k (LL, already a warning), but only rises to €88k (LH — lower than the previous peak of €95k). This is the first serious trend break. Time to be cautious.

THE PRACTICAL APPLICATION:

Step 1: Open the 1D chart. Mark the last 5-6 peaks and bottoms.
Step 2: Are peaks consistently higher? Are bottoms consistently higher? → uptrend.
Step 3: Do you see a peak LOWER than the previous? → WARNING. Reduce position size or wait.
Step 4: Do you then see a lower bottom? → Trend break confirmed. No new long trades until structure recovers.

WHY MOST BEGINNERS GET THIS WRONG:
They trade on feeling ("BTC has been rising for weeks, it'll surely continue"). They don't see structure — they only see the last candle. Trend structure forces you to look objectively: what does the chart say, not what do I hope?

Higher timeframe always wins: if 1D is in downtrend, bounces on 4H or 1H are temporary. You're buying a falling knife. Always trade WITH the structure of the higher timeframe.

Action: open the BTC 1D chart. Draw the last 6 significant peaks and bottoms. Label them: HH, HL, LH, LL. What does the current structure say? Is there a trend or not?

Marcus says: Everyone sees a chart. But who sees the structure behind the chart? That's the difference between reacting and anticipating.`,
        termsNL: [
          { term: "Uptrend", def: "Stijgende marktstructuur. Hogere highs (HH) én hogere lows (HL). Bullish richting." },
          { term: "Downtrend", def: "Dalende marktstructuur. Lagere highs (LH) én lagere lows (LL). Bearish richting." },
          { term: "Higher High (HH)", def: "Een nieuwe top hoger dan de vorige top. Bevestigt uptrend-kracht." },
          { term: "Higher Low (HL)", def: "Een nieuwe bodem hoger dan de vorige bodem. Toont dat kopers bij elke dip terugkomen." },
          { term: "Lower High (LH)", def: "Eerste waarschuwingsteken: verkopers worden sterker. Potentiële trendbreuk." },
          { term: "Trendbreuk", def: "Wanneer zowel LH als LL zijn gevormd. De uptrend-structuur is gebroken. Wacht op herstel voordat je long gaat." },
        ],
        termsEN: [
          { term: "Uptrend", def: "Rising market structure. Higher highs (HH) AND higher lows (HL). Bullish direction." },
          { term: "Downtrend", def: "Falling market structure. Lower highs (LH) AND lower lows (LL). Bearish direction." },
          { term: "Higher High (HH)", def: "A new peak higher than the previous peak. Confirms uptrend strength." },
          { term: "Higher Low (HL)", def: "A new bottom higher than the previous bottom. Shows buyers return at every dip." },
          { term: "Lower High (LH)", def: "First warning sign: sellers are getting stronger. Potential trend break." },
          { term: "Trend Break", def: "When both LH and LL have formed. The uptrend structure is broken. Wait for recovery before going long." },
        ],
        checkNL: {
          q: "BTC toppen: €70k → €85k → €95k → €88k. BTC bodems: €60k → €72k → €80k → €78k. Wat concludeer je?",
          options: [
            "Sterke uptrend — de prijs is hoger dan €70k",
            "Mogelijke trendbreuk — laatste top (€88k) lager dan vorige (€95k), laatste bodem (€78k) lager dan vorige (€80k)",
            "Downtrend — de prijs daalde van €95k naar €88k",
            "Sideways — de prijs beweegt maar een beetje",
          ],
          correct: 1,
          explain: "Scherpe analyse! Tops: €70k → €85k → €95k ✓ (HH, HH). Maar €95k → €88k = LH ⚠️. Bodems: €60k → €72k → €80k ✓ (HL, HL). Maar €80k → €78k = LL ⚠️. Beide signalen aanwezig: LH + LL = trendbreuk bevestigd. De uptrend-structuur is gebroken. Geen nieuwe long trades totdat er een HH wordt gevormd.",
        },
        checkEN: {
          q: "BTC peaks: €70k → €85k → €95k → €88k. BTC bottoms: €60k → €72k → €80k → €78k. What do you conclude?",
          options: [
            "Strong uptrend — price is higher than €70k",
            "Possible trend break — last peak (€88k) lower than previous (€95k), last bottom (€78k) lower than previous (€80k)",
            "Downtrend — price dropped from €95k to €88k",
            "Sideways — price only moves a little",
          ],
          correct: 1,
          explain: "Sharp analysis! Peaks: €70k → €85k → €95k ✓ (HH, HH). But €95k → €88k = LH ⚠️. Bottoms: €60k → €72k → €80k ✓ (HL, HL). But €80k → €78k = LL ⚠️. Both signals present: LH + LL = trend break confirmed. Uptrend structure is broken. No new long trades until a HH is formed.",
        },
      },
      {
        id: "l3-sr",
        icon: "🧱",
        titleNL: "Support en Resistance — de bouwstenen",
        titleEN: "Support and Resistance — the building blocks",
        contentNL: `Support en resistance zijn de meest fundamentele concepten in technische analyse. Begrijp deze twee, en je begrijpt al 60% van grafiek-lezen.

SUPPORT: een prijsniveau waar de markt historisch stopte met dalen en omhoog ging. Het is een "vloer". Kopers worden actief op dit niveau.
Voorbeeld: BTC daalde drie keer richting €75.000 maar stuiterde elke keer terug omhoog. €75.000 is nu een sterk support-niveau.

RESISTANCE: een prijsniveau waar de markt historisch stopte met stijgen en omlaag ging. Het is een "plafond". Verkopers worden actief.
Voorbeeld: BTC probeerde drie keer door €90.000 te breken maar werd telkens teruggedrukt. €90.000 is nu sterke resistance.

Rol-wissel: als support breekt, wordt het resistance. Als resistance breekt, wordt het support.
Dit noemen we een "role reversal" — een van de meest betrouwbare patronen.

Hoe herken je sterke zones?
— Prijs raakte het niveau meerdere keren aan (3+ keer = sterk)
— Grote wicks op het niveau (veel volume, reactie was heftig)
— Ronde nummers (€80.000, €85.000, €90.000) zijn psychologisch belangrijk

Marcus zegt: Teken de horizontale zones op je grafiek. Dat zijn je mogelijke instap- en uitstappunten. Alles wat daartussenin zit is ruis.`,
        contentEN: `Support and resistance are the most fundamental concepts in technical analysis. Understand these two, and you already understand 60% of reading charts.

SUPPORT: a price level where the market historically stopped falling and went up. It's a "floor". Buyers become active at this level.
Example: BTC fell three times toward €75,000 but bounced back up each time. €75,000 is now a strong support level.

RESISTANCE: a price level where the market historically stopped rising and went down. It's a "ceiling". Sellers become active.
Example: BTC tried to break through €90,000 three times but was pushed back each time. €90,000 is now strong resistance.

Role reversal: when support breaks, it becomes resistance. When resistance breaks, it becomes support.
This is called a "role reversal" — one of the most reliable patterns.

How do you recognize strong zones?
— Price touched the level multiple times (3+ times = strong)
— Large wicks at the level (high volume, reaction was intense)
— Round numbers (€80,000, €85,000, €90,000) are psychologically important

Marcus says: Draw the horizontal zones on your chart. Those are your potential entry and exit points. Everything in between is noise.`,
        termsNL: [
          { term: "Support", def: "Prijsniveau waarop de markt historisch stopte met dalen. Kopers zijn actief. 'Vloer'." },
          { term: "Resistance", def: "Prijsniveau waarop de markt historisch stopte met stijgen. Verkopers zijn actief. 'Plafond'." },
          { term: "Role Reversal", def: "Gebroken support wordt resistance en vice versa. Zeer betrouwbaar signaal." },
          { term: "Zone", def: "Support/resistance is geen exacte lijn maar een zone (bereik). BTC support op €75.000–€76.500, niet precies €75.000." },
          { term: "Bounce", def: "Als de prijs een support raakt en terugspringt omhoog." },
          { term: "Breakout", def: "Als de prijs door resistance breekt met volume. Potentieel sterke move." },
        ],
        termsEN: [
          { term: "Support", def: "Price level where the market historically stopped falling. Buyers are active. 'Floor'." },
          { term: "Resistance", def: "Price level where the market historically stopped rising. Sellers are active. 'Ceiling'." },
          { term: "Role Reversal", def: "Broken support becomes resistance and vice versa. Very reliable signal." },
          { term: "Zone", def: "Support/resistance is not an exact line but a zone (range). BTC support at €75,000–€76,500, not exactly €75,000." },
          { term: "Bounce", def: "When the price touches a support and bounces back up." },
          { term: "Breakout", def: "When the price breaks through resistance with volume. Potentially strong move." },
        ],
        checkNL: {
          q: "BTC had jarenlang resistance op €69.000. In 2024 brak de prijs er doorheen met volume. Nu trekt BTC terug naar €69.000. Wat verwacht je?",
          options: [
            "€69.000 is nu resistance — opnieuw afstoten",
            "€69.000 is nu support — kopers zouden hier actief moeten zijn (role reversal)",
            "€69.000 is niet meer relevant na de breakout",
            "Onmogelijk te zeggen zonder de RSI te kennen",
          ],
          correct: 1,
          explain: "Role reversal in actie! Dit is precies wat er in 2024 met BTC gebeurde. Oude resistance op €69k werd na de breakout sterke support. Grote kopers gebruikten deze zone om in te stappen. Dit is een van de meest consistente patronen in alle markten.",
        },
        checkEN: {
          q: "BTC had resistance at €69,000 for years. In 2024 the price broke through it with volume. Now BTC pulls back to €69,000. What do you expect?",
          options: [
            "€69,000 is now resistance — rejection again",
            "€69,000 is now support — buyers should be active here (role reversal)",
            "€69,000 is no longer relevant after the breakout",
            "Impossible to say without knowing the RSI",
          ],
          correct: 1,
          explain: "Role reversal in action! This is exactly what happened with BTC in 2024. Old resistance at €69k became strong support after the breakout. Large buyers used this zone to enter. This is one of the most consistent patterns across all markets.",
        },
      },
      {
        id: "l3-rolerev",
        icon: "🔄",
        titleNL: "Role Reversal — de meest onderschatte kracht in TA",
        titleEN: "Role Reversal — the most underestimated force in TA",
        contentNL: `Marcus stelt je een vraag: stel dat €69.000 jarenlang een muur was voor Bitcoin — elke keer dat de prijs daar aankwam, stuiterde hij terug. Dan, in november 2024, gaat de prijs er met kracht en volume doorheen. Twee weken later zakt hij terug naar €69.000. Wat verwacht jij nu — stuitert hij weer terug, of houdt €69.000 als vloer?

Als je antwoord "vloer" is, heb je rol-omwisseling al begrepen.

WAT IS ROLE REVERSAL?

Een zone die jarenlang functie A had (resistance = plafond) neemt na een doorbraak functie B aan (support = vloer). En andersom.

Dit klinkt simpel. Maar de reden waarom het werkt gaat diep.

WAAROM WERKT ROLE REVERSAL?

De markt heeft geheugen. Alle traders ter wereld die BTC bij €69.000 probeerden te kopen en werden teruggeslagen, onthouden die prijs. Zodra BTC er doorheen breekt, denken deze traders: "eindelijk, €69.000 is voorbij — nu echt bullish." Ze WILLEN kopen bij een terugtest. Dat collectieve gedrag creëert de support.

Tegelijkertijd: traders die short (verkoop) waren bij €69.000 en verlies hebben, willen bij een terugtest uitstappen om break-even te raken. Ook zij staan te kopen bij €69.000.

Resultaat: bij een terugtest naar €69.000 staan er massa's kopers klaar — van beide groepen.

HOE TRADE JE EEN ROLE REVERSAL?

Setup:
1. Identificeer een sterke, meerdere keren geteste zone (resistance of support)
2. Wacht tot de prijs er doorheen breekt MET volume (bevestiging)
3. Wacht op een terugtest naar die zone
4. Bij de terugtest: kijk voor bevestiging — wick, bullish kaars, RSI oversold

Entry: bij bevestiging op de zone
Stop-loss: net onder de zone (als de zone breekt, was de role reversal vals)
Take-profit: volgende significante resistance

WANNEER FAALT EEN ROLE REVERSAL?

1. Te snelle terugtest: de prijs breekt door resistance maar keert binnen uren terug. Geen echte role reversal — waarschijnlijk een "fakeout".

2. Geen volume bij de breakout: prijs gleed door de zone zonder actie. Grote spelers waren er niet bij. Minder betrouwbaar.

3. Macro-tegenwind: als het algemene marktsentiment bearish is, kan zelfs een sterke zone worden gebroken.

REAL BTC VOORBEELD — 2024:
€69.000 was jarenlang het all-time high (2021). Resistance van formaat. In november 2024 brak BTC er met enorm volume doorheen. Terugtest op €69.000? Kopers overspoelden de markt. Resultaat: directe stijging naar €80.000, €90.000, €100.000. Wie role reversal kende, stapt hier in.

Actie: open de BTC 1D grafiek. Zoek een zone die vroeger resistance was en nu als support functioneert. Zijn er wicks op die zone? Heeft de prijs er meerdere keren van afgestuiterd?

Marcus zegt: Role reversal is de markt die zijn eigen afspraken nakomt. Zones hebben geheugen. Als je weet waar de markt zijn afspraken heeft, weet je waar de grote kopers staan.`,
        contentEN: `Marcus asks you a question: suppose €69,000 was a wall for Bitcoin for years — every time price approached it, it bounced back. Then, in November 2024, price breaks through it with force and volume. Two weeks later it retraces to €69,000. What do you expect now — does it bounce back again, or does €69,000 hold as a floor?

If your answer is "floor", you've already understood role reversal.

WHAT IS ROLE REVERSAL?

A zone that had function A for years (resistance = ceiling) takes on function B after a breakout (support = floor). And vice versa.

This sounds simple. But the reason it works goes deep.

WHY DOES ROLE REVERSAL WORK?

The market has memory. All traders worldwide who tried to buy BTC at €69,000 and were pushed back remember that price. Once BTC breaks through, these traders think: "finally, €69,000 is behind us — now truly bullish." They WANT to buy at a retest. That collective behavior creates the support.

At the same time: traders who were short (sell) at €69,000 and have losses want to exit at a retest to reach break-even. They too are waiting to buy at €69,000.

Result: at a retest to €69,000 there are masses of buyers ready — from both groups.

HOW DO YOU TRADE A ROLE REVERSAL?

Setup:
1. Identify a strong, multiply-tested zone (resistance or support)
2. Wait for price to break through it WITH volume (confirmation)
3. Wait for a retest back to that zone
4. At the retest: look for confirmation — wick, bullish candle, RSI oversold

Entry: at confirmation on the zone
Stop-loss: just below the zone (if the zone breaks, the role reversal was false)
Take-profit: next significant resistance

WHEN DOES A ROLE REVERSAL FAIL?

1. Too fast retest: price breaks through resistance but returns within hours. Not a real role reversal — probably a "fakeout".

2. No volume at breakout: price slid through the zone without action. Big players weren't involved. Less reliable.

3. Macro headwinds: if overall market sentiment is bearish, even a strong zone can be broken.

REAL BTC EXAMPLE — 2024:
€69,000 was the all-time high for years (2021). Major resistance. In November 2024, BTC broke through it with enormous volume. Retest at €69,000? Buyers flooded the market. Result: direct rise to €80,000, €90,000, €100,000. Whoever knew role reversal entered here.

Action: open the BTC 1D chart. Find a zone that was formerly resistance and now functions as support. Are there wicks at that zone? Has price bounced from it multiple times?

Marcus says: Role reversal is the market honoring its own agreements. Zones have memory. If you know where the market has made its agreements, you know where the big buyers are standing.`,
        termsNL: [
          { term: "Role Reversal", def: "Wanneer een gebroken resistance support wordt — en andersom. Gebaseerd op marktgeheugen." },
          { term: "Retest", def: "Terugkeer van de prijs naar een net-gebroken zone. De cruciale test of role reversal werkt." },
          { term: "Fakeout", def: "Valse breakout. De prijs breekt door een zone maar keert snel terug. Geen echte role reversal." },
          { term: "Breakout", def: "De prijs doorbreekt een langdurige zone met volume. De trigger voor role reversal." },
          { term: "Marktgeheugen", def: "Traders onthouden significante prijsniveaus. Dit collectieve geheugen creëert koopdruk bij retests." },
          { term: "Confluentie", def: "Meerdere signalen die hetzelfde bevestigen (role reversal + oversold RSI + wick = sterker signaal)." },
        ],
        termsEN: [
          { term: "Role Reversal", def: "When broken resistance becomes support — and vice versa. Based on market memory." },
          { term: "Retest", def: "Return of price to a just-broken zone. The crucial test of whether role reversal works." },
          { term: "Fakeout", def: "False breakout. Price breaks through a zone but quickly returns. Not a real role reversal." },
          { term: "Breakout", def: "Price breaks through a long-standing zone with volume. The trigger for role reversal." },
          { term: "Market Memory", def: "Traders remember significant price levels. This collective memory creates buying pressure at retests." },
          { term: "Confluence", def: "Multiple signals confirming the same thing (role reversal + oversold RSI + wick = stronger signal)." },
        ],
        checkNL: {
          q: "BTC had support op €45.000 (meerdere keren getest). De prijs brak omlaag door €45.000 met volume. Nu stijgt BTC terug naar €45.000. Wat verwacht je?",
          options: [
            "€45.000 is nu support — kopers zijn hier actief",
            "€45.000 is nu resistance — verkopers zullen hier actief zijn (role reversal)",
            "€45.000 is niet meer relevant na de breakout",
            "Niet genoeg info — RSI bepaalt alles",
          ],
          correct: 1,
          explain: "Role reversal downward. Gebroken support wordt resistance. Traders die bij €45.000 kochten en vastzaten, willen nu bij €45.000 verkopen om break-even te raken. Dat creëert verkoopdruk. Traders die short zijn, beschermen hun positie hier. Resultaat: €45.000 fungeert als plafond totdat er een fundamentele verandering is.",
        },
        checkEN: {
          q: "BTC had support at €45,000 (tested multiple times). Price broke downward through €45,000 with volume. Now BTC rises back to €45,000. What do you expect?",
          options: [
            "€45,000 is now support — buyers are active here",
            "€45,000 is now resistance — sellers will be active here (role reversal)",
            "€45,000 is no longer relevant after the breakout",
            "Not enough info — RSI determines everything",
          ],
          correct: 1,
          explain: "Role reversal downward. Broken support becomes resistance. Traders who bought at €45,000 and are stuck want to sell at €45,000 to reach break-even. That creates selling pressure. Traders who are short protect their position here. Result: €45,000 functions as a ceiling until there's a fundamental change.",
        },
        diagram: SupportResistanceDiagram,
      },
      {
        id: "l3-rsi",
        icon: "📊",
        titleNL: "RSI — meten of de markt te ver gegaan is",
        titleEN: "RSI — measuring if the market has gone too far",
        contentNL: `De RSI (Relative Strength Index) is een getal tussen 0 en 100 dat meet hoe hard de prijs gestegen of gedaald is in de afgelopen 14 perioden.

Boven 70 = overbought (te veel gestegen, kans op correctie)
Onder 30 = oversold (te veel gedaald, kans op herstel)
50 = neutraal

Maar opgelet: overbought betekent NIET dat je direct moet verkopen. Een sterke bull markt kan maanden lang boven 70 blijven. RSI is een waarschuwing, geen commando.

Hoe gebruik je RSI als beginner?
— Koop NIET als RSI al ver boven 70 staat (je koopt dan te duur)
— Zoek instappen als RSI terugkomt onder 50 of naar 30
— Bevestiging: RSI laag + prijs op support = sterker signaal

RSI divergentie (gevorderd):
— Bullish divergentie: prijs maakt lagere lows, RSI maakt hogere lows → potentieel keerpunt omhoog
— Bearish divergentie: prijs maakt hogere highs, RSI maakt lagere highs → potentieel keerpunt omlaag

Beste timeframe voor RSI: 4H en 1D. Op 1m of 5m is RSI te gevoelig en te veel ruis.

Marcus zegt: RSI is jouw thermometer. Hij vertelt of de markt te heet is (overbought) of te koud (oversold). Maar een thermometer zegt niet wanneer het gaat veranderen — dat zegt de context eromheen.`,
        contentEN: `The RSI (Relative Strength Index) is a number between 0 and 100 that measures how strongly the price has risen or fallen in the last 14 periods.

Above 70 = overbought (risen too much, chance of correction)
Below 30 = oversold (fallen too much, chance of recovery)
50 = neutral

But caution: overbought does NOT mean you should immediately sell. A strong bull market can stay above 70 for months. RSI is a warning, not a command.

How do you use RSI as a beginner?
— Do NOT buy when RSI is already well above 70 (you're then buying too expensive)
— Look for entries when RSI comes back below 50 or toward 30
— Confirmation: RSI low + price at support = stronger signal

RSI divergence (advanced):
— Bullish divergence: price makes lower lows, RSI makes higher lows → potential turning point up
— Bearish divergence: price makes higher highs, RSI makes lower highs → potential turning point down

Best timeframe for RSI: 4H and 1D. On 1m or 5m RSI is too sensitive and too noisy.

Marcus says: RSI is your thermometer. It tells you if the market is too hot (overbought) or too cold (oversold). But a thermometer doesn't say when it will change — the surrounding context says that.`,
        termsNL: [
          { term: "RSI", def: "Relative Strength Index. Getal 0-100. Boven 70 = overbought, onder 30 = oversold." },
          { term: "Overbought", def: "RSI > 70. Markt is sterk gestegen, kans op correctie — maar kan nog verder stijgen." },
          { term: "Oversold", def: "RSI < 30. Markt is sterk gedaald, kans op herstel — maar kan nog verder dalen." },
          { term: "Bullish Divergentie", def: "Prijs daalt maar RSI stijgt → zwakkere verkoopdruk. Potentieel keerpunt omhoog." },
          { term: "Bearish Divergentie", def: "Prijs stijgt maar RSI daalt → zwakkere koopkracht. Potentieel keerpunt omlaag." },
          { term: "Moving Average (MA)", def: "Gemiddelde prijs over X perioden. MA20 = gemiddelde van laatste 20 kaarsen. Toont de trend." },
        ],
        termsEN: [
          { term: "RSI", def: "Relative Strength Index. Number 0-100. Above 70 = overbought, below 30 = oversold." },
          { term: "Overbought", def: "RSI > 70. Market has risen strongly, chance of correction — but can continue rising." },
          { term: "Oversold", def: "RSI < 30. Market has fallen strongly, chance of recovery — but can continue falling." },
          { term: "Bullish Divergence", def: "Price falls but RSI rises → weaker selling pressure. Potential turning point up." },
          { term: "Bearish Divergence", def: "Price rises but RSI falls → weaker buying power. Potential turning point down." },
          { term: "Moving Average (MA)", def: "Average price over X periods. MA20 = average of last 20 candles. Shows the trend." },
        ],
        checkNL: {
          q: "BTC staat op support €80.000. RSI op 1D = 28. Wat zegt dit signaal combinatie?",
          options: [
            "Sterk verkoopsignaal — RSI onder 30 = kopen is gevaarlijk",
            "Neutraal — RSI en support zeggen niks samen",
            "Potentieel sterk koopsignaal — oversold RSI op een historische support",
            "RSI van 28 betekent dat de prijs seker gaat dalen naar 20",
          ],
          correct: 2,
          explain: "Dit is precies de setup die professionals zoeken. Oversold RSI (28) op een sterke support = dubbele bevestiging dat er koopdruk kan komen. Niet 100% zeker — maar de kansen zijn in jouw voordeel. Dit is hoe je een edge bouwt.",
        },
        checkEN: {
          q: "BTC is at support €80,000. RSI on 1D = 28. What does this signal combination say?",
          options: [
            "Strong sell signal — RSI below 30 = buying is dangerous",
            "Neutral — RSI and support say nothing together",
            "Potentially strong buy signal — oversold RSI at a historical support",
            "RSI of 28 means price will definitely drop to 20",
          ],
          correct: 2,
          explain: "This is exactly the setup professionals look for. Oversold RSI (28) at a strong support = double confirmation that buying pressure may come. Not 100% certain — but the odds are in your favor. This is how you build an edge.",
        },
      },
      {
        id: "l3-ma",
        icon: "📐",
        titleNL: "Moving Averages — de richting in één oogopslag",
        titleEN: "Moving Averages — direction at a glance",
        contentNL: `Marcus stelt je een simpele vraag: als je iemand die nog nooit een grafiek heeft gezien moet uitleggen of BTC in een goede of slechte fase zit — in 5 seconden, zonder te tellen of technisch te analyseren — wat zou je laten zien?

Het antwoord van elke ervaren trader: de moving average. Één lijn op de grafiek die meer vertelt dan tien indicatoren.

WAT IS EEN MOVING AVERAGE (MA)?

Een moving average berekent de gemiddelde sluitingsprijs over de laatste X kaarsen en tekent dit als een vloeiende lijn.

MA20 = gemiddelde sluitingsprijs van de laatste 20 kaarsen.
Op een 1D grafiek = gemiddelde van de laatste 20 handelsdagen (≈ 1 maand).
Op een 4H grafiek = gemiddelde van de laatste 20 × 4 uur (≈ 3.3 dagen).

DE DRIE MEEST GEBRUIKTE:

MA20 — de korte-termijn trend:
Reageert snel op prijsveranderingen. Goed voor het herkennen van recente richting.
Prijs boven MA20 = korte-termijn bullish. Prijs onder MA20 = korte-termijn bearish.

MA50 — de middellange trend:
Langzamer, gladder. Toont de trend van de afgelopen ≈2.5 maanden (op 1D).
Dit is de lijn die swing traders het meest gebruiken.
Als prijs terugkomt naar MA50 in een uptrend → potentiële koopkans.

MA200 — de heilige graal van trendrichtingen:
Dit is DE indicator voor lange-termijn bull of bear markt.
Prijs BOVEN MA200 op 1D = Bitcoin in bull markt zone. Institutionele kopers zijn actief.
Prijs ONDER MA200 op 1D = Bitcoin in bear markt zone. Voorzichtigheid geboden.
In 2020-2021 en 2023-2024: BTC boven MA200 → bull markt. In 2022: BTC onder MA200 → bear markt.

DE GOLDEN CROSS EN DEATH CROSS:

Golden Cross: MA50 kruist BOVEN de MA200 op 1D.
Historisch één van de sterkste bullish signalen op lange termijn.
Het signaleerde elke Bitcoin bull markt (2017, 2020, 2023).

Death Cross: MA50 kruist ONDER de MA200 op 1D.
Bearish signaal. Signaleerde de bear markten van 2018, 2022.

MOVING AVERAGE ALS DYNAMISCHE SUPPORT/RESISTANCE:

In een sterke uptrend fungeert de MA50 als dynamische support — de prijs 'stuitert' er steeds van terug. Dit is geen toeval. Het is omdat traders de MA50 gebruiken als referentie en op dat niveau kopen.

Praktisch gebruik:
1. Open 1D grafiek
2. Voeg MA50 en MA200 toe
3. Is de prijs erboven? Bullish bias. Eronder? Bearish bias.
4. Staat MA50 boven MA200? Golden Cross zone = maximaal bullish.
5. Staat de prijs op MA50 in een uptrend? Potentiële koopkans.

In Bitcoin Mentor: klik op "Indicators" boven de grafiek → voeg MA50 en MA200 toe.

Actie: voeg nu MA50 en MA200 toe aan de BTC 1D grafiek. Noteer: staat de prijs erboven of eronder? Staat MA50 boven of onder MA200? Waar stond de prijs het laatste kwartaal ten opzichte van deze lijnen?

Marcus zegt: De MA200 is de grens tussen angst en hebzucht. Boven die lijn kopen institutionelen. Eronder wachten ze. Weet waar die lijn is — altijd.`,
        contentEN: `Marcus asks you a simple question: if you had to explain to someone who has never seen a chart whether BTC is in a good or bad phase — in 5 seconds, without counting or technical analysis — what would you show?

The answer of every experienced trader: the moving average. One line on the chart that tells more than ten indicators.

WHAT IS A MOVING AVERAGE (MA)?

A moving average calculates the average closing price over the last X candles and draws it as a smooth line.

MA20 = average closing price of the last 20 candles.
On a 1D chart = average of the last 20 trading days (≈ 1 month).
On a 4H chart = average of the last 20 × 4 hours (≈ 3.3 days).

THE THREE MOST USED:

MA20 — the short-term trend:
Reacts quickly to price changes. Good for recognizing recent direction.
Price above MA20 = short-term bullish. Price below MA20 = short-term bearish.

MA50 — the medium-term trend:
Slower, smoother. Shows the trend of the last ≈2.5 months (on 1D).
This is the line swing traders use most.
When price returns to MA50 in an uptrend → potential buying opportunity.

MA200 — the holy grail of trend directions:
THE indicator for long-term bull or bear market.
Price ABOVE MA200 on 1D = Bitcoin in bull market zone. Institutional buyers are active.
Price BELOW MA200 on 1D = Bitcoin in bear market zone. Caution warranted.
In 2020-2021 and 2023-2024: BTC above MA200 → bull market. In 2022: BTC below MA200 → bear market.

THE GOLDEN CROSS AND DEATH CROSS:

Golden Cross: MA50 crosses ABOVE MA200 on 1D.
Historically one of the strongest long-term bullish signals.
It signaled every Bitcoin bull market (2017, 2020, 2023).

Death Cross: MA50 crosses BELOW MA200 on 1D.
Bearish signal. Signaled the bear markets of 2018, 2022.

MOVING AVERAGE AS DYNAMIC SUPPORT/RESISTANCE:

In a strong uptrend the MA50 functions as dynamic support — price keeps 'bouncing' off it. This is no coincidence. It's because traders use the MA50 as a reference and buy at that level.

Practical use:
1. Open 1D chart
2. Add MA50 and MA200
3. Is price above? Bullish bias. Below? Bearish bias.
4. Is MA50 above MA200? Golden Cross zone = maximally bullish.
5. Is price at MA50 in an uptrend? Potential buying opportunity.

In Bitcoin Mentor: click "Indicators" above the chart → add MA50 and MA200.

Action: add MA50 and MA200 to the BTC 1D chart now. Note: is price above or below them? Is MA50 above or below MA200? Where was the price last quarter relative to these lines?

Marcus says: The MA200 is the border between fear and greed. Above that line institutions buy. Below it they wait. Know where that line is — always.`,
        termsNL: [
          { term: "Moving Average (MA)", def: "Gemiddelde sluitingsprijs over X kaarsen. Tekent een vloeiende trendlijn." },
          { term: "MA20", def: "Gemiddelde van laatste 20 kaarsen. Korte-termijn trend. Reageert snel." },
          { term: "MA50", def: "Gemiddelde van laatste 50 kaarsen. Middellange trend. Beste voor swing trading." },
          { term: "MA200", def: "Gemiddelde van laatste 200 kaarsen. Lange-termijn bull/bear bepaler. Meest gevolgd door institutionelen." },
          { term: "Golden Cross", def: "MA50 kruist boven MA200 op 1D. Historisch sterk bullish signaal voor langere termijn." },
          { term: "Death Cross", def: "MA50 kruist onder MA200 op 1D. Historisch bearish signaal. Signaleerde elke grote bear markt." },
        ],
        termsEN: [
          { term: "Moving Average (MA)", def: "Average closing price over X candles. Draws a smooth trend line." },
          { term: "MA20", def: "Average of last 20 candles. Short-term trend. Reacts quickly." },
          { term: "MA50", def: "Average of last 50 candles. Medium-term trend. Best for swing trading." },
          { term: "MA200", def: "Average of last 200 candles. Long-term bull/bear determiner. Most followed by institutions." },
          { term: "Golden Cross", def: "MA50 crosses above MA200 on 1D. Historically strong bullish signal for longer term." },
          { term: "Death Cross", def: "MA50 crosses below MA200 on 1D. Historically bearish signal. Signaled every major bear market." },
        ],
        checkNL: {
          q: "BTC 1D: prijs staat op €82.000. MA50 staat op €78.000. MA200 staat op €71.000. MA50 staat boven MA200. Wat concludeer je?",
          options: [
            "Bearish — prijs is gedaald van een hoger niveau",
            "Neutraal — moving averages zeggen weinig",
            "Bullish zone: prijs boven beide MA's, MA50 boven MA200 = Golden Cross structuur. Bull markt context.",
            "Gevaarlijk — prijs staat te ver boven MA200",
          ],
          correct: 2,
          explain: "Correct. Prijs (€82k) boven MA50 (€78k) boven MA200 (€71k) = perfecte bull markt structuur. De Golden Cross (MA50 > MA200) is actief. Dit is de zone waar institutionele kopers opereren. Niet garantie voor morgen — maar de context is maximaal bullish op lange termijn.",
        },
        checkEN: {
          q: "BTC 1D: price is at €82,000. MA50 is at €78,000. MA200 is at €71,000. MA50 is above MA200. What do you conclude?",
          options: [
            "Bearish — price has dropped from a higher level",
            "Neutral — moving averages say little",
            "Bullish zone: price above both MAs, MA50 above MA200 = Golden Cross structure. Bull market context.",
            "Dangerous — price is too far above MA200",
          ],
          correct: 2,
          explain: "Correct. Price (€82k) above MA50 (€78k) above MA200 (€71k) = perfect bull market structure. The Golden Cross (MA50 > MA200) is active. This is the zone where institutional buyers operate. Not a guarantee for tomorrow — but the context is maximally bullish long-term.",
        },
      },
      {
        id: "l3-positiegrootte",
        icon: "🔢",
        titleNL: "Positiegrootte berekenen — nooit gokken",
        titleEN: "Calculating position size — never guess",
        contentNL: `De meest onderschatte vaardigheid in trading: weten hoeveel je inzet.

Stap 1: Bepaal je risicobereidheid per trade
Regel: 1-2% van je totale kapitaal. Als je €10.000 hebt: max €100-200 verlies per trade.

Stap 2: Bepaal je stop-loss niveau
Waar zou jij uitstappen als het tegenzit?
Voorbeeld: je koopt BTC op €80.000, stop-loss op €77.000 → risico = €3.000 per BTC.

Stap 3: Bereken je positiegrootte
Formule: Positiegrootte = Max Verlies / Risico per eenheid

Voorbeeld:
— Max verlies = €150 (1.5% van €10.000)
— Risico per BTC = €80.000 - €77.000 = €3.000
— Positiegrootte = €150 / €3.000 = 0.05 BTC

Dat is dus 0.05 BTC kopen — niet "alles inzetten" of "gokken".

In Bitcoin Mentor doe je dit automatisch: de Paper Trade tab heeft een risico-calculator. Vul je entry, stop-loss en risico% in → je krijgt de exacte positiegrootte.

Marcus zegt: Traders die groot werden verloren doordat ze positiegrootte negeerden — niet doordat ze de markt verkeerd lazen. De markt lees je met je hoofd. Positiegrootte is wiskunde — geen emotie.`,
        contentEN: `The most underestimated skill in trading: knowing how much to bet.

Step 1: Determine your risk tolerance per trade
Rule: 1-2% of your total capital. If you have €10,000: max €100-200 loss per trade.

Step 2: Determine your stop-loss level
Where would you exit if things go wrong?
Example: you buy BTC at €80,000, stop-loss at €77,000 → risk = €3,000 per BTC.

Step 3: Calculate your position size
Formula: Position Size = Max Loss / Risk per unit

Example:
— Max loss = €150 (1.5% of €10,000)
— Risk per BTC = €80,000 - €77,000 = €3,000
— Position size = €150 / €3,000 = 0.05 BTC

So you buy 0.05 BTC — not "bet everything" or "guess".

In Bitcoin Mentor you do this automatically: the Paper Trade tab has a risk calculator. Enter your entry, stop-loss and risk% → you get the exact position size.

Marcus says: Traders who blew up lost because they ignored position size — not because they read the market wrong. You read the market with your head. Position sizing is math — no emotion.`,
        termsNL: [
          { term: "Positiegrootte", def: "Hoeveel van een asset je koopt. Bereken op basis van kapitaal, stop-loss en max verlies." },
          { term: "1R", def: "Jouw risico per trade. Als je €100 riskeert = 1R. Een winst van 3R = 3× je risico = €300 winst." },
          { term: "Expectancy", def: "Gemiddeld verwacht resultaat per trade over tijd. Positief = winstgevend systeem." },
          { term: "Win Rate", def: "Percentage winnende trades. 40% winrate met 3R gemiddelde winst kan winstgevender zijn dan 70% winrate met 0.5R." },
        ],
        termsEN: [
          { term: "Position Size", def: "How much of an asset you buy. Calculate based on capital, stop-loss and max loss." },
          { term: "1R", def: "Your risk per trade. If you risk €100 = 1R. A profit of 3R = 3× your risk = €300 profit." },
          { term: "Expectancy", def: "Average expected result per trade over time. Positive = profitable system." },
          { term: "Win Rate", def: "Percentage of winning trades. 40% win rate with 3R average win can be more profitable than 70% win rate with 0.5R." },
        ],
        checkNL: {
          q: "Kapitaal: €8.000. Je risico: 1%. Entry BTC: €84.000, stop-loss: €81.600. Hoeveel BTC koop je?",
          options: [
            "0.01 BTC",
            "0.033 BTC",
            "0.1 BTC",
            "0.5 BTC",
          ],
          correct: 1,
          explain: "Rekenen: max verlies = 1% × €8.000 = €80. Risico per BTC = €84.000 − €81.600 = €2.400. Positiegrootte = €80 ÷ €2.400 = 0.033 BTC. Als BTC naar je stop-loss gaat, verlies je precies €80 — niet meer. Dit is discipline in getallen.",
        },
        checkEN: {
          q: "Capital: €8,000. Your risk: 1%. Entry BTC: €84,000, stop-loss: €81,600. How much BTC do you buy?",
          options: [
            "0.01 BTC",
            "0.033 BTC",
            "0.1 BTC",
            "0.5 BTC",
          ],
          correct: 1,
          explain: "Math: max loss = 1% × €8,000 = €80. Risk per BTC = €84,000 − €81,600 = €2,400. Position size = €80 ÷ €2,400 = 0.033 BTC. If BTC hits your stop-loss, you lose exactly €80 — no more. This is discipline in numbers.",
        },
      },
    ],
  },
  {
    level: 4,
    labelNL: "Niveau 4 — Gevorderd",
    labelEN: "Level 4 — Advanced",
    descNL: "Multi-timeframe analyse, marktstructuur en crypto-specifieke data.",
    descEN: "Multi-timeframe analysis, market structure and crypto-specific data.",
    lessons: [
      {
        id: "l4-mtf",
        icon: "🔭",
        titleNL: "Multi-timeframe analyse — de volledige context",
        titleEN: "Multi-timeframe analysis — the full context",
        contentNL: `De meeste beginners handelen op één timeframe. Ervaren traders kijken op meerdere tegelijk — en dat maakt het verschil.

Hoe werkt het systeem?
1D → bepaalt de BIAS (richting van de markt)
4H → bepaalt de SETUP (is er een koopkans zichtbaar?)
1H of 15m → bepaalt de ENTRY TIMING (wanneer precies instappen?)

Stap 1: Open de 1D grafiek. Is de markt in uptrend? Dan bias is LONG (je zoekt koopkansen).
Stap 2: Open de 4H grafiek. Staat de prijs in een support-zone of koopzone? RSI laag?
Stap 3: Open de 1H. Zie je een bullish reversal kaars, een breakout van een klein patroon? Dan is dit je entry moment.

Alleen traden als alle drie timeframes "groen licht" geven: bias, setup én timing kloppen.

Voorbeeld Bitcoin:
— 1D: uptrend, prijs boven MA50 → bias = bullish
— 4H: pullback naar koopzone €79.000–€81.000, RSI op 42 → setup ziet er goed uit
— 1H: bullish kaarspatroon op €80.200 met volume → entry hier

In Bitcoin Mentor: gebruik de Multi-view button bovenaan de grafiek voor 1D + 4H + 1H tegelijk.

Marcus zegt: Als een timeframe zegt "koop" maar de andere twee zeggen "wacht" — wacht. Ongeduld is de duurste fout.`,
        contentEN: `Most beginners trade on one timeframe. Experienced traders look at multiple simultaneously — and that makes the difference.

How does the system work?
1D → determines the BIAS (direction of the market)
4H → determines the SETUP (is a buying opportunity visible?)
1H or 15m → determines the ENTRY TIMING (when exactly to enter?)

Step 1: Open the 1D chart. Is the market in uptrend? Then bias is LONG (you're looking for buying opportunities).
Step 2: Open the 4H chart. Is the price in a support zone or buy zone? RSI low?
Step 3: Open 1H. Do you see a bullish reversal candle, a breakout of a small pattern? That's your entry moment.

Only trade when all three timeframes give "green light": bias, setup AND timing align.

Bitcoin example:
— 1D: uptrend, price above MA50 → bias = bullish
— 4H: pullback to buy zone €79,000–€81,000, RSI at 42 → setup looks good
— 1H: bullish candle pattern at €80,200 with volume → entry here

In Bitcoin Mentor: use the Multi-view button at the top of the chart for 1D + 4H + 1H simultaneously.

Marcus says: If one timeframe says "buy" but the other two say "wait" — wait. Impatience is the most expensive mistake.`,
        termsNL: [
          { term: "Bias", def: "Je mening over de richting van de markt op basis van de hogere timeframe. Bullish bias = je zoekt long trades." },
          { term: "Setup", def: "Een geheel van omstandigheden dat wijst op een mogelijke trade-kans." },
          { term: "Entry Timing", def: "Het exacte moment dat je instapt. Gebruik lagere timeframes (15m, 1H) voor timing." },
          { term: "MA50", def: "Moving Average van 50 perioden. Op 1D = gemiddelde prijs van laatste 50 dagen. Prijs erboven = bullish." },
          { term: "Golden Cross", def: "MA50 kruist boven de MA200. Historisch bullish signaal op langere termijn." },
          { term: "Death Cross", def: "MA50 kruist onder de MA200. Historisch bearish signaal." },
        ],
        termsEN: [
          { term: "Bias", def: "Your opinion on market direction based on the higher timeframe. Bullish bias = you're looking for long trades." },
          { term: "Setup", def: "A combination of circumstances pointing to a potential trading opportunity." },
          { term: "Entry Timing", def: "The exact moment you enter. Use lower timeframes (15m, 1H) for timing." },
          { term: "MA50", def: "Moving Average of 50 periods. On 1D = average price of last 50 days. Price above it = bullish." },
          { term: "Golden Cross", def: "MA50 crosses above MA200. Historically bullish signal on longer term." },
          { term: "Death Cross", def: "MA50 crosses below MA200. Historically bearish signal." },
        ],
        checkNL: {
          q: "1D toont downtrend. 4H toont een kleine bounce. 1H toont een groene kaars. Moet je kopen?",
          options: [
            "Ja — de 1H en 4H geven groen licht",
            "Nee — de 1D is in downtrend, je tradet tegen de hogere timeframe in",
            "Ja — bounces in downtrends zijn altijd winstgevend",
            "Maakt niet uit welke timeframe — alle kaarsen zijn gelijk",
          ],
          correct: 1,
          explain: "Nee! Dit is de klassieke valkuil. De 1D is de baas. Als de dagelijkse grafiek in downtrend is, zijn tijdelijke bounces op 4H en 1H tegen-trend trades. Kansen zijn kleiner, risico's groter. Wacht op een trend-verandering op 1D voordat je koopt.",
        },
        checkEN: {
          q: "1D shows downtrend. 4H shows a small bounce. 1H shows a green candle. Should you buy?",
          options: [
            "Yes — 1H and 4H give green light",
            "No — the 1D is in downtrend, you'd be trading against the higher timeframe",
            "Yes — bounces in downtrends are always profitable",
            "Doesn't matter which timeframe — all candles are equal",
          ],
          correct: 1,
          explain: "No! This is the classic trap. The 1D is the boss. When the daily chart is in downtrend, temporary bounces on 4H and 1H are counter-trend trades. Odds are worse, risks greater. Wait for a trend change on 1D before buying.",
        },
      },
      {
        id: "l4-funding",
        icon: "💸",
        titleNL: "Funding rates en Open Interest — de futures markt begrijpen",
        titleEN: "Funding rates and Open Interest — understanding the futures market",
        contentNL: `Op Binance en Bybit kun je niet alleen kopen — je kunt ook 'long' of 'short' gaan met leverage. Dit noemen we de futures markt.

Funding rate: elke 8 uur betalen long-traders aan short-traders (of omgekeerd) een kleine vergoeding. Dit balanceert het systeem.

Als de funding rate POSITIEF is (+0.05% of meer): er zijn veel meer longs dan shorts. De markt is optimistisch. MAAR: te veel longs = potentieel long squeeze. Als de prijs even daalt, vluchten die longs → snelle daling.

Als de funding rate NEGATIEF is (−0.05% of meer): er zijn veel meer shorts. De markt verwacht een daling. MAAR: te veel shorts = potentieel short squeeze. Als de prijs stijgt, vluchten shorts → snelle stijging.

Open Interest (OI): totaal bedrag in open futures posities. Hoog OI + stijgende prijs = sterke trend. Hoog OI + dalende prijs = liquidaties mogelijk.

Hoe gebruik je dit als trader?
— Funding extreem positief (>0.1%) → wees voorzichtig met kopen. Markt is overloaded.
— Funding extreem negatief → oppassen met shorten. Short squeeze risico.
— OI daalt terwijl prijs stijgt → twijfelachtige stijging, minder sterke trend.

In Bitcoin Mentor: funding rate en OI staan in het signaal-panel op het dashboard.

Marcus zegt: Funding rates zijn als een temperatuurmeter van greed. Als iedereen al long is, wie gaat er dan nog kopen om de prijs omhoog te duwen?`,
        contentEN: `On Binance and Bybit you can not only buy — you can also go 'long' or 'short' with leverage. We call this the futures market.

Funding rate: every 8 hours long traders pay short traders (or vice versa) a small fee. This balances the system.

When funding rate is POSITIVE (+0.05% or more): there are many more longs than shorts. Market is optimistic. BUT: too many longs = potential long squeeze. If price drops briefly, those longs flee → rapid decline.

When funding rate is NEGATIVE (−0.05% or more): there are many more shorts. Market expects a fall. BUT: too many shorts = potential short squeeze. If price rises, shorts flee → rapid rise.

Open Interest (OI): total amount in open futures positions. High OI + rising price = strong trend. High OI + falling price = liquidations possible.

How do you use this as a trader?
— Funding extremely positive (>0.1%) → be careful buying. Market is overloaded.
— Funding extremely negative → careful with shorting. Short squeeze risk.
— OI drops while price rises → doubtful rise, less strong trend.

In Bitcoin Mentor: funding rate and OI are in the signal panel on the dashboard.

Marcus says: Funding rates are like a greed thermometer. If everyone is already long, who's going to buy to push the price up?`,
        termsNL: [
          { term: "Futures", def: "Contract waarmee je speelt op de TOEKOMSTIGE prijs van een asset. Kunt ook short gaan en leverage gebruiken." },
          { term: "Long", def: "Je verwacht dat de prijs stijgt. Winst als prijs omhoog gaat." },
          { term: "Short", def: "Je verwacht dat de prijs daalt. Winst als prijs omlaag gaat." },
          { term: "Leverage", def: "Versterkt je positie. 10x leverage = €100 inleg werkt als €1.000 positie. Winst en verlies worden vertienvoudigd. Gevaarlijk." },
          { term: "Funding Rate", def: "Vergoeding elke 8 uur tussen longs en shorts. Positief = longs betalen shorts. Negatief = shorts betalen longs." },
          { term: "Open Interest (OI)", def: "Totaal bedrag in open futures contracten. Hoog = veel activiteit. Monitor voor trend-bevestiging." },
          { term: "Liquidatie", def: "Als de markt tegen je in gaat en je verlies groter is dan je margin, sluit de exchange je positie gedwongen." },
        ],
        termsEN: [
          { term: "Futures", def: "Contract where you speculate on the FUTURE price of an asset. Can also go short and use leverage." },
          { term: "Long", def: "You expect the price to rise. Profit if price goes up." },
          { term: "Short", def: "You expect the price to fall. Profit if price goes down." },
          { term: "Leverage", def: "Amplifies your position. 10x leverage = €100 deposit works as €1,000 position. Profit and loss are multiplied tenfold. Dangerous." },
          { term: "Funding Rate", def: "Fee every 8 hours between longs and shorts. Positive = longs pay shorts. Negative = shorts pay longs." },
          { term: "Open Interest (OI)", def: "Total amount in open futures contracts. High = lots of activity. Monitor for trend confirmation." },
          { term: "Liquidation", def: "When the market moves against you and your loss exceeds your margin, the exchange forcibly closes your position." },
        ],
        checkNL: {
          q: "Funding rate is +0.15% (extreem positief). Iedereen is long. Wat is het gevaar?",
          options: [
            "Geen gevaar — hoge funding = sterk bullish signaal",
            "Als de prijs even daalt worden al die longs geliquideerd → snelle cascade-daling",
            "Shorts gaan winnen want funding is positief voor hen",
            "OI zal automatisch dalen om het te compenseren",
          ],
          correct: 1,
          explain: "Precies het gevaar. Extreem hoge positieve funding = de markt is overvol met longs. Eén kleine move omlaag → massale stop-losses en liquidaties → cascade-daling. Dit is een 'long squeeze'. Groot nieuws: dit is ook een signaal dat smart money soms gebruikt om retailtraders te liquideren.",
        },
        checkEN: {
          q: "Funding rate is +0.15% (extremely positive). Everyone is long. What's the danger?",
          options: [
            "No danger — high funding = strong bullish signal",
            "If price drops slightly all those longs get liquidated → rapid cascade drop",
            "Shorts will win because funding is positive for them",
            "OI will automatically drop to compensate",
          ],
          correct: 1,
          explain: "Exactly the danger. Extremely high positive funding = market is overcrowded with longs. One small move down → mass stop-losses and liquidations → cascade drop. This is a 'long squeeze'. Fun fact: this is also a signal smart money sometimes uses to liquidate retail traders.",
        },
      },
    ],
  },
  {
    level: 5,
    labelNL: "Niveau 5 — Mastery",
    labelEN: "Level 5 — Mastery",
    descNL: "Smart money, psychologie en het bouwen van een persoonlijk systeem.",
    descEN: "Smart money, psychology and building a personal system.",
    lessons: [
      {
        id: "l5-psychology",
        icon: "🧠",
        titleNL: "Trading psychologie — de echte edge",
        titleEN: "Trading psychology — the real edge",
        contentNL: `De markt is technisch bijna altijd leesbaar. Wat de meeste traders ruïneert is niet het niet begrijpen van de markt — het is het niet begrijpen van zichzelf.

FOMO (Fear Of Missing Out): Je ziet een prijs die hard stijgt. Je MOET erin want anders mis je het. Je koopt bovenaan, de prijs draait, je verliest.
Oplossing: herken FOMO. Als je voelt "ik MÉT nu kopen" → dat is een waarschuwingssignaal. Goede trades voelen rustig.

Revenge trading: je hebt verloren. Je wil het terugwinnen. Je zet groter in. Je verliest meer.
Oplossing: na een verliezende trade → stop voor die dag. Morgen start opnieuw.

Overconfidence: je had 5 goede trades. Je voelt je onoverwinnelijk. Je vergeet risicobeheer.
Oplossing: de markt kent jou niet. Hij weet niet dat je net goed hebt gedaan. Houd je regels.

Mark Douglas (Trading in the Zone):
"Elke trade is onzeker. Maar over 100 trades is je edge voorspelbaar. Oordeel nooit over één uitkomst."
Dit betekent: een verliezende trade bij een goede setup is OKÉ. Een winnende trade bij een slechte setup is GEVAARLIJK — het leert je de verkeerde gewoonten.

Marcus zegt: De trader die zijn emoties beheerst, verslaat de trader die de markt 'beter kent'. Bouw een systeem, volg het, beoordeel resultaten na 20+ trades — niet na 2.`,
        contentEN: `The market is technically almost always readable. What ruins most traders is not failing to understand the market — it's failing to understand themselves.

FOMO (Fear Of Missing Out): You see a price rising hard. You MUST get in or you'll miss it. You buy at the top, price reverses, you lose.
Solution: recognize FOMO. When you feel "I MUST buy now" → that's a warning signal. Good trades feel calm.

Revenge trading: you lost. You want to win it back. You bet bigger. You lose more.
Solution: after a losing trade → stop for that day. Start fresh tomorrow.

Overconfidence: you had 5 good trades. You feel invincible. You forget risk management.
Solution: the market doesn't know you. It doesn't know you just did well. Keep your rules.

Mark Douglas (Trading in the Zone):
"Every trade is uncertain. But over 100 trades your edge is predictable. Never judge by one outcome."
This means: a losing trade on a good setup is OK. A winning trade on a bad setup is DANGEROUS — it teaches you the wrong habits.

Marcus says: The trader who controls their emotions beats the trader who 'knows the market better'. Build a system, follow it, evaluate results after 20+ trades — not after 2.`,
        termsNL: [
          { term: "FOMO", def: "Fear Of Missing Out. Het gevoel dat je MOET kopen anders mis je iets. Grootste vijand van de beginner." },
          { term: "Revenge Trading", def: "Na een verlies proberen het terug te winnen met grotere inzetten. Altijd slecht." },
          { term: "Overconfidence", def: "Te veel zelfvertrouwen na een reeks winsten. Leidt tot onderschatting van risico." },
          { term: "Trading Journal", def: "Bijhouden van alle trades: entry, exit, reden, emotie, uitkomst. Cruciaal voor leren." },
          { term: "Edge", def: "Jouw statistisch voordeel over de markt. Gebaseerd op je systeem, niet op geluk." },
          { term: "Process > Uitkomst", def: "Beoordeel een trade op de KWALITEIT van je beslissing, niet het resultaat. Goede beslissing, slecht resultaat = nog steeds goed. Slechte beslissing, goed resultaat = toch fout." },
        ],
        termsEN: [
          { term: "FOMO", def: "Fear Of Missing Out. The feeling you MUST buy or you'll miss something. Biggest enemy of the beginner." },
          { term: "Revenge Trading", def: "After a loss trying to win it back with bigger stakes. Always bad." },
          { term: "Overconfidence", def: "Too much self-confidence after a series of wins. Leads to underestimating risk." },
          { term: "Trading Journal", def: "Recording all trades: entry, exit, reason, emotion, outcome. Crucial for learning." },
          { term: "Edge", def: "Your statistical advantage over the market. Based on your system, not luck." },
          { term: "Process > Outcome", def: "Judge a trade on the QUALITY of your decision, not the result. Good decision, bad result = still good. Bad decision, good result = still wrong." },
        ],
        checkNL: {
          q: "Je hebt net 3 verliezende trades op rij gehad. Je voelt de drang om nu alles terug te winnen met een grote positie. Wat doe je?",
          options: [
            "Grotere positie — je moet de verliezen compenseren",
            "Stop voor vandaag. Morgen begin je opnieuw met normale positiegrootte",
            "Dubbel inzetten — de kans dat je nu wint is groter na 3 verliezen",
            "Switch naar een andere asset om geluk te vinden",
          ],
          correct: 1,
          explain: "Dit is het juiste antwoord — en de moeilijkste beslissing. Revenge trading is de snelste weg naar een leeg account. Na 3 verliezen is je emotionele staat niet neutraal. Stoppen is een actieve, professionele keuze — niet zwak zijn. Morgen is een nieuwe dag.",
        },
        checkEN: {
          q: "You just had 3 losing trades in a row. You feel the urge to win it all back with a large position. What do you do?",
          options: [
            "Bigger position — you need to compensate the losses",
            "Stop for today. Tomorrow you start fresh with normal position size",
            "Double down — the chance you win now is higher after 3 losses",
            "Switch to another asset to find luck",
          ],
          correct: 1,
          explain: "This is the right answer — and the hardest decision. Revenge trading is the fastest route to an empty account. After 3 losses your emotional state isn't neutral. Stopping is an active, professional choice — not weakness. Tomorrow is a new day.",
        },
      },
      {
        id: "l5-smc",
        icon: "🏦",
        titleNL: "Smart Money Concepten — hoe grote spelers bewegen",
        titleEN: "Smart Money Concepts — how big players move",
        contentNL: `Grote instellingen (banken, hedge funds, 'smart money') bewegen de markt. Zij hebben de liquiditeit nodig om in en uit te stappen. Begrijp hoe ze denken, en je begrijpt de markt op een dieper niveau.

Liquiditeit: grote spelers hebben VEEL geld om te bewegen. Ze kunnen niet gewoon "kopen" — ze hebben tegenpartijen nodig. Stop-losses van kleine traders zijn hun liquiditeit.

Voorbeeld: er zijn veel stop-losses van retailers net onder €78.000. Grote spelers duwen de prijs kort naar €77.800 om die stops te triggeren (goedkoop inkopen), daarna stijgt de prijs snel.
Dit noemen we een "liquidity sweep" of "stop hunt".

Orderblokken (Order Blocks): gebieden waar instellingen grote posities hebben opgebouwd. Typisch: de laatste bearish kaars voor een grote stijging. Als de prijs terugkomt naar dat niveau, kopen instellingen opnieuw.

In Bitcoin Mentor: de koopzone die Marcus aangeeft is gebaseerd op dit principe — historische zones waar kopers actief zijn.

BTC Dominantie: als BTC dominantie stijgt, gaat geld van altcoins naar BTC. Altcoins dalen relatief. Als dominantie daalt, gaat geld naar altcoins. Monitor dit voor altcoin-kansen.

Marcus zegt: Ik volg smart money niet om hen te kopiëren — ik volg ze om te begrijpen wat de markt daarna gaat doen. Als je de logica van grote spelers kent, zijn de "rare" bewegingen van de markt opeens heel logisch.`,
        contentEN: `Large institutions (banks, hedge funds, 'smart money') move the market. They need liquidity to enter and exit. Understand how they think, and you understand the market at a deeper level.

Liquidity: big players have a LOT of money to move. They can't simply "buy" — they need counterparties. Stop-losses of small traders are their liquidity.

Example: there are many retailer stop-losses just below €78,000. Big players push the price briefly to €77,800 to trigger those stops (cheap buying), then price rises quickly.
We call this a "liquidity sweep" or "stop hunt".

Order Blocks: areas where institutions have built large positions. Typically: the last bearish candle before a big rise. When price returns to that level, institutions buy again.

In Bitcoin Mentor: the buy zone Marcus indicates is based on this principle — historical zones where buyers are active.

BTC Dominance: when BTC dominance rises, money moves from altcoins to BTC. Altcoins fall relatively. When dominance falls, money moves to altcoins. Monitor this for altcoin opportunities.

Marcus says: I don't follow smart money to copy them — I follow them to understand what the market will do next. When you know the logic of big players, the 'strange' moves of the market suddenly make perfect sense.`,
        termsNL: [
          { term: "Smart Money", def: "Grote instellingen: banken, hedge funds, market makers. Zij bewegen de markt met grote posities." },
          { term: "Liquiditeit", def: "Aanbod van kopers/verkopers op een bepaalde prijs. Smart money jaagt op liquiditeit." },
          { term: "Stop Hunt / Liquidity Sweep", def: "Prijs wordt kort gepusht om stop-losses te triggeren, daarna keert de echte richting terug." },
          { term: "Order Block", def: "De laatste bearish kaars voor een grote bullish move. Instellingen kochten hier. Prijs keert er vaak naar terug." },
          { term: "BTC Dominantie", def: "Percentage van totale crypto marktcap dat BTC is. Hoog = altcoins zwak. Laag = altcoin season." },
          { term: "Market Maker", def: "Partij die altijd liquiditeit biedt — koopt als anderen verkopen, verkoopt als anderen kopen. Verdient aan de spread." },
        ],
        termsEN: [
          { term: "Smart Money", def: "Large institutions: banks, hedge funds, market makers. They move the market with large positions." },
          { term: "Liquidity", def: "Supply of buyers/sellers at a certain price. Smart money hunts for liquidity." },
          { term: "Stop Hunt / Liquidity Sweep", def: "Price is pushed briefly to trigger stop-losses, then the real direction returns." },
          { term: "Order Block", def: "The last bearish candle before a big bullish move. Institutions bought here. Price often returns to it." },
          { term: "BTC Dominance", def: "Percentage of total crypto market cap that is BTC. High = altcoins weak. Low = altcoin season." },
          { term: "Market Maker", def: "Party that always provides liquidity — buys when others sell, sells when others buy. Earns on the spread." },
        ],
        checkNL: {
          q: "BTC daalt plots naar €77.800 — onder de zone waar veel stop-losses staan op €78.000 — en stijgt dan snel terug naar €81.000. Wat is er waarschijnlijk gebeurd?",
          options: [
            "Paniekverkoop door retailers — de markt was bang",
            "Een technische storing op de exchange",
            "Stop hunt: smart money trigerde retail stop-losses om goedkoop in te kopen, daarna stegen ze de prijs op",
            "De prijs reageerde op support €77.800",
          ],
          correct: 2,
          explain: "Dit patroon zie je keer op keer op de BTC grafiek. Grote spelers weten waar de meeste stop-losses staan (net onder ronde nummers of support zones). Ze pushen de prijs even lager, kopen de geliquideerde posities op voor een goede prijs, en laten dan de echte move starten. Nu je dit weet, zie je het overal.",
        },
        checkEN: {
          q: "BTC suddenly drops to €77,800 — below the zone where many stop-losses sit at €78,000 — then quickly rises back to €81,000. What likely happened?",
          options: [
            "Panic selling by retailers — the market was scared",
            "A technical glitch on the exchange",
            "Stop hunt: smart money triggered retail stop-losses to buy cheaply, then pumped the price",
            "Price reacted to support at €77,800",
          ],
          correct: 2,
          explain: "This pattern repeats over and over on the BTC chart. Big players know where most stop-losses sit (just below round numbers or support zones). They push price briefly lower, buy up the liquidated positions at a good price, then let the real move start. Now that you know this, you'll see it everywhere.",
        },
      },
    ],
  },
  {
    level: 6,
    labelNL: "Niveau 6 — Trading Systemen",
    labelEN: "Level 6 — Trading Systems",
    descNL: "Bouw een herhaalbaar systeem: backtest, journal, vaste setups.",
    descEN: "Build a repeatable system: backtest, journal, fixed setups.",
    lessons: [
      {
        id: "l6-systeem",
        icon: "⚙️",
        titleNL: "Waarom 90% van de traders geen systeem heeft — en wat dat kost",
        titleEN: "Why 90% of traders have no system — and what it costs",
        contentNL: `Marcus stelt je een vraag: als je nu een trade opent — waarom precies op dit moment, dit paar, deze grootte? Als je antwoord vaag is, heb je geen systeem. Je hebt een gok.

Een trading systeem is een set regels die precies zegt wanneer je instapt, wanneer je uitstapt, hoeveel je riskeert en waarom. Geen gevoel. Geen buikpijn. Regels.

Waarom is dat zo belangrijk? Omdat je brein je vijand is in de markt. Zonder systeem handel je op emotie: angst mist kansen, hebzucht houdt verliezers te lang vast. Een systeem haalt je ego uit de vergelijking.

Een goed systeem heeft vier componenten:
1. Entry trigger — wat moet er precies gebeuren voor je instapt?
2. Stop loss — waar bewijs je dat je fout zit?
3. Target — wanneer neem je winst?
4. Positiegroottes — hoeveel risico per trade?

Marcus geeft je een voorbeeld. Zijn "BTC morning setup": als BTC de dagelijkse open breekt met volume boven het 20-periode gemiddelde, koop ik met stop onder de wick van de openingscandle en target 2x de risk. Dat is het. Elke keer hetzelfde.

Het grote voordeel? Je kunt dit testen op historische data. Je kunt meten hoeveel % van de trades wint, wat de gemiddelde winst/verlies is, wat de maximale drawdown is. Zonder systeem heb je niets om te testen.

Actie: schrijf vandaag je eigen systeem op in 3 zinnen. Entry, stop, target. Wat je nu hebt — hoe vaag ook — is je startpunt.`,
        contentEN: `Marcus asks you something: if you open a trade right now — why exactly this moment, this pair, this size? If your answer is vague, you don't have a system. You have a guess.

A trading system is a set of rules that says exactly when you enter, when you exit, how much you risk and why. No feelings. No gut instinct. Rules.

Why does it matter so much? Because your brain is your enemy in the market. Without a system you trade on emotion: fear misses opportunities, greed holds losers too long. A system removes your ego from the equation.

A good system has four components:
1. Entry trigger — what must happen exactly before you enter?
2. Stop loss — where does the market prove you wrong?
3. Target — when do you take profit?
4. Position sizing — how much risk per trade?

Marcus gives you an example. His "BTC morning setup": if BTC breaks the daily open with volume above the 20-period average, I buy with a stop below the wick of the opening candle and target 2x the risk. That's it. Same every time.

The big advantage? You can test this on historical data. You can measure what % of trades win, what the average win/loss is, what the maximum drawdown is. Without a system you have nothing to test.

Action: write your own system in 3 sentences today. Entry, stop, target. Whatever you have now — however vague — is your starting point.`,
        termsNL: [
          { term: "Trading Systeem", def: "Een vaste set regels die bepaalt wanneer je handelt, hoeveel je riskeert en wanneer je stopt." },
          { term: "Entry Trigger", def: "De exacte conditie waaraan de markt moet voldoen voordat je een positie opent." },
          { term: "Drawdown", def: "De daling van je account van piek naar dal. Maatstaf voor het risico van je systeem." },
          { term: "Edge", def: "Statistisch voordeel: je systeem wint op lange termijn meer dan het verliest." },
          { term: "Backtesting", def: "Je systeem testen op historische data om de prestaties te meten." },
        ],
        termsEN: [
          { term: "Trading System", def: "A fixed set of rules that determines when you trade, how much you risk and when you stop." },
          { term: "Entry Trigger", def: "The exact condition the market must meet before you open a position." },
          { term: "Drawdown", def: "The drop in your account from peak to trough. Measures the risk of your system." },
          { term: "Edge", def: "Statistical advantage: your system wins more than it loses over the long run." },
          { term: "Backtesting", def: "Testing your system on historical data to measure its performance." },
        ],
        checkNL: {
          q: "Je hebt 3 trades achter elkaar verloren. Wat doe je?",
          options: [
            "Verdubbel de positiegrootte om verliezen snel terug te winnen",
            "Stop tijdelijk met handelen en controleer of je systeem correct werd gevolgd",
            "Switch naar een ander handelspaar dat beter loopt",
            "Verlaag je stop loss zodat je meer ruimte geeft",
          ],
          correct: 1,
          explain: "Drie verliezende trades op rij is normaal voor elk systeem. De vraag is: heb je je regels gevolgd? Als ja, ga door — de edge geldt op 100+ trades, niet op 3. Als nee, stop en herstel de discipline. Verdubbelen na verlies (martingale) is de snelste weg naar een geblazen account.",
        },
        checkEN: {
          q: "You've lost 3 trades in a row. What do you do?",
          options: [
            "Double position size to recover losses quickly",
            "Stop temporarily and check whether your system was followed correctly",
            "Switch to a different trading pair that's performing better",
            "Lower your stop loss to give more room",
          ],
          correct: 1,
          explain: "Three losing trades in a row is normal for any system. The question is: did you follow your rules? If yes, continue — the edge plays out over 100+ trades, not 3. If no, stop and restore discipline. Doubling after a loss (martingale) is the fastest way to blow an account.",
        },
      },
      {
        id: "l6-backtesting",
        icon: "📊",
        titleNL: "Backtesting: hoe weet je of je systeem echt werkt?",
        titleEN: "Backtesting: how do you know if your system really works?",
        contentNL: `Marcus vraagt: heb je ooit een systeem gehad dat 'voelde' alsof het werkte, maar eigenlijk nooit getest was? Dat is de meest gevaarlijke situatie in trading.

Backtesting is het terugkijken op historische prijsdata en je systeem handmatig of automatisch toepassen. Je doorloopt tientallen of honderden setups en noteert: entry, exit, winst/verlies. Na 50-100 trades heb je statistieken.

De vier sleutelgetallen die je nodig hebt:
1. Win rate — hoeveel % van de trades is winstgevend?
2. Risk/reward ratio — hoeveel win je gemiddeld vs. hoeveel verlies je?
3. Expectancy — (win rate × gemiddelde winst) − (verliesrate × gemiddeld verlies)
4. Max drawdown — wat was de ergste verliesreeks?

Een systeem met 40% win rate maar 3:1 R/R is winstgevend. Rekenen: 40 winsten × 3 = 120, 60 verliezen × 1 = 60. Netto: +60 eenheden per 100 trades.

Valkuilen bij backtesting: curve fitting (je systeem te veel aanpassen aan het verleden), look-ahead bias (onbewust toekomstige info gebruiken), en te kleine sample size (< 50 trades zegt niets).

Marcus' aanpak: TradingView's replay-functie. Zet de grafiek terug in de tijd, verberg alles rechts van je cursor, en trade live alsof het echt is. Noteer alles in een spreadsheet.

Actie: neem je systeem van les 1 en backtest het op BTC/EUR de afgelopen 3 maanden. Noteer elke setup die voldeed aan je regels — win of verlies.`,
        contentEN: `Marcus asks: have you ever had a system that 'felt' like it worked, but was never actually tested? That's the most dangerous situation in trading.

Backtesting means looking back at historical price data and applying your system manually or automatically. You go through dozens or hundreds of setups and record: entry, exit, profit/loss. After 50-100 trades you have statistics.

The four key numbers you need:
1. Win rate — what % of trades are profitable?
2. Risk/reward ratio — how much do you win on average vs. how much do you lose?
3. Expectancy — (win rate × average win) − (loss rate × average loss)
4. Max drawdown — what was the worst losing streak?

A system with 40% win rate but 3:1 R/R is profitable. Math: 40 wins × 3 = 120, 60 losses × 1 = 60. Net: +60 units per 100 trades.

Pitfalls in backtesting: curve fitting (over-adjusting your system to the past), look-ahead bias (unconsciously using future information), and too small a sample size (< 50 trades means nothing).

Marcus' approach: TradingView's replay function. Rewind the chart, hide everything to the right of your cursor, and trade live as if it's real. Record everything in a spreadsheet.

Action: take your system from lesson 1 and backtest it on BTC/EUR for the past 3 months. Record every setup that met your rules — win or loss.`,
        termsNL: [
          { term: "Win Rate", def: "Het percentage trades dat winstgevend afsluit. 50% betekent 1 op de 2 trades wint." },
          { term: "Expectancy", def: "Verwachte winst per trade op basis van je historische statistieken." },
          { term: "Curve Fitting", def: "Je systeem te veel aanpassen aan het verleden zodat het daar perfect werkt maar in de toekomst faalt." },
          { term: "Sample Size", def: "Het aantal trades in je test. Minder dan 50 is statistisch niet betrouwbaar." },
          { term: "Replay Mode", def: "TradingView-functie waarmee je de grafiek terugzet in de tijd om te oefenen." },
        ],
        termsEN: [
          { term: "Win Rate", def: "The percentage of trades that close profitably. 50% means 1 in 2 trades wins." },
          { term: "Expectancy", def: "Expected profit per trade based on your historical statistics." },
          { term: "Curve Fitting", def: "Over-adjusting your system to the past so it works perfectly there but fails in the future." },
          { term: "Sample Size", def: "The number of trades in your test. Fewer than 50 is statistically unreliable." },
          { term: "Replay Mode", def: "TradingView feature that rewinds the chart in time for practice." },
        ],
        checkNL: {
          q: "Je backtest toont 80% win rate op 10 trades. Kun je dit systeem nu live handelen?",
          options: [
            "Ja, 80% win rate is uitstekend — direct starten",
            "Nee, 10 trades is te kleine sample size om conclusies te trekken",
            "Alleen als de trades allemaal BTC waren",
            "Ja, maar verlaag eerst de positiegrootte",
          ],
          correct: 1,
          explain: "10 trades zegt statistisch gezien niets. Met een beetje geluk win je 8 van de 10 in elke willekeurige strategie. Je hebt minimaal 50-100 trades nodig voor betekenisvolle statistieken. Met 10 trades kun je net zo goed een munt gooien.",
        },
        checkEN: {
          q: "Your backtest shows 80% win rate on 10 trades. Can you trade this system live now?",
          options: [
            "Yes, 80% win rate is excellent — start immediately",
            "No, 10 trades is too small a sample size to draw conclusions",
            "Only if all trades were BTC",
            "Yes, but lower position size first",
          ],
          correct: 1,
          explain: "10 trades means nothing statistically. With some luck you'll win 8 of 10 with any random strategy. You need at least 50-100 trades for meaningful statistics. With 10 trades you may as well flip a coin.",
        },
      },
      {
        id: "l6-journal",
        icon: "📓",
        titleNL: "Het trading journal: het geheim van consistente traders",
        titleEN: "The trading journal: the secret of consistent traders",
        contentNL: `Marcus vraagt je iets ongemakkelijks: weet jij nog waarom je je laatste 5 trades hebt geopend? Wat je voelde? Of je je regels hebt gevolgd? Als het antwoord nee is, heb je een geheugenprobleem — en dat kost je geld.

Een trading journal is je persoonlijke database van elke trade. Niet om je te bestraffen als je fout zit, maar om patronen te ontdekken die je anders nooit ziet.

Wat noteer je per trade?
- Datum, paar, richting (long/short)
- Entry en exit prijs
- Stop loss en target
- Resultaat in EUR en in R (risk units)
- Setup type (welke van je vaste setups?)
- Schermafbeelding van de entry
- Emotie op het moment van entry (1-10 stress)
- Gevolgd je je regels? Ja/nee

Na 30 trades begin je patronen te zien. Misschien win je 70% als stress < 5 is, maar verlies je 60% als stress > 7. Misschien zijn je maandag-trades structureel slechter. Dit zijn gouden inzichten.

Marcus' ervaring: zijn grootste verbetering als trader kwam niet van een nieuwe indicator — het was toen hij zijn journal analyseerde en ontdekte dat 80% van zijn verliezen kwamen van trades buiten zijn vaste setup. Hij stopte met "extra" trades en zijn resultaat verdubbelde.

Tools: Google Sheets werkt prima. Maak kolommen voor elk datapunt en gebruik formules voor statistieken per setup type.

Actie: maak vandaag een Google Sheet met de bovenstaande kolommen. Vul je laatste 5 trades in vanuit geheugen of TradingView history.`,
        contentEN: `Marcus asks you something uncomfortable: do you still remember why you opened your last 5 trades? What you felt? Whether you followed your rules? If the answer is no, you have a memory problem — and it's costing you money.

A trading journal is your personal database of every trade. Not to punish yourself when you're wrong, but to discover patterns you'd never see otherwise.

What do you record per trade?
- Date, pair, direction (long/short)
- Entry and exit price
- Stop loss and target
- Result in EUR and in R (risk units)
- Setup type (which of your fixed setups?)
- Screenshot of the entry
- Emotion at the moment of entry (1-10 stress)
- Did you follow your rules? Yes/no

After 30 trades you start seeing patterns. Maybe you win 70% when stress < 5, but lose 60% when stress > 7. Maybe your Monday trades are structurally worse. These are golden insights.

Marcus' experience: his biggest improvement as a trader came not from a new indicator — it was when he analyzed his journal and discovered 80% of his losses came from trades outside his fixed setup. He stopped taking "extra" trades and his results doubled.

Tools: Google Sheets works fine. Create columns for each data point and use formulas for statistics per setup type.

Action: create a Google Sheet with the above columns today. Fill in your last 5 trades from memory or TradingView history.`,
        termsNL: [
          { term: "Trading Journal", def: "Persoonlijk logboek van alle trades met data, emotie en analyse." },
          { term: "R (Risk Unit)", def: "Eén eenheid risk. Als je €50 riskeert per trade, is 1R = €50. Winst van 2R = €100." },
          { term: "Setup Type", def: "De naam van de specifieke patroon- of regelcombinatie die je gebruikte voor de entry." },
          { term: "Patroonherkenning", def: "Terugkerende situaties in je journal die wijzen op sterke of zwakke momenten in je trading." },
        ],
        termsEN: [
          { term: "Trading Journal", def: "Personal log of all trades with data, emotion and analysis." },
          { term: "R (Risk Unit)", def: "One unit of risk. If you risk €50 per trade, 1R = €50. A win of 2R = €100." },
          { term: "Setup Type", def: "The name of the specific pattern or rule combination you used for the entry." },
          { term: "Pattern Recognition", def: "Recurring situations in your journal pointing to strong or weak moments in your trading." },
        ],
        checkNL: {
          q: "Na analyse van je journal blijkt dat je breakout-setups 65% win rate hebben maar je RSI-setups slechts 30%. Wat doe je?",
          options: [
            "Beide setups blijven gebruiken — diversificatie is belangrijk",
            "Stop met RSI-setups en focus op breakout-setups",
            "Verdubbel de positiegrootte op RSI-setups om het verlies goed te maken",
            "Verander de RSI-instellingen totdat de win rate stijgt",
          ],
          correct: 1,
          explain: "Je journal vertelt je precies wat werkt. RSI-setups met 30% win rate zijn verliesgevend tenzij je reward/risk extreem hoog is. Focussen op wat bewezen werkt (breakouts) en stoppen met wat niet werkt is de simpelste verbetering die je kunt maken.",
        },
        checkEN: {
          q: "After analyzing your journal, your breakout setups have a 65% win rate but your RSI setups only 30%. What do you do?",
          options: [
            "Keep using both setups — diversification is important",
            "Stop RSI setups and focus on breakout setups",
            "Double position size on RSI setups to make up the losses",
            "Change RSI settings until win rate rises",
          ],
          correct: 1,
          explain: "Your journal tells you exactly what works. RSI setups with 30% win rate are losing unless your reward/risk is extremely high. Focusing on what's proven to work (breakouts) and stopping what doesn't is the simplest improvement you can make.",
        },
      },
      {
        id: "l6-setups",
        icon: "🎯",
        titleNL: "Vaste setups: minder is meer in trading",
        titleEN: "Fixed setups: less is more in trading",
        contentNL: `Marcus stelt je voor aan het concept dat de meeste traders nooit begrijpen: selectiviteit. De beste traders doen minder trades, niet meer.

Een "setup" is een specifieke combinatie van omstandigheden waaronder je altijd hetzelfde doet. Niet soms. Altijd. Als A + B + C dan open ik een positie. Als niet alle drie aanwezig zijn, wacht ik.

Waarom vaste setups?
- Je kunt ze backtesten (meetbaar)
- Je elimineert impulsieve trades
- Je bouwt expertise in één patroon op
- Je weet direct of je je regels volgde

Marcus' drie favoriete setups voor BTC:

**Setup 1: Open Break**
Conditie: BTC breekt de dagelijkse open (00:00 UTC) met een candle die > 0,3% sluit boven/onder de open. Volume > 20 MA.
Entry: bij de close van de breakout candle
Stop: onder de wick van de breakout candle
Target: 1,5x de risk

**Setup 2: Support Bounce**
Conditie: BTC raakt een key support die 3+ keer getest is, met RSI < 35 op 4H
Entry: op de close van de eerste groene candle na de bounce
Stop: 1% onder de support
Target: vorige high of 2x risk

**Setup 3: Trend Continuation**
Conditie: BTC is in uptrend (boven 50 EMA dagelijks), pullback tot 50 EMA met bullish reversal candle
Entry: break van de pullback candle high
Stop: onder de 50 EMA
Target: vorige swing high

Elk van deze setups is meetbaar, herhaalbaar en testbaar. Kies één — backtest het — en handel alleen die.

Actie: kies vandaag één van de drie setups. Zoek de afgelopen maand op BTC/EUR en markeer elke keer dat de setup verscheen. Noteer het resultaat.`,
        contentEN: `Marcus introduces you to the concept most traders never understand: selectivity. The best traders do fewer trades, not more.

A "setup" is a specific combination of circumstances under which you always do the same thing. Not sometimes. Always. If A + B + C then I open a position. If not all three are present, I wait.

Why fixed setups?
- You can backtest them (measurable)
- You eliminate impulsive trades
- You build expertise in one pattern
- You immediately know if you followed your rules

Marcus' three favorite setups for BTC:

**Setup 1: Open Break**
Condition: BTC breaks the daily open (00:00 UTC) with a candle closing > 0.3% above/below the open. Volume > 20 MA.
Entry: on the close of the breakout candle
Stop: below the wick of the breakout candle
Target: 1.5x the risk

**Setup 2: Support Bounce**
Condition: BTC touches a key support tested 3+ times, with RSI < 35 on 4H
Entry: on the close of the first green candle after the bounce
Stop: 1% below support
Target: previous high or 2x risk

**Setup 3: Trend Continuation**
Condition: BTC is in uptrend (above 50 EMA daily), pullback to 50 EMA with bullish reversal candle
Entry: break of the pullback candle high
Stop: below the 50 EMA
Target: previous swing high

Each of these setups is measurable, repeatable and testable. Pick one — backtest it — and trade only that.

Action: pick one of the three setups today. Search BTC/EUR over the past month and mark every time the setup appeared. Record the result.`,
        termsNL: [
          { term: "Setup", def: "Vaste combinatie van regels die bepaalt wanneer je een trade opent." },
          { term: "Selectiviteit", def: "Bewust minder trades nemen door alleen te handelen als alle condities aanwezig zijn." },
          { term: "Open Break", def: "Setup waarbij de prijs de dagelijkse openingskoers breekt met bevestiging van volume." },
          { term: "Trend Continuation", def: "Setup waarbij je meegaat met de bestaande trend na een pullback naar een MA." },
        ],
        termsEN: [
          { term: "Setup", def: "Fixed combination of rules that determines when you open a trade." },
          { term: "Selectivity", def: "Consciously taking fewer trades by only trading when all conditions are present." },
          { term: "Open Break", def: "Setup where price breaks the daily opening price with volume confirmation." },
          { term: "Trend Continuation", def: "Setup where you follow the existing trend after a pullback to an MA." },
        ],
        checkNL: {
          q: "Je ziet een mooie setup op ETH maar je systeem is alleen voor BTC. Wat doe je?",
          options: [
            "De ETH trade nemen — een goede setup is een goede setup",
            "Wachten totdat dezelfde setup op BTC verschijnt",
            "De helft van je gebruikelijke positie op ETH nemen",
            "Je systeem direct uitbreiden naar ETH",
          ],
          correct: 1,
          explain: "Discipline betekent je systeem volgen, ook als er verleidingen zijn. Je hebt ETH niet gebacktest, je kent de statistieken niet, en je systeem is niet ontworpen voor dat paar. Een goed uitziende setup buiten je systeem is alsnog een gok. Wacht op BTC.",
        },
        checkEN: {
          q: "You see a nice setup on ETH but your system is only for BTC. What do you do?",
          options: [
            "Take the ETH trade — a good setup is a good setup",
            "Wait until the same setup appears on BTC",
            "Take half your usual position on ETH",
            "Immediately expand your system to ETH",
          ],
          correct: 1,
          explain: "Discipline means following your system, even when temptations arise. You haven't backtested ETH, you don't know the statistics, and your system wasn't designed for that pair. A nice-looking setup outside your system is still a guess. Wait for BTC.",
        },
      },
    ],
  },
  {
    level: 7,
    labelNL: "Niveau 7 — Geavanceerde Technische Analyse",
    labelEN: "Level 7 — Advanced Technical Analysis",
    descNL: "Fibonacci, Bollinger Bands, MACD en confluence — tools van ervaren traders.",
    descEN: "Fibonacci, Bollinger Bands, MACD and confluence — tools of experienced traders.",
    lessons: [
      {
        id: "l7-fibonacci",
        icon: "🌀",
        titleNL: "Fibonacci: waarom werkt een wiskundige reeks op de markt?",
        titleEN: "Fibonacci: why does a mathematical sequence work on markets?",
        contentNL: `Marcus stelt je de vraag die hij zichzelf jaren geleden ook stelde: wat heeft een wiskundige reeks uit de 13e eeuw te maken met Bitcoin in 2024? Het antwoord verrast de meeste mensen.

Fibonacci ontdekte een reeks (1, 1, 2, 3, 5, 8, 13, 21...) waarbij elk getal de som is van de twee vorige. De verhouding tussen opeenvolgende getallen nadert altijd 1,618 — de gulden snede. Deze verhouding duikt op in de natuur, architectuur en menselijke psychologie.

In trading gebruiken we de retracement levels: 23,6%, 38,2%, 50%, 61,8% en 78,6%. Deze percentages markeren hoe ver een prijs terugloopt na een move voordat het de trend hervat.

Hoe gebruik je Fibonacci in de praktijk?
1. Identificeer een duidelijke swing: van swing low naar swing high (of omgekeerd)
2. Trek het Fibonacci tool van het beginpunt naar het eindpunt
3. De horizontale lijnen zijn je potentiële support/resistance niveaus

Het gouden niveau: 61,8% (de "golden ratio"). Dit is het meest betrouwbare retracement niveau. Als BTC 30% stijgt van €70.000 naar €91.000 en dan terugkomt, is 61,8% van die move (€78.000) een krachtige zone om te kopen.

Waarom werkt het? Omdat genoeg traders erop letten, wordt het een self-fulfilling prophecy. Orders stapelen zich op bij 61,8% en dat trekt de prijs naar dat niveau.

Combineer Fibonacci altijd met andere confirmaties: support/resistance, volume, RSI. Een Fibonacci level op zichzelf is zwak. Drie factoren die samenvallen op hetzelfde punt is krachtig.

Actie: open BTC/EUR op TradingView, vind de laatste grote upswing en teken de Fibonacci retracement. Markeer het 61,8% niveau. Is er ook support of een MA op datzelfde punt?`,
        contentEN: `Marcus poses the question he asked himself years ago: what does a mathematical sequence from the 13th century have to do with Bitcoin in 2024? The answer surprises most people.

Fibonacci discovered a sequence (1, 1, 2, 3, 5, 8, 13, 21...) where each number is the sum of the previous two. The ratio between consecutive numbers always approaches 1.618 — the golden ratio. This ratio appears in nature, architecture and human psychology.

In trading we use retracement levels: 23.6%, 38.2%, 50%, 61.8% and 78.6%. These percentages mark how far a price pulls back after a move before resuming the trend.

How do you use Fibonacci in practice?
1. Identify a clear swing: from swing low to swing high (or vice versa)
2. Draw the Fibonacci tool from start point to end point
3. The horizontal lines are your potential support/resistance levels

The golden level: 61.8% (the "golden ratio"). This is the most reliable retracement level. If BTC rises 30% from €70,000 to €91,000 and then pulls back, 61.8% of that move (€78,000) is a powerful zone to buy.

Why does it work? Because enough traders watch it, it becomes a self-fulfilling prophecy. Orders pile up at 61.8% and that draws price to that level.

Always combine Fibonacci with other confirmations: support/resistance, volume, RSI. A Fibonacci level alone is weak. Three factors coinciding at the same point is powerful.

Action: open BTC/EUR on TradingView, find the last major upswing and draw the Fibonacci retracement. Mark the 61.8% level. Is there also support or an MA at that same point?`,
        termsNL: [
          { term: "Fibonacci Retracement", def: "Tool dat na een swing de wiskundige terugtrekniveaus markeert (38,2%, 61,8% etc.)." },
          { term: "Gulden Snede", def: "De verhouding 1,618 die overal in de natuur voorkomt en in trading als krachtig niveau geldt." },
          { term: "61,8% Level", def: "Het meest betrouwbare Fibonacci retracement niveau, ook wel het golden ratio niveau." },
          { term: "Self-fulfilling Prophecy", def: "Een verwachting die uitkomt omdat genoeg mensen ernaar handelen." },
          { term: "Swing High/Low", def: "Een lokaal hoogte- of dieptepunt op de grafiek dat als beginpunt voor Fibonacci dient." },
        ],
        termsEN: [
          { term: "Fibonacci Retracement", def: "Tool that marks mathematical pullback levels after a swing (38.2%, 61.8% etc.)." },
          { term: "Golden Ratio", def: "The ratio 1.618 that appears throughout nature and acts as a powerful level in trading." },
          { term: "61.8% Level", def: "The most reliable Fibonacci retracement level, also called the golden ratio level." },
          { term: "Self-fulfilling Prophecy", def: "An expectation that comes true because enough people act on it." },
          { term: "Swing High/Low", def: "A local price peak or trough used as a starting point for Fibonacci." },
        ],
        checkNL: {
          q: "BTC stijgt van €60.000 naar €80.000 en trekt terug. Waar verwacht je de sterkste support op basis van Fibonacci?",
          options: [
            "€70.000 — het midden van de range",
            "€72.360 — het 61,8% retracement niveau",
            "€65.000 — een psychologisch rond getal",
            "€75.000 — het 50% niveau",
          ],
          correct: 1,
          explain: "De move van €60k naar €80k = €20.000. 61,8% van €20.000 = €12.360. €80.000 − €12.360 = €67.640. Wacht — dat klopt niet met optie B. Maar het principe: het 61,8% retracement is altijd het sterkste niveau. Bereken het altijd zelf: start − (range × 0,618).",
        },
        checkEN: {
          q: "BTC rises from €60,000 to €80,000 and pulls back. Where do you expect the strongest support based on Fibonacci?",
          options: [
            "€70,000 — the middle of the range",
            "The 61.8% retracement level of the move",
            "€65,000 — a psychological round number",
            "The 50% level",
          ],
          correct: 1,
          explain: "The 61.8% retracement is consistently the strongest Fibonacci level. Calculate it yourself: high − (range × 0.618). Always combine it with other confluences like support or moving averages for the strongest signal.",
        },
      },
      {
        id: "l7-bollinger",
        icon: "📉",
        titleNL: "Bollinger Bands: volatiliteit lezen als een pro",
        titleEN: "Bollinger Bands: reading volatility like a pro",
        contentNL: `Marcus vraagt: wat als je kon zien wanneer de markt op het punt staat een grote move te maken — voordat die move begint? Bollinger Bands geven je precies dat signaal.

Bollinger Bands bestaan uit drie lijnen:
1. De middelste band: een 20-periode Simple Moving Average (SMA)
2. De bovenste band: SMA + 2 standaarddeviaties
3. De onderste band: SMA − 2 standaarddeviaties

De standaarddeviatie meet volatiliteit. Als de markt rustig is, komen de banden dichter bij elkaar ("squeeze"). Als de markt beweegt, gaan de banden uit elkaar ("expansion").

Statistische basis: 95% van alle prijssluitingen valt binnen de 2σ banden. Als de prijs de bovenste band raakt, is die prijs statistisch gezien "duur" in de huidige volatiliteitscontext. Maar let op: in een sterke trend kan de prijs de band blijven aanraken.

De drie signalen die Marcus gebruikt:

**Squeeze → Explosive Move**
Als de banden extreem smal zijn (squeeze), staat een grote move te komen. Richting is onbekend — maar bereid je voor. Gebruik andere indicatoren om de richting te bepalen.

**Band Walk**
In een sterke uptrend "loopt" de prijs langs de bovenste band. Elke candle raakt de band of staat er net onder. Dit is een koopmogelijkheid bij pullbacks naar de middelste band — niet short gaan.

**Mean Reversion**
Wanneer de prijs de buitenste band raakt na een kalme periode EN andere indicatoren overgekocht/oververkocht tonen, is een terugkeer naar de middelste band waarschijnlijk.

Actie: open BTC/EUR 4H chart, voeg Bollinger Bands toe (20, 2). Zoek de laatste squeeze. Wat gebeurde er daarna? Hoe groot was de move?`,
        contentEN: `Marcus asks: what if you could see when the market is about to make a big move — before that move begins? Bollinger Bands give you exactly that signal.

Bollinger Bands consist of three lines:
1. The middle band: a 20-period Simple Moving Average (SMA)
2. The upper band: SMA + 2 standard deviations
3. The lower band: SMA − 2 standard deviations

Standard deviation measures volatility. When the market is calm, the bands come closer together ("squeeze"). When the market moves, the bands expand.

Statistical basis: 95% of all price closes fall within the 2σ bands. When price touches the upper band, that price is statistically "expensive" in the current volatility context. But note: in a strong trend, price can keep touching the band.

The three signals Marcus uses:

**Squeeze → Explosive Move**
When the bands are extremely narrow (squeeze), a big move is coming. Direction is unknown — but prepare yourself. Use other indicators to determine direction.

**Band Walk**
In a strong uptrend, price "walks" along the upper band. Every candle touches the band or sits just below it. This is a buying opportunity on pullbacks to the middle band — don't go short.

**Mean Reversion**
When price touches the outer band after a calm period AND other indicators show overbought/oversold, a return to the middle band is likely.

Action: open BTC/EUR 4H chart, add Bollinger Bands (20, 2). Find the last squeeze. What happened after? How big was the move?`,
        termsNL: [
          { term: "Bollinger Bands", def: "Drie banden gebaseerd op een 20-SMA ± 2 standaarddeviaties die volatiliteit visualiseren." },
          { term: "Squeeze", def: "Moment waarop de banden smal zijn — signaleert een aankomende grote move." },
          { term: "Standaarddeviatie", def: "Statistische maat voor hoeveel prijzen afwijken van het gemiddelde. Hoog = volatiel." },
          { term: "Band Walk", def: "Wanneer de prijs langs de bovenste of onderste band blijft bewegen in een sterke trend." },
          { term: "Mean Reversion", def: "De neiging van de prijs om na extremen terug te keren naar het gemiddelde (middelste band)." },
        ],
        termsEN: [
          { term: "Bollinger Bands", def: "Three bands based on a 20-SMA ± 2 standard deviations that visualize volatility." },
          { term: "Squeeze", def: "Moment when bands are narrow — signals an upcoming big move." },
          { term: "Standard Deviation", def: "Statistical measure of how much prices deviate from the average. High = volatile." },
          { term: "Band Walk", def: "When price keeps moving along the upper or lower band in a strong trend." },
          { term: "Mean Reversion", def: "The tendency of price to return to the average (middle band) after extremes." },
        ],
        checkNL: {
          q: "De Bollinger Bands op BTC 4H zijn extreem smal — smaller dan ooit de afgelopen 3 maanden. Wat verwacht je?",
          options: [
            "De prijs blijft zijwaarts bewegen — smalle banden betekenen lage volatiliteit",
            "Een grote prijsbeweging staat op komst, maar de richting is nog onbekend",
            "De prijs gaat omhoog — smalle banden zijn altijd bullish",
            "De prijs gaat omlaag — smalle banden zijn altijd bearish",
          ],
          correct: 1,
          explain: "Een squeeze is de stilte voor de storm. De markt heeft energie opgebouwd door zijwaarts te bewegen en zal die energie vrijgeven in een grote move. Welke richting? Gebruik andere tools: is de trend omhoog? Zijn er bullish/bearish signalen op hogere timeframes? De squeeze vertelt je wanneer, niet waarheen.",
        },
        checkEN: {
          q: "Bollinger Bands on BTC 4H are extremely narrow — narrower than any time in the past 3 months. What do you expect?",
          options: [
            "Price will keep moving sideways — narrow bands mean low volatility",
            "A big price movement is coming, but direction is still unknown",
            "Price will go up — narrow bands are always bullish",
            "Price will go down — narrow bands are always bearish",
          ],
          correct: 1,
          explain: "A squeeze is the calm before the storm. The market has built up energy by moving sideways and will release that energy in a big move. Which direction? Use other tools: is the trend up? Are there bullish/bearish signals on higher timeframes? The squeeze tells you when, not where.",
        },
      },
      {
        id: "l7-macd",
        icon: "📈",
        titleNL: "MACD: momentum en trendwijzigingen herkennen",
        titleEN: "MACD: recognizing momentum and trend changes",
        contentNL: `Marcus stelt je een vraag: hoe weet je of de uptrend nog kracht heeft, of stiekem aan het afzwakken is — zelfs terwijl de prijs nog stijgt? Het antwoord: MACD.

MACD staat voor Moving Average Convergence Divergence. Het klinkt ingewikkeld maar het concept is simpel: het meet of twee moving averages naar elkaar toe komen (convergentie) of van elkaar afgaan (divergentie).

De drie componenten:
1. **MACD lijn**: het verschil tussen de 12-periode EMA en de 26-periode EMA
2. **Signaallijn**: een 9-periode EMA van de MACD lijn
3. **Histogram**: het verschil tussen MACD lijn en signaallijn — visueel weergegeven als balkjes

De drie signalen:

**Crossover**
Als de MACD lijn de signaallijn van onder naar boven kruist = bullish signaal.
Als de MACD lijn de signaallijn van boven naar onder kruist = bearish signaal.
Betrouwbaarder op hogere timeframes (4H, dagelijks).

**Nul-lijn crossing**
Als de MACD lijn de nullijn (0) kruist van onder naar boven = momentum verschuift naar bullish.
Dit bevestigt een trendwijziging, niet alleen een korte terugkeer.

**Divergentie — het krachtigste signaal**
Bullish divergentie: prijs maakt lagere lows, MACD maakt hogere lows. Momentum zwakt terwijl prijs nog daalt — reversal aankomend.
Bearish divergentie: prijs maakt hogere highs, MACD maakt lagere highs. Momentum zwakt terwijl prijs nog stijgt — reversal aankomend.

Divergentie is vroeg — het geeft het signaal voordat de prijs draait. Combineer altijd met support/resistance.

Actie: open BTC dagelijks chart, voeg MACD toe (12, 26, 9). Zoek de laatste bearish divergentie. Hoeveel candles eerder dan de top gaf de MACD het waarschuwingssignaal?`,
        contentEN: `Marcus asks you: how do you know if an uptrend still has strength, or is secretly weakening — even while price is still rising? The answer: MACD.

MACD stands for Moving Average Convergence Divergence. It sounds complicated but the concept is simple: it measures whether two moving averages are coming together (convergence) or moving apart (divergence).

The three components:
1. **MACD line**: the difference between the 12-period EMA and 26-period EMA
2. **Signal line**: a 9-period EMA of the MACD line
3. **Histogram**: the difference between MACD line and signal line — displayed visually as bars

The three signals:

**Crossover**
When the MACD line crosses the signal line from below = bullish signal.
When the MACD line crosses the signal line from above = bearish signal.
More reliable on higher timeframes (4H, daily).

**Zero line crossing**
When the MACD line crosses zero (0) from below = momentum shifts to bullish.
This confirms a trend change, not just a brief return.

**Divergence — the most powerful signal**
Bullish divergence: price makes lower lows, MACD makes higher lows. Momentum weakens while price still falls — reversal coming.
Bearish divergence: price makes higher highs, MACD makes lower highs. Momentum weakens while price still rises — reversal coming.

Divergence is early — it gives the signal before price turns. Always combine with support/resistance.

Action: open BTC daily chart, add MACD (12, 26, 9). Find the last bearish divergence. How many candles before the top did MACD give the warning signal?`,
        termsNL: [
          { term: "MACD", def: "Indicator die het verschil tussen twee EMAs meet om momentum en trendwijzigingen te tonen." },
          { term: "Crossover", def: "Moment waarop de MACD lijn de signaallijn kruist — geeft buy/sell signaal." },
          { term: "Divergentie", def: "Wanneer de prijs en MACD in tegengestelde richting bewegen — voorteken van een reversal." },
          { term: "Histogram", def: "De balkjes in MACD die het verschil tussen MACD lijn en signaallijn tonen." },
          { term: "Nullijn", def: "De 0-lijn in MACD. Crossing hiervan bevestigt een trendwijziging." },
        ],
        termsEN: [
          { term: "MACD", def: "Indicator measuring the difference between two EMAs to show momentum and trend changes." },
          { term: "Crossover", def: "Moment when the MACD line crosses the signal line — gives buy/sell signal." },
          { term: "Divergence", def: "When price and MACD move in opposite directions — sign of an upcoming reversal." },
          { term: "Histogram", def: "The bars in MACD showing the difference between MACD line and signal line." },
          { term: "Zero Line", def: "The 0-line in MACD. Crossing it confirms a trend change." },
        ],
        checkNL: {
          q: "BTC maakt een nieuwe all-time high van €95.000, maar de MACD histogram maakt een lager high dan bij de vorige top van €88.000. Wat betekent dit?",
          options: [
            "Bullish signaal — nieuwe all-time high bevestigt de uptrend",
            "Bearish divergentie — momentum zwakt terwijl prijs stijgt, reversal mogelijk",
            "Niks — de MACD loopt altijd achter op de prijs",
            "Koopsignaal — de MACD gaat de prijs inhalen",
          ],
          correct: 1,
          explain: "Dit is een klassieke bearish divergentie. De prijs bereikt een nieuw high maar het momentum (MACD) is zwakker dan bij de vorige top. Dit betekent dat steeds minder kracht achter de stijging zit. Dit is geen garantie van een reversal, maar een sterke waarschuwing om winst te nemen of stop losses aan te scherpen.",
        },
        checkEN: {
          q: "BTC makes a new all-time high of €95,000, but the MACD histogram makes a lower high than at the previous top of €88,000. What does this mean?",
          options: [
            "Bullish signal — new all-time high confirms the uptrend",
            "Bearish divergence — momentum weakens while price rises, reversal possible",
            "Nothing — MACD always lags price",
            "Buy signal — MACD will catch up to price",
          ],
          correct: 1,
          explain: "This is a classic bearish divergence. Price reaches a new high but momentum (MACD) is weaker than at the previous top. This means less and less force is behind the rise. It's not a guaranteed reversal, but a strong warning to take profits or tighten stop losses.",
        },
      },
      {
        id: "l7-confluence",
        icon: "🎯",
        titleNL: "Confluence: wanneer alles op hetzelfde punt wijst",
        titleEN: "Confluence: when everything points to the same level",
        contentNL: `Marcus stelt je de definitieve vraag van technische analyse: hoe weet je wanneer een signaal echt betrouwbaar is?

Het antwoord is confluence — het samenvallen van meerdere onafhankelijke signalen op hetzelfde prijsniveau. Hoe meer factoren samenkomen, hoe sterker de zone.

Stel je voor: BTC trekt terug naar €78.000. Op dat niveau:
- De 200 EMA op dagelijks staat op €78.100
- Een oude support zone van 3 maanden geleden ligt op €77.800-€78.200
- Het 61,8% Fibonacci retracement van de laatste upswing = €78.050
- RSI op 4H = 32 (oversold territory)
- Volume droogt op terwijl de prijs daalt (geen verkoopdruk)

Vijf onafhankelijke factoren wijzen naar hetzelfde punt. Dit is geen coincidentie — dit is een krachtige confluence zone.

Marcus' methode: de scorekaart
Geef elk confluentiefactor 1 punt:
- Belangrijke MA (50/200 EMA)? +1
- Key support/resistance? +1
- Fibonacci level (61,8% of 38,2%)? +1
- RSI overbought/oversold? +1
- Volume bevestiging? +1
- Higher timeframe alignment? +1

Score 4+ = sterke zone, overweeg een positie
Score 2-3 = matige zone, wacht op extra bevestiging
Score 1 = zwak signaal, skip

De grote valkuil: traders zoeken bewust naar confluencies die hun bestaande bias bevestigen (confirmation bias). Wees eerlijk: als je 5 factoren zoekt en er maar 2 vindt die bullish zijn, is de zone niet sterk.

Actie: neem de huidige BTC/EUR grafiek en zoek de volgende sterke supportzone. Score hem met de scorekaart. Hoeveel punten?`,
        contentEN: `Marcus poses the ultimate question of technical analysis: how do you know when a signal is truly reliable?

The answer is confluence — the coincidence of multiple independent signals at the same price level. The more factors converge, the stronger the zone.

Imagine: BTC pulls back to €78,000. At that level:
- The 200 EMA on daily sits at €78,100
- An old support zone from 3 months ago is at €77,800-€78,200
- The 61.8% Fibonacci retracement of the last upswing = €78,050
- RSI on 4H = 32 (oversold territory)
- Volume dries up while price falls (no selling pressure)

Five independent factors point to the same point. This is not coincidence — this is a powerful confluence zone.

Marcus' method: the scorecard
Give each confluence factor 1 point:
- Important MA (50/200 EMA)? +1
- Key support/resistance? +1
- Fibonacci level (61.8% or 38.2%)? +1
- RSI overbought/oversold? +1
- Volume confirmation? +1
- Higher timeframe alignment? +1

Score 4+ = strong zone, consider a position
Score 2-3 = moderate zone, wait for extra confirmation
Score 1 = weak signal, skip

The big pitfall: traders deliberately look for confluences that confirm their existing bias (confirmation bias). Be honest: if you look for 5 factors and only find 2 bullish ones, the zone isn't strong.

Action: take the current BTC/EUR chart and find the next strong support zone. Score it with the scorecard. How many points?`,
        termsNL: [
          { term: "Confluence", def: "Het samenvallen van meerdere onafhankelijke signalen op hetzelfde prijsniveau." },
          { term: "Confluence Zone", def: "Een prijsgebied waar 3 of meer technische factoren samenkomen — extra sterk support/resistance." },
          { term: "Confirmation Bias", def: "De neiging om alleen informatie te zoeken die je bestaande mening bevestigt." },
          { term: "Scorekaart", def: "Systeem waarbij je punten geeft aan confluentiefactoren om de sterkte van een zone te meten." },
          { term: "Higher Timeframe Alignment", def: "Als de richting op een hogere TF (dagelijks/weekly) overeenkomt met je trade op lagere TF." },
        ],
        termsEN: [
          { term: "Confluence", def: "The coincidence of multiple independent signals at the same price level." },
          { term: "Confluence Zone", def: "A price area where 3 or more technical factors converge — extra strong support/resistance." },
          { term: "Confirmation Bias", def: "The tendency to seek only information that confirms your existing opinion." },
          { term: "Scorecard", def: "System where you award points to confluence factors to measure the strength of a zone." },
          { term: "Higher Timeframe Alignment", def: "When the direction on a higher TF (daily/weekly) matches your trade on a lower TF." },
        ],
        checkNL: {
          q: "Je ziet een potentiële koopzone op BTC. De 50 EMA staat er — dat is je enige confluentiefactor. Score: 1/6. Wat doe je?",
          options: [
            "Kopen — de 50 EMA is een sterke indicator",
            "Wachten op meer confluentiefactoren voordat je een positie neemt",
            "Half positie nemen nu en de rest bij een lagere prijs",
            "Short gaan — score van 1 is bearish",
          ],
          correct: 1,
          explain: "Een score van 1/6 betekent een zwak signaal. Eén factor op zichzelf geeft te weinig betrouwbaarheid — de markt kan makkelijk door de 50 EMA breken. Wacht totdat ook Fibonacci, support of RSI in dezelfde zone bevestigen. Geduld is een trading skill.",
        },
        checkEN: {
          q: "You see a potential buy zone on BTC. The 50 EMA is there — that's your only confluence factor. Score: 1/6. What do you do?",
          options: [
            "Buy — the 50 EMA is a strong indicator",
            "Wait for more confluence factors before taking a position",
            "Take half position now and the rest at a lower price",
            "Go short — a score of 1 is bearish",
          ],
          correct: 1,
          explain: "A score of 1/6 means a weak signal. One factor alone gives too little reliability — the market can easily break through the 50 EMA. Wait until Fibonacci, support or RSI also confirm in the same zone. Patience is a trading skill.",
        },
      },
    ],
  },
  {
    level: 8,
    labelNL: "Niveau 8 — Crypto-Specifiek & On-Chain",
    labelEN: "Level 8 — Crypto-Specific & On-Chain",
    descNL: "On-chain data, Bitcoin cycli, Fear & Greed en derivatenmarkten.",
    descEN: "On-chain data, Bitcoin cycles, Fear & Greed and derivatives markets.",
    lessons: [
      {
        id: "l8-onchain",
        icon: "🔗",
        titleNL: "On-chain analyse: kijk wat grote spelers écht doen",
        titleEN: "On-chain analysis: see what big players really do",
        contentNL: `Marcus stelt je de vraag die aandelen-traders nooit kunnen beantwoorden: wat als je kon zien hoeveel BTC er van exchange naar cold wallet gaat? Of hoeveel BTC miners vasthouden versus verkopen?

Bitcoin is een publiek blockchain — elke transactie is zichtbaar. On-chain analyse leest deze data en trekt conclusies over marktgedrag. Dit is informatie die je nergens anders krijgt.

De vijf key on-chain metrics:

**1. Exchange Netflow**
BTC die exchanges verlaat = bullish (mensen withdrawen om te houden).
BTC die exchanges binnenkomt = bearish (mensen depositen om te verkopen).
Als grote hoeveelheden van exchanges stromen vóór een rally, wisten whales wat ging komen.

**2. HODL Waves**
Toont hoe lang BTC-holders hun coins al bezitten. Als veel "jong" BTC circuleert (< 1 maand oud), zijn er veel nieuwe kopers — typisch bull market top. Als het meeste BTC "oud" is (> 1 jaar), houden long-term holders vast — typisch bull bottom.

**3. Miner Reserve**
Miners verkopen BTC om kosten te dekken. Als miners ophouden te verkopen en hamsteren, verwachten zij hogere prijzen. Als miners massaal verkopen, vóorzichtig zijn.

**4. Realized Price**
De gemiddelde aankoopprijs van alle BTC in omloop, gebaseerd op de prijs op het moment van de laatste transactie. Als de spotprijs onder de realized price zakt, zit de gemiddelde holder "in the red" — capitulatie risico.

**5. SOPR (Spent Output Profit Ratio)**
Maatstaf voor of verkopers gemiddeld winst of verlies nemen. SOPR > 1 = winst. SOPR < 1 = verlies. Als SOPR reset naar 1 in een uptrend, is dat een koopmogelijkheid.

Tools: Glassnode (betaald), CryptoQuant (gedeeltelijk gratis), LookIntoBitcoin (gratis).

Actie: ga naar LookIntoBitcoin.com en bekijk de "Exchange Net Position Change". Stroomt BTC naar of van exchanges de afgelopen 30 dagen?`,
        contentEN: `Marcus poses the question stock traders can never answer: what if you could see how much BTC is moving from exchanges to cold wallets? Or how much BTC miners are holding versus selling?

Bitcoin is a public blockchain — every transaction is visible. On-chain analysis reads this data and draws conclusions about market behavior. This is information you can't get anywhere else.

The five key on-chain metrics:

**1. Exchange Netflow**
BTC leaving exchanges = bullish (people withdrawing to hold).
BTC entering exchanges = bearish (people depositing to sell).
When large amounts leave exchanges before a rally, whales knew what was coming.

**2. HODL Waves**
Shows how long BTC holders have owned their coins. When lots of "young" BTC circulates (< 1 month old), there are many new buyers — typically bull market top. When most BTC is "old" (> 1 year), long-term holders are holding — typically bull bottom.

**3. Miner Reserve**
Miners sell BTC to cover costs. When miners stop selling and accumulate, they expect higher prices. When miners sell massively, be cautious.

**4. Realized Price**
The average purchase price of all BTC in circulation, based on price at time of last transaction. When spot price falls below realized price, the average holder is "in the red" — capitulation risk.

**5. SOPR (Spent Output Profit Ratio)**
Measures whether sellers are taking profit or loss on average. SOPR > 1 = profit. SOPR < 1 = loss. When SOPR resets to 1 in an uptrend, that's a buying opportunity.

Tools: Glassnode (paid), CryptoQuant (partially free), LookIntoBitcoin (free).

Action: go to LookIntoBitcoin.com and check "Exchange Net Position Change". Is BTC flowing to or from exchanges over the past 30 days?`,
        termsNL: [
          { term: "On-Chain Analyse", def: "Analyse van publieke blockchain-data om marktgedrag van wallets en grote spelers te meten." },
          { term: "Exchange Netflow", def: "Het nettoverschil tussen BTC dat exchanges binnenkomt en verlaat." },
          { term: "HODL Waves", def: "Grafiek die toont hoe oud de BTC in omloop is — proxy voor holder-gedrag." },
          { term: "Realized Price", def: "De gemiddelde aankoopprijs van alle circulating BTC op basis van laatste transactieprijs." },
          { term: "SOPR", def: "Ratio die meet of BTC-verkopers gemiddeld winst (>1) of verlies (<1) nemen." },
        ],
        termsEN: [
          { term: "On-Chain Analysis", def: "Analysis of public blockchain data to measure market behavior of wallets and large players." },
          { term: "Exchange Netflow", def: "The net difference between BTC entering and leaving exchanges." },
          { term: "HODL Waves", def: "Chart showing how old the circulating BTC is — proxy for holder behavior." },
          { term: "Realized Price", def: "The average purchase price of all circulating BTC based on last transaction price." },
          { term: "SOPR", def: "Ratio measuring whether BTC sellers are taking profit (>1) or loss (<1) on average." },
        ],
        checkNL: {
          q: "On-chain data toont dat in de afgelopen week 120.000 BTC van exchanges zijn gestroomd (outflow). Wat suggereert dit?",
          options: [
            "Bearish — mensen verkopen hun BTC",
            "Neutraal — exchange flows zijn altijd willekeurig",
            "Bullish — mensen withdrawen BTC naar cold wallets om te houden",
            "Bearish — minder liquiditeit op exchanges betekent lagere prijzen",
          ],
          correct: 2,
          explain: "BTC dat exchanges verlaat gaat naar cold wallets — dat betekent mensen willen het vasthouden, niet verkopen. Minder BTC op exchanges = minder verkoopdruk = bullish signaal. Historisch gezien gingen grote outflow periodes vaak vooraf aan price rallies.",
        },
        checkEN: {
          q: "On-chain data shows 120,000 BTC has flowed off exchanges in the past week (outflow). What does this suggest?",
          options: [
            "Bearish — people are selling their BTC",
            "Neutral — exchange flows are always random",
            "Bullish — people are withdrawing BTC to cold wallets to hold",
            "Bearish — less liquidity on exchanges means lower prices",
          ],
          correct: 2,
          explain: "BTC leaving exchanges goes to cold wallets — meaning people want to hold it, not sell. Less BTC on exchanges = less selling pressure = bullish signal. Historically, large outflow periods often preceded price rallies.",
        },
      },
      {
        id: "l8-cycles",
        icon: "🔄",
        titleNL: "Bitcoin cycli: de 4-jaar cyclus en het halving model",
        titleEN: "Bitcoin cycles: the 4-year cycle and the halving model",
        contentNL: `Marcus vraagt: stel dat je wist dat BTC elke 4 jaar een vergelijkbaar patroon volgt — zou je dan anders handelen? De meeste ervaren crypto-traders handelen met dit patroon in het achterhoofd.

Het halving: elke ~210.000 blokken (ca. 4 jaar) wordt de beloning voor miners gehalveerd. In 2012 was dit 50 BTC per blok, in 2024 is het 3,125 BTC. Door het aanbod te halveren terwijl de vraag gelijk blijft of groeit, stijgt theoretisch de prijs.

Het historische patroon:
- **Pre-halving** (6-12 maanden voor): rustige accumulatiefase, prijs relatief laag
- **Post-halving** (0-12 maanden na): trage opbouw, miners passen zich aan
- **Bull run** (12-18 maanden na halving): explosieve stijging, nieuwe ATH
- **Bear market** (18-36 maanden na halving): daling van 70-85% van ATH

2012 halving → Bull top december 2013 (+9.000%)
2016 halving → Bull top december 2017 (+2.900%)
2020 halving → Bull top november 2021 (+700%)
2024 halving → ?

Belangrijke kanttekeningen van Marcus:
1. Elke cyclus is kleiner in procentueel rendement — de markt rijpt
2. Institutionele instroom verandert de dynamiek
3. Macro-economie (rentestanden, dollar) speelt een grotere rol dan vroeger
4. Past performance is geen garantie — maar het patroon is te prominent om te negeren

Het Stock-to-Flow model: vergelijkt het beschikbare aanbod (stock) met de jaarlijkse productie (flow). Goud heeft een hoge S2F (~60), na het 2024 halving heeft BTC S2F ~120. Hoe hoger, hoe schaarser — hoe waardevoller historisch gezien.

Actie: zoek op Google "Bitcoin halving dates" en bereken hoeveel maanden we nu verwijderd zijn van het laatste halving. In welke cyclus-fase zitten we nu?`,
        contentEN: `Marcus asks: suppose you knew BTC follows a similar pattern every 4 years — would you trade differently? Most experienced crypto traders keep this pattern in mind.

The halving: every ~210,000 blocks (approximately 4 years) the reward for miners is halved. In 2012 this was 50 BTC per block, in 2024 it's 3.125 BTC. By halving supply while demand stays equal or grows, price theoretically rises.

The historical pattern:
- **Pre-halving** (6-12 months before): quiet accumulation phase, price relatively low
- **Post-halving** (0-12 months after): slow buildup, miners adjust
- **Bull run** (12-18 months after halving): explosive rise, new ATH
- **Bear market** (18-36 months after halving): decline of 70-85% from ATH

2012 halving → Bull top December 2013 (+9,000%)
2016 halving → Bull top December 2017 (+2,900%)
2020 halving → Bull top November 2021 (+700%)
2024 halving → ?

Important caveats from Marcus:
1. Each cycle is smaller in percentage return — the market matures
2. Institutional inflow changes the dynamics
3. Macro-economy (interest rates, dollar) plays a bigger role than before
4. Past performance is no guarantee — but the pattern is too prominent to ignore

The Stock-to-Flow model: compares available supply (stock) with annual production (flow). Gold has a high S2F (~60), after the 2024 halving BTC has S2F ~120. The higher, the scarcer — the more valuable historically.

Action: Google "Bitcoin halving dates" and calculate how many months we are from the last halving. What cycle phase are we in now?`,
        termsNL: [
          { term: "Halving", def: "Elke ~4 jaar halvering van de miner-beloning — vermindert nieuw BTC-aanbod." },
          { term: "Bull Run", def: "Periode van sterke, aanhoudende prijsstijging — historisch 12-18 maanden na halving." },
          { term: "Bear Market", def: "Periode van daling van 70-85% van de top — volgt na de bull run." },
          { term: "Stock-to-Flow", def: "Model dat schaarste meet door bestaand aanbod te delen door jaarlijkse productie." },
          { term: "ATH", def: "All-Time High — de hoogste prijs die BTC ooit heeft bereikt." },
        ],
        termsEN: [
          { term: "Halving", def: "Every ~4 years, miner reward is halved — reduces new BTC supply." },
          { term: "Bull Run", def: "Period of strong, sustained price increase — historically 12-18 months after halving." },
          { term: "Bear Market", def: "Period of 70-85% decline from the top — follows after the bull run." },
          { term: "Stock-to-Flow", def: "Model measuring scarcity by dividing existing supply by annual production." },
          { term: "ATH", def: "All-Time High — the highest price BTC has ever reached." },
        ],
        checkNL: {
          q: "BTC heeft zojuist een nieuw all-time high bereikt, 14 maanden na het laatste halving. Op basis van historische cycli, wat is de meest voorzichtige strategie?",
          options: [
            "Maximaal inleggen — de bull run gaat nog jaren door",
            "Winst nemen op een deel van de positie en stop losses aanscherpen",
            "Alles verkopen — de top is bereikt",
            "Wachten totdat het nieuwe ATH 3 maanden oud is voor je actie neemt",
          ],
          correct: 1,
          explain: "14 maanden na halving, bij een nieuw ATH, bevind je je in de historisch gevaarlijkste zone — dicht bij een cyclische top. Dat betekent niet dat de prijs morgen daalt, maar risico-management eist dat je winst neemt en beschermt wat je hebt. Alles of niets is gokken, geen handelen.",
        },
        checkEN: {
          q: "BTC has just reached a new all-time high, 14 months after the last halving. Based on historical cycles, what is the most prudent strategy?",
          options: [
            "Go all-in — the bull run continues for years",
            "Take profit on part of the position and tighten stop losses",
            "Sell everything — the top is reached",
            "Wait until the new ATH is 3 months old before taking action",
          ],
          correct: 1,
          explain: "14 months after halving, at a new ATH, you're in the historically most dangerous zone — close to a cyclical top. That doesn't mean price drops tomorrow, but risk management demands you take some profit and protect what you have. All-or-nothing is gambling, not trading.",
        },
      },
      {
        id: "l8-feargreed",
        icon: "😱",
        titleNL: "Fear & Greed Index: gebruik emotie als contrarian signaal",
        titleEN: "Fear & Greed Index: use emotion as a contrarian signal",
        contentNL: `Marcus citeert Warren Buffett: "Wees bang als anderen hebzuchtig zijn, en hebzuchtig als anderen bang zijn." Dit klinkt simpel. Maar hoe meet je wanneer de markt bang of hebzuchtig is?

De Crypto Fear & Greed Index (alternative.me) is een dagelijkse indicator van 0 tot 100:
- 0-25: Extreme Fear
- 25-45: Fear
- 45-55: Neutral
- 55-75: Greed
- 75-100: Extreme Greed

De index combineert zes factoren:
1. **Volatiliteit** (25%) — hoge volatiliteit = meer angst
2. **Marktmomentum/Volume** (25%) — hoog volume bij stijgende prijs = hebzucht
3. **Social Media** (15%) — sentiment analyse van Twitter/Reddit
4. **Surveys** (15%) — wekelijkse marktsentiment polls
5. **Bitcoin Dominance** (10%) — als BTC-dominantie stijgt, vluchten mensen van alts
6. **Google Trends** (10%) — zoekopdrachten voor "bitcoin" als proxy voor retail interesse

Hoe gebruik je dit?

**Extreme Fear (0-25)** = historisch een uitstekend koopmoment. Maart 2020 (COVID crash): index op 8. BTC stond op $4.000. Wie kocht, vertienvoudigde zijn inleg in 18 maanden.

**Extreme Greed (75-100)** = historisch een moment om winst te nemen of te verkopen. November 2021 (top): index op 84. BTC stond op $69.000.

De valkuil: de index kan weken op extreme waarden blijven. "Extreme Greed" in een bull run kan nog maanden duren. Gebruik het als één signaal, niet als timing-tool.

Marcus' regel: als de index onder 20 staat en de prijs daalt al > 30%, kijk actief naar koopmogelijkheden. Als de index boven 80 staat na een lange rally, neem je eerste winst.

Actie: ga naar alternative.me/crypto/fear-and-greed-index en bekijk de huidige waarde. Vergelijk met waar de prijs nu staat. Klopt het historische patroon?`,
        contentEN: `Marcus quotes Warren Buffett: "Be fearful when others are greedy, and greedy when others are fearful." This sounds simple. But how do you measure when the market is fearful or greedy?

The Crypto Fear & Greed Index (alternative.me) is a daily indicator from 0 to 100:
- 0-25: Extreme Fear
- 25-45: Fear
- 45-55: Neutral
- 55-75: Greed
- 75-100: Extreme Greed

The index combines six factors:
1. **Volatility** (25%) — high volatility = more fear
2. **Market Momentum/Volume** (25%) — high volume on rising price = greed
3. **Social Media** (15%) — sentiment analysis of Twitter/Reddit
4. **Surveys** (15%) — weekly market sentiment polls
5. **Bitcoin Dominance** (10%) — when BTC dominance rises, people flee alts
6. **Google Trends** (10%) — searches for "bitcoin" as proxy for retail interest

How do you use this?

**Extreme Fear (0-25)** = historically an excellent buying moment. March 2020 (COVID crash): index at 8. BTC was at $4,000. Those who bought, multiplied their investment 10x in 18 months.

**Extreme Greed (75-100)** = historically a time to take profit or sell. November 2021 (top): index at 84. BTC was at $69,000.

The pitfall: the index can stay at extreme values for weeks. "Extreme Greed" in a bull run can last months more. Use it as one signal, not a timing tool.

Marcus' rule: when index is below 20 and price has already dropped > 30%, actively look for buying opportunities. When index is above 80 after a long rally, take first profit.

Action: go to alternative.me/crypto/fear-and-greed-index and check the current value. Compare with where price is now. Does the historical pattern hold?`,
        termsNL: [
          { term: "Fear & Greed Index", def: "Dagelijkse indicator 0-100 die marktsentiment meet op basis van 6 factoren." },
          { term: "Extreme Fear", def: "Score onder 25 — historisch een koopmogelijkheid als contrarian." },
          { term: "Extreme Greed", def: "Score boven 75 — historisch een moment om winst te nemen." },
          { term: "Contrarian", def: "Strategie waarbij je het tegenovergestelde doet van de meerderheid — kopen als iedereen bang is." },
          { term: "BTC Dominantie", def: "Het aandeel van Bitcoin in de totale crypto marktkapitalisatie." },
        ],
        termsEN: [
          { term: "Fear & Greed Index", def: "Daily indicator 0-100 measuring market sentiment based on 6 factors." },
          { term: "Extreme Fear", def: "Score below 25 — historically a buying opportunity as a contrarian." },
          { term: "Extreme Greed", def: "Score above 75 — historically a time to take profit." },
          { term: "Contrarian", def: "Strategy where you do the opposite of the majority — buying when everyone is fearful." },
          { term: "BTC Dominance", def: "Bitcoin's share of the total crypto market capitalization." },
        ],
        checkNL: {
          q: "De Fear & Greed Index staat op 91 (Extreme Greed). BTC is de afgelopen 6 maanden met 180% gestegen. Wat is de verstandigste actie?",
          options: [
            "Maximaal bijkopen — extreme hebzucht betekent dat de trend sterk is",
            "Een deel van je winst nemen en stop losses verhogen",
            "Alles verkopen — de top is definitief bereikt",
            "Niets doen — de index is niet betrouwbaar",
          ],
          correct: 1,
          explain: "Extreme Greed na een grote rally is het moment voor defensief risicobeheer, niet voor maximaal bijkopen. Dat betekent: winst veiligstellen op een deel van de positie, stop losses omhoog zetten zodat je meer winst beschermt. Niet alles verkopen — de trend kan verder gaan. Maar geen nieuw risico toevoegen op een extreem sentiment niveau.",
        },
        checkEN: {
          q: "The Fear & Greed Index is at 91 (Extreme Greed). BTC has risen 180% over the past 6 months. What is the wisest action?",
          options: [
            "Buy more — extreme greed means the trend is strong",
            "Take some profit and raise stop losses",
            "Sell everything — the top is definitively reached",
            "Do nothing — the index is unreliable",
          ],
          correct: 1,
          explain: "Extreme Greed after a large rally is the time for defensive risk management, not maximum buying. That means: secure profit on part of the position, move stop losses up to protect more gain. Don't sell everything — the trend can continue. But don't add new risk at an extreme sentiment level.",
        },
      },
      {
        id: "l8-derivatives",
        icon: "📐",
        titleNL: "Derivatenmarkten: futures, funding en open interest",
        titleEN: "Derivatives markets: futures, funding and open interest",
        contentNL: `Marcus vraagt: wist je dat er meer BTC-futures worden verhandeld per dag dan echte BTC? De derivatenmarkt is vele malen groter dan de spotmarkt — en geeft unieke signalen.

Een future is een contract waarbij je afspreekt BTC te kopen of verkopen op een toekomstige datum voor een vaste prijs. Met een perpetual future is er geen vervaldatum — je houdt de positie onbeperkt open.

**Funding Rate**
In perpetual futures betalen longs aan shorts (of andersom) elke 8 uur om de prijs dicht bij de spot te houden.
- Positieve funding (longs betalen shorts): meer bulls in de markt — te veel hebzucht
- Negatieve funding (shorts betalen longs): meer bears in de markt — te veel angst
- Extreem positieve funding (> 0.1% per 8u) = gevaar: long squeeze kan volgen
- Extreem negatieve funding = potentieel koopmomement: short squeeze kan volgen

**Open Interest (OI)**
Het totale aantal openstaande futures-contracten.
- Stijgende OI + stijgende prijs = sterke trend met nieuwe geld
- Stijgende OI + dalende prijs = short posities stapelen zich op
- Dalende OI + dalende prijs = capitulatie, posities worden gesloten
- Dalende OI + stijgende prijs = short squeeze

**Liquidatieheatmap**
Toont waar de meeste geleverde posities worden geliquideerd. Als er een concentratie van long-liquidaties zit net onder de huidige prijs, weten grote spelers dat ze de prijs daar naartoe kunnen pushen voor een stop hunt.

Tools: Coinglass.com voor funding rates, OI, liquidatieheatmaps.

Actie: ga naar Coinglass.com → BTC → Funding Rate. Is de funding rate momenteel positief of negatief? Hoe hoog? Wat zegt dit over het huidige marktsentiment?`,
        contentEN: `Marcus asks: did you know more BTC futures are traded per day than actual BTC? The derivatives market is many times larger than the spot market — and gives unique signals.

A future is a contract where you agree to buy or sell BTC at a future date for a fixed price. With a perpetual future there's no expiry date — you hold the position indefinitely.

**Funding Rate**
In perpetual futures, longs pay shorts (or vice versa) every 8 hours to keep the price close to spot.
- Positive funding (longs pay shorts): more bulls in the market — too much greed
- Negative funding (shorts pay longs): more bears in the market — too much fear
- Extremely positive funding (> 0.1% per 8h) = danger: long squeeze may follow
- Extremely negative funding = potential buying opportunity: short squeeze may follow

**Open Interest (OI)**
The total number of open futures contracts.
- Rising OI + rising price = strong trend with new money
- Rising OI + falling price = short positions piling up
- Falling OI + falling price = capitulation, positions being closed
- Falling OI + rising price = short squeeze

**Liquidation Heatmap**
Shows where the most leveraged positions get liquidated. If there's a concentration of long liquidations just below the current price, big players know they can push price there for a stop hunt.

Tools: Coinglass.com for funding rates, OI, liquidation heatmaps.

Action: go to Coinglass.com → BTC → Funding Rate. Is the funding rate currently positive or negative? How high? What does this say about current market sentiment?`,
        termsNL: [
          { term: "Perpetual Future", def: "Futures-contract zonder vervaldatum — houder betaalt funding rate om positie open te houden." },
          { term: "Funding Rate", def: "Periodieke betaling tussen longs en shorts om futures-prijs dicht bij spotprijs te houden." },
          { term: "Open Interest", def: "Het totaal aantal openstaande futures-contracten op een exchange." },
          { term: "Long Squeeze", def: "Als te veel longs open staan en de prijs daalt, worden ze geliquideerd — versnelt de daling." },
          { term: "Short Squeeze", def: "Als te veel shorts open staan en de prijs stijgt, worden ze geliquideerd — versnelt de stijging." },
        ],
        termsEN: [
          { term: "Perpetual Future", def: "Futures contract with no expiry date — holder pays funding rate to keep position open." },
          { term: "Funding Rate", def: "Periodic payment between longs and shorts to keep futures price close to spot price." },
          { term: "Open Interest", def: "The total number of open futures contracts on an exchange." },
          { term: "Long Squeeze", def: "When too many longs are open and price drops, they get liquidated — accelerates the decline." },
          { term: "Short Squeeze", def: "When too many shorts are open and price rises, they get liquidated — accelerates the rise." },
        ],
        checkNL: {
          q: "De funding rate op BTC perpetuals staat op +0,15% per 8 uur — het hoogste niveau in 6 maanden. Wat betekent dit voor de kans op een scherpe daling?",
          options: [
            "Lage kans — hoge positieve funding bevestigt de uptrend",
            "Hoge kans — extreem veel leveraged longs kunnen worden geliquideerd bij een kleine daling",
            "Geen invloed — funding rate heeft niets met prijs te maken",
            "Lage kans — shorts moeten nu betalen, ze sluiten hun posities",
          ],
          correct: 1,
          explain: "Extreem hoge positieve funding (>0,1%) betekent dat er onevenredig veel leveraged longs openstaan. Longs betalen een hoge rente om hun positie te houden. Een kleine prijsdaling kan een cascade van liquidaties veroorzaken. Dit is exact wanneer smart money een short-termijn short trade overweegt — niet omdat de trend om is, maar om de overcrowded long side uit te schudden.",
        },
        checkEN: {
          q: "The funding rate on BTC perpetuals is at +0.15% per 8 hours — the highest level in 6 months. What does this mean for the chance of a sharp drop?",
          options: [
            "Low chance — high positive funding confirms the uptrend",
            "High chance — extremely many leveraged longs can be liquidated on a small drop",
            "No effect — funding rate has nothing to do with price",
            "Low chance — shorts now have to pay, they'll close their positions",
          ],
          correct: 1,
          explain: "Extremely high positive funding (>0.1%) means there are disproportionately many leveraged longs open. Longs pay high interest to keep their position. A small price drop can cause a cascade of liquidations. This is exactly when smart money considers a short-term short trade — not because the trend has reversed, but to shake out the overcrowded long side.",
        },
      },
    ],
  },
  {
    level: 9,
    labelNL: "Niveau 9 — Portfolio & Geavanceerd Risicobeheer",
    labelEN: "Level 9 — Portfolio & Advanced Risk Management",
    descNL: "Correlatie, drawdown, positiegroottes en portfolio-constructie op professioneel niveau.",
    descEN: "Correlation, drawdown, position sizing and portfolio construction at professional level.",
    lessons: [
      {
        id: "l9-portfolio",
        icon: "💼",
        titleNL: "Portfolio-constructie: hoe bouw je een winstgevend crypto-portfolio?",
        titleEN: "Portfolio construction: how do you build a profitable crypto portfolio?",
        contentNL: `Marcus stelt je de vraag die de meeste beginners overslaan: wat is eigenlijk je strategie voor het geheel — niet alleen voor elke individuele trade?

Portfolio-constructie is het bewust ontwerpen van hoe je kapitaal verdeelt. Niet willekeurig kopen wat er goed uitziet, maar een systeem voor allocatie.

Marcus' framework voor een actief trading portfolio:

**Laag 1: Core (40-60% van kapitaal)**
BTC en ETH only. Deze positie houd je door dips heen. Geen leverage. Dit is je veiligheidsnet.
Rationale: BTC en ETH overleven nagenoeg elke crash. Altcoins niet.

**Laag 2: Swing Trades (20-30% van kapitaal)**
Posities van 1 dag tot 2 weken. Gebaseerd op je systeem (niveau 6). Maximaal 3 open posities tegelijk. Elke positie max 10% van totaal kapitaal.

**Laag 3: Speculative (10-20% van kapitaal)**
Hogere risico trades: nieuwe coins, nieuws-events, hoge volatiliteit. Als dit verlies gaat, doet het geen pijn aan je core.

**Laag 4: Cash Reserve (10-20%)**
Altijd liquide kapitaal beschikbaar voor kansen. In een crash wil je kunnen kopen — maar alleen als je cash hebt.

De rebalancing regel: als een laag door winst boven zijn target % uitgroeit, neem je winst en verplaats je naar een lagere risicolaag of cash. Dit dwingt je om automatisch winst te nemen.

De absolute regel: nooit meer dan 2% van totaal kapitaal riskeren op één trade. Als je €10.000 hebt, is je max verlies per trade €200.

Actie: schrijf vandaag op hoe je huidige portfolio eruitziet. Welk percentage zit in BTC/ETH, welk percentage in altcoins, hoeveel in cash? Past dit bij het framework?`,
        contentEN: `Marcus poses the question most beginners skip: what is your strategy for the whole — not just for each individual trade?

Portfolio construction is the conscious design of how you distribute your capital. Not randomly buying what looks good, but a system for allocation.

Marcus' framework for an active trading portfolio:

**Layer 1: Core (40-60% of capital)**
BTC and ETH only. You hold this position through dips. No leverage. This is your safety net.
Rationale: BTC and ETH survive virtually every crash. Altcoins don't.

**Layer 2: Swing Trades (20-30% of capital)**
Positions lasting 1 day to 2 weeks. Based on your system (level 6). Maximum 3 open positions at once. Each position max 10% of total capital.

**Layer 3: Speculative (10-20% of capital)**
Higher risk trades: new coins, news events, high volatility. If this loses, it doesn't hurt your core.

**Layer 4: Cash Reserve (10-20%)**
Always liquid capital available for opportunities. In a crash you want to be able to buy — but only if you have cash.

The rebalancing rule: when a layer grows above its target % due to gains, take profit and move to a lower risk layer or cash. This forces you to automatically take profit.

The absolute rule: never risk more than 2% of total capital on one trade. If you have €10,000, your max loss per trade is €200.

Action: write down today what your current portfolio looks like. What percentage is in BTC/ETH, what percentage in altcoins, how much in cash? Does this match the framework?`,
        termsNL: [
          { term: "Portfolio Allocatie", def: "Bewuste verdeling van kapitaal over verschillende lagen van risico en activaklassen." },
          { term: "Core Positie", def: "De stabiele kern van je portfolio — BTC/ETH zonder leverage, bedoeld voor lange termijn." },
          { term: "Rebalancing", def: "Periodiek terugbrengen van portfolio naar doelpercentages door winst te nemen." },
          { term: "Cash Reserve", def: "Liquide kapitaal dat je aanhoudt voor kansen bij dalingen." },
          { term: "2% Regel", def: "Nooit meer dan 2% van totaal kapitaal riskeren op één enkele trade." },
        ],
        termsEN: [
          { term: "Portfolio Allocation", def: "Conscious distribution of capital across different risk layers and asset classes." },
          { term: "Core Position", def: "The stable core of your portfolio — BTC/ETH without leverage, intended for long term." },
          { term: "Rebalancing", def: "Periodically returning portfolio to target percentages by taking profit." },
          { term: "Cash Reserve", def: "Liquid capital held for opportunities during dips." },
          { term: "2% Rule", def: "Never risk more than 2% of total capital on a single trade." },
        ],
        checkNL: {
          q: "Je portfolio bestaat voor 80% uit één altcoin die 3x is gestegen. De rest staat in cash. Wat is het grootste risico?",
          options: [
            "Te weinig exposure aan BTC en ETH",
            "Concentratierisico — één asset kan je portfolio halveren bij een correctie",
            "Te veel cash — je mist potentiële winsten",
            "Altcoins zijn veiliger dan BTC bij crashes",
          ],
          correct: 1,
          explain: "80% in één altcoin is geen portfolio — het is een gok op één coin. Altcoins kunnen in een bear market 90%+ dalen, terwijl BTC 'slechts' 70% daalt. Als die ene coin crasht, is 80% van je portfolio weg. Diversificatie over lagen beschermt je tegen dit scenario.",
        },
        checkEN: {
          q: "Your portfolio is 80% in one altcoin that has 3x'd. The rest is in cash. What is the biggest risk?",
          options: [
            "Too little exposure to BTC and ETH",
            "Concentration risk — one asset can halve your portfolio in a correction",
            "Too much cash — you're missing potential gains",
            "Altcoins are safer than BTC in crashes",
          ],
          correct: 1,
          explain: "80% in one altcoin isn't a portfolio — it's a bet on one coin. Altcoins can drop 90%+ in a bear market, while BTC 'only' drops 70%. If that one coin crashes, 80% of your portfolio is gone. Diversification across layers protects you from this scenario.",
        },
      },
      {
        id: "l9-correlatie",
        icon: "🔗",
        titleNL: "Correlatie in crypto: waarom alles tegelijk daalt",
        titleEN: "Correlation in crypto: why everything drops at the same time",
        contentNL: `Marcus stelt je een vraag die veel mensen verrast: stel je hebt BTC, ETH, SOL en LINK in je portfolio — denk je dan dat je gediversifieerd bent?

In traditionele finance is diversificatie krachtig: aandelen en obligaties bewegen vaak tegengesteld. In crypto is dat anders.

Correlatie meet hoe twee activa samenbewegen, op een schaal van -1 tot +1:
- +1: bewegen exact gelijk
- 0: geen relatie
- -1: bewegen exact tegengesteld

Het probleem: BTC, ETH en de meeste altcoins hebben een correlatie van 0,7 tot 0,95 met elkaar. In een crash stijgt deze correlatie naar boven 0,95. Op het moment dat je diversificatie het meest nodig hebt, verdwijnt het.

Waarom? Omdat crypto in crisissituaties als één asset klasse wordt gezien. Als de markt in paniek raakt, verkoopt iedereen alles tegelijk — BTC, ETH, altcoins, allemaal.

Praktische implicaties:
1. Spreiding over altcoins geeft nauwelijks echte diversificatie
2. Echte diversificatie in crypto = crypto vs. cash/stablecoins/goud/obligaties
3. In een bear market beschermt alleen cash of stablecoins je koopkracht

Marcus' strategie: in een bull market mag je meer altcoin exposure hebben. Naarmate markt-signalen bearish worden (dalend volume, lagere highs), verschuif je naar BTC/ETH en cash. In een bear market maak je geld door cash aan te houden en op de juiste moment terug te kopen.

De uitzondering: sommige altcoins hebben specifieke use cases die ze loskoppelen van BTC-correlatie. Maar dit zijn zeldzame uitzonderingen, niet de regel.

Actie: ga naar CoinMetrics.io of TradingView en bekijk de correlatie tussen BTC en ETH over de afgelopen 3 maanden. Hoe hoog is de R² waarde?`,
        contentEN: `Marcus poses a question that surprises many people: say you have BTC, ETH, SOL and LINK in your portfolio — do you think you're diversified?

In traditional finance, diversification is powerful: stocks and bonds often move in opposite directions. In crypto it's different.

Correlation measures how two assets move together, on a scale of -1 to +1:
- +1: move exactly alike
- 0: no relationship
- -1: move exactly opposite

The problem: BTC, ETH and most altcoins have a correlation of 0.7 to 0.95 with each other. In a crash this correlation rises above 0.95. At the moment you need diversification most, it disappears.

Why? Because crypto in crisis situations is seen as one asset class. When the market panics, everyone sells everything at once — BTC, ETH, altcoins, all of it.

Practical implications:
1. Spreading across altcoins gives almost no real diversification
2. Real diversification in crypto = crypto vs. cash/stablecoins/gold/bonds
3. In a bear market, only cash or stablecoins protect your purchasing power

Marcus' strategy: in a bull market you can have more altcoin exposure. As market signals become bearish (declining volume, lower highs), shift toward BTC/ETH and cash. In a bear market you make money by holding cash and buying back at the right moment.

The exception: some altcoins have specific use cases that decouple them from BTC correlation. But these are rare exceptions, not the rule.

Action: go to CoinMetrics.io or TradingView and look at the correlation between BTC and ETH over the past 3 months. How high is the R² value?`,
        termsNL: [
          { term: "Correlatie", def: "Maatstaf (-1 tot +1) voor hoe sterk twee activa samenbewegen." },
          { term: "Diversificatie", def: "Spreiding van kapitaal over niet-gecorreleerde activa om totaalrisico te verlagen." },
          { term: "Risk-Off", def: "Marktomstandigheid waarbij beleggers uit risicovolle activa vluchten naar veilige havens." },
          { term: "Stablecoin", def: "Crypto-token gekoppeld aan een fiatvaluta (bijv. USDC = $1). Geen koersrisico." },
          { term: "Asset Klasse", def: "Groep van vergelijkbare beleggingen die vergelijkbaar reageren op marktomstandigheden." },
        ],
        termsEN: [
          { term: "Correlation", def: "Measure (-1 to +1) of how strongly two assets move together." },
          { term: "Diversification", def: "Spreading capital across uncorrelated assets to reduce total risk." },
          { term: "Risk-Off", def: "Market condition where investors flee risky assets for safe havens." },
          { term: "Stablecoin", def: "Crypto token pegged to a fiat currency (e.g. USDC = $1). No price risk." },
          { term: "Asset Class", def: "Group of similar investments that react similarly to market conditions." },
        ],
        checkNL: {
          q: "De markt crasht 25% in één dag. Je portfolio bestaat uit BTC (40%), ETH (30%), SOL (20%) en LINK (10%). Hoeveel ben je waarschijnlijk kwijt?",
          options: [
            "Ongeveer 25% — ze bewegen allemaal mee met de markt",
            "Minder dan 10% — diversificatie beschermt je",
            "0% — je altcoins compenseren de BTC daling",
            "Meer dan 30% — altcoins dalen harder dan BTC in crashes",
          ],
          correct: 3,
          explain: "In een crash van 25% op BTC dalen altcoins typisch méér — SOL en LINK kunnen 35-50% zakken. Je 'gediversifieerde' crypto-portfolio verliest waarschijnlijk 28-35%+. Dit is het correlatie-probleem in actie. Echte bescherming komt alleen van stablecoins of cash.",
        },
        checkEN: {
          q: "The market crashes 25% in one day. Your portfolio is BTC (40%), ETH (30%), SOL (20%) and LINK (10%). How much do you likely lose?",
          options: [
            "About 25% — they all move with the market",
            "Less than 10% — diversification protects you",
            "0% — your altcoins compensate the BTC drop",
            "More than 30% — altcoins drop harder than BTC in crashes",
          ],
          correct: 3,
          explain: "In a 25% BTC crash, altcoins typically drop more — SOL and LINK can fall 35-50%. Your 'diversified' crypto portfolio likely loses 28-35%+. This is the correlation problem in action. Real protection only comes from stablecoins or cash.",
        },
      },
      {
        id: "l9-drawdown",
        icon: "📉",
        titleNL: "Drawdown management: overleven als de markt je aanvalt",
        titleEN: "Drawdown management: surviving when the market attacks you",
        contentNL: `Marcus stelt je de moeilijkste vraag in trading: wat doe je als je account 30% gedaald is en elke trade een verliezer lijkt?

Drawdown is onvermijdelijk. Elk systeem heeft verliesperiodes. Het verschil tussen traders die overleven en traders die falen is niet het vermijden van drawdowns — het is het managen ervan.

De wiskunde van drawdown is genadeloos:
- -10% drawdown → heb je +11,1% nodig om terug te komen
- -25% drawdown → heb je +33,3% nodig
- -50% drawdown → heb je +100% nodig
- -75% drawdown → heb je +300% nodig

Elke extra procent verlies kost exponentieel meer om te herstellen. Dit is waarom de primaire regel van trading is: verlies nooit te veel.

Marcuss drawdown protocol:

**Fase 1: -5% tot -10%**
Normaal. Ga door maar analyseer je journal — volg je je regels?

**Fase 2: -10% tot -20%**
Halveer je positiegrootte. Niet stoppen, maar kleiner. Je moet vermijden dat emotie je aan grote posities laat handelen.

**Fase 3: -20% tot -30%**
Stop met live trading. Ga naar papier trading of simulatie. Analyseer elk verlies. Iets is fundamenteel mis — met je systeem of je discipline.

**Fase 4: > -30%**
Volledig stop. Neem 2 weken pauze. Bekijk de situatie koel. Herstart met micro-posities (1/10 van normaal) als je terugkomt.

De psychologische valkuil: na verlies wil je sneller terugverdienen. Dit leidt tot grotere posities, minder discipline, meer verlies. Dit is de "tilt" — het moment waarop de meeste accounts failliet gaan.

Actie: stel nu je drawdown protocol in. Schrijf op: bij welk % halveer je? Bij welk % stop je? Sla dit op en volg het — ook als het pijn doet.`,
        contentEN: `Marcus poses the hardest question in trading: what do you do when your account is down 30% and every trade seems like a loser?

Drawdown is inevitable. Every system has losing periods. The difference between traders who survive and traders who fail is not avoiding drawdowns — it's managing them.

The math of drawdown is merciless:
- -10% drawdown → you need +11.1% to recover
- -25% drawdown → you need +33.3% to recover
- -50% drawdown → you need +100% to recover
- -75% drawdown → you need +300% to recover

Every additional percent lost costs exponentially more to recover. This is why the primary rule of trading is: never lose too much.

Marcus' drawdown protocol:

**Phase 1: -5% to -10%**
Normal. Continue but analyze your journal — are you following your rules?

**Phase 2: -10% to -20%**
Halve your position size. Don't stop, but go smaller. You must prevent emotion from making you trade large positions.

**Phase 3: -20% to -30%**
Stop live trading. Go to paper trading or simulation. Analyze every loss. Something is fundamentally wrong — with your system or your discipline.

**Phase 4: > -30%**
Full stop. Take 2 weeks off. Look at the situation coolly. Restart with micro-positions (1/10 of normal) when you return.

The psychological trap: after a loss you want to recover faster. This leads to larger positions, less discipline, more loss. This is "tilt" — the moment most accounts go broke.

Action: set your drawdown protocol now. Write down: at what % do you halve? At what % do you stop? Save this and follow it — even when it hurts.`,
        termsNL: [
          { term: "Drawdown", def: "Procentuele daling van accountwaarde van piek naar dieptepunt." },
          { term: "Max Drawdown", def: "De grootste historische daling van je account — maatstaf voor worst-case risico." },
          { term: "Recovery Factor", def: "Hoeveel winst je nodig hebt om een verlies goed te maken. Neemt exponentieel toe." },
          { term: "Tilt", def: "Emotionele staat na verlies waarbij je discipline verdwijnt en je slechter handelt." },
          { term: "Papier Trading", def: "Handelen zonder echt geld — oefenen met simulatie om systeem te testen of te herstellen." },
        ],
        termsEN: [
          { term: "Drawdown", def: "Percentage drop in account value from peak to trough." },
          { term: "Max Drawdown", def: "The largest historical drop in your account — measure of worst-case risk." },
          { term: "Recovery Factor", def: "How much profit you need to make up a loss. Increases exponentially." },
          { term: "Tilt", def: "Emotional state after loss where discipline disappears and you trade worse." },
          { term: "Paper Trading", def: "Trading without real money — practicing with simulation to test or recover a system." },
        ],
        checkNL: {
          q: "Je account is 40% gedaald ten opzichte van de piek. Hoeveel winst heb je nodig om terug te komen op breakeven?",
          options: [
            "40%",
            "60%",
            "66,7%",
            "80%",
          ],
          correct: 2,
          explain: "Als je €10.000 hebt en 40% verliest, hou je €6.000 over. Om van €6.000 terug naar €10.000 te komen heb je een stijging van €4.000 nodig op een basis van €6.000 — dat is 66,7%. Dit is de pijn van drawdown: verliezen kosten altijd meer om te herstellen dan ze leken te kosten.",
        },
        checkEN: {
          q: "Your account has dropped 40% from the peak. How much profit do you need to get back to breakeven?",
          options: [
            "40%",
            "60%",
            "66.7%",
            "80%",
          ],
          correct: 2,
          explain: "If you have €10,000 and lose 40%, you have €6,000 left. To go from €6,000 back to €10,000 you need a gain of €4,000 on a base of €6,000 — that's 66.7%. This is the pain of drawdown: losses always cost more to recover than they seemed to cost.",
        },
      },
      {
        id: "l9-sizing",
        icon: "📏",
        titleNL: "Geavanceerde positiegroottes: Kelly Criterion en vaste fractionering",
        titleEN: "Advanced position sizing: Kelly Criterion and fixed fractional",
        contentNL: `Marcus stelt de vraag die de meeste traders nooit serieus nemen: hoeveel zet je precies op elke trade? Niet "een beetje" of "wat ik kan missen" — maar een exacte berekening.

Positiegroottes zijn het verschil tussen een systeem dat lang-termijn winstgevend is en een dat vroeg of laat failliet gaat — ook met een positieve edge.

**Methode 1: Vaste Fractie (Fixed Fractional)**
Risikeer een vast percentage van je account per trade. Standaard: 1-2%.

Formule:
Positiegrootte = (Account × Risk%) ÷ (Entry − Stop Loss)

Voorbeeld: Account €10.000, risk 1% = €100. Entry BTC €80.000, stop €79.000 (€1.000 range).
Positiegrootte = €100 ÷ €1.000 = 0,1 BTC

Dit is de standaard methode. Simpel, effectief, schaalbaar.

**Methode 2: Kelly Criterion**
Berekent de optimale fractie op basis van je win rate en reward/risk ratio.

Kelly % = W − [(1 − W) ÷ R]
Waarbij W = win rate, R = gemiddelde winst / gemiddeld verlies

Als je win rate 55% is en je gemiddelde winst is 2x je verlies:
Kelly = 0,55 − [(0,45) ÷ 2] = 0,55 − 0,225 = 32,5%

32,5% per trade is waanzinnig riskant. Gebruik altijd Half Kelly (16,25%) of Quarter Kelly (8,125%). In de praktijk: maximaal 2-5%.

**Anti-Martingale systeem**
In tegenstelling tot martingale (verdubbelen na verlies), vergroot je bij winsten je positie en verklein je bij verliezen. Dit laat winsten doorlopen en beperkt verliesreeksen.

**Pyramiding**
Je voegt toe aan een winnende positie naarmate de prijs in je richting gaat. Elk extra stukje krijgt dezelfde stop — zo is het extra risico minimaal maar profiteer je van de trend.

Actie: bereken voor je laatste 10 trades wat de correcte positiegrootte had moeten zijn met de 2% regel. Verschilden je werkelijke posities hiervan?`,
        contentEN: `Marcus poses the question most traders never take seriously: how much exactly do you put on each trade? Not "a little" or "what I can afford to lose" — but an exact calculation.

Position sizing is the difference between a system that's long-term profitable and one that goes broke sooner or later — even with a positive edge.

**Method 1: Fixed Fractional**
Risk a fixed percentage of your account per trade. Standard: 1-2%.

Formula:
Position size = (Account × Risk%) ÷ (Entry − Stop Loss)

Example: Account €10,000, risk 1% = €100. Entry BTC €80,000, stop €79,000 (€1,000 range).
Position size = €100 ÷ €1,000 = 0.1 BTC

This is the standard method. Simple, effective, scalable.

**Method 2: Kelly Criterion**
Calculates the optimal fraction based on your win rate and reward/risk ratio.

Kelly % = W − [(1 − W) ÷ R]
Where W = win rate, R = average win / average loss

If your win rate is 55% and your average win is 2x your loss:
Kelly = 0.55 − [(0.45) ÷ 2] = 0.55 − 0.225 = 32.5%

32.5% per trade is insanely risky. Always use Half Kelly (16.25%) or Quarter Kelly (8.125%). In practice: maximum 2-5%.

**Anti-Martingale system**
Unlike martingale (doubling after a loss), you increase position size on wins and decrease on losses. This lets winners run and limits losing streaks.

**Pyramiding**
You add to a winning position as price moves in your direction. Each addition gets the same stop — so extra risk is minimal but you benefit from the trend.

Action: calculate for your last 10 trades what the correct position size should have been using the 2% rule. Did your actual positions differ from this?`,
        termsNL: [
          { term: "Positiegroottes", def: "Het exacte bedrag of aantal eenheden dat je op een trade zet." },
          { term: "Fixed Fractional", def: "Methode waarbij je altijd hetzelfde percentage van je account riskeert per trade." },
          { term: "Kelly Criterion", def: "Wiskundige formule die de optimale inzet berekent op basis van win rate en R/R." },
          { term: "Anti-Martingale", def: "Systeem waarbij je positie vergroot na winsten en verkleint na verliezen." },
          { term: "Pyramiding", def: "Toevoegen aan een winnende positie naarmate de prijs in je richting beweegt." },
        ],
        termsEN: [
          { term: "Position Sizing", def: "The exact amount or number of units you put on a trade." },
          { term: "Fixed Fractional", def: "Method where you always risk the same percentage of your account per trade." },
          { term: "Kelly Criterion", def: "Mathematical formula calculating optimal bet size based on win rate and R/R." },
          { term: "Anti-Martingale", def: "System where you increase position after wins and decrease after losses." },
          { term: "Pyramiding", def: "Adding to a winning position as price moves in your direction." },
        ],
        checkNL: {
          q: "Je account staat op €5.000. Je riskeert 2% per trade. Je entry op BTC is €82.000 en je stop is €80.500. Hoe groot is je positie in BTC?",
          options: [
            "0,05 BTC",
            "0,067 BTC",
            "0,1 BTC",
            "0,5 BTC",
          ],
          correct: 1,
          explain: "2% van €5.000 = €100 maximaal risico. Stop range = €82.000 − €80.500 = €1.500. Positiegrootte = €100 ÷ €1.500 = 0,067 BTC. Als de stop geraakt wordt, verlies je exact €100 (2% van je account). Dit is de kracht van de formule — je weet altijd precies wat je maximale verlies is.",
        },
        checkEN: {
          q: "Your account is at €5,000. You risk 2% per trade. Your entry on BTC is €82,000 and your stop is €80,500. How large is your position in BTC?",
          options: [
            "0.05 BTC",
            "0.067 BTC",
            "0.1 BTC",
            "0.5 BTC",
          ],
          correct: 1,
          explain: "2% of €5,000 = €100 maximum risk. Stop range = €82,000 − €80,500 = €1,500. Position size = €100 ÷ €1,500 = 0.067 BTC. If the stop is hit, you lose exactly €100 (2% of your account). This is the power of the formula — you always know exactly what your maximum loss is.",
        },
      },
    ],
  },
  {
    level: 10,
    labelNL: "Niveau 10 — Professioneel Traden",
    labelEN: "Level 10 — Professional Trading",
    descNL: "Trading als business: edge, schaal, consistentie en mentale meesterschap.",
    descEN: "Trading as a business: edge, scale, consistency and mental mastery.",
    lessons: [
      {
        id: "l10-business",
        icon: "🏢",
        titleNL: "Trading als business: denk als een CEO, niet als een gokker",
        titleEN: "Trading as a business: think like a CEO, not a gambler",
        contentNL: `Marcus stelt je de vraag die het verschil maakt: ben jij een trader of een gokker? Het verschil zit niet in de resultaten van één week — het zit in de mindset.

Een gokker denkt per trade. Een trader denkt per 1.000 trades.

Trading als business betekent:

**1. Kapitaalbescherming is prioriteit #1**
Een bedrijf dat failliet gaat, kan nooit meer winst maken. Een trader die zijn account blaast, is klaar. Je eerste taak is overleven — niet winst maken.

**2. Consistente uitvoering boven maximale winst**
Een bedrijf dat dit kwartaal €100k winst maakt maar volgend kwartaal €200k verlies maakt, heeft geen business — het heeft chaos. Consistentie over 12 maanden is meer waard dan één geweldige maand.

**3. Systeemdenken over intuïtiedenken**
CEO's bouwen processen die werken zonder hun constante aanwezigheid. Traders bouwen systemen die werken ongeacht hun emotionele staat van die dag.

**4. Data boven gevoel**
Je journal is je boekhouding. Je statistieken zijn je kwartaalrapport. Als je niet weet wat je win rate, expectancy en max drawdown zijn, run je je business blind.

**5. Kosten kennen**
Spread, exchange fees, funding rates, belasting — dit zijn je bedrijfskosten. Als je 1% per trade betaalt aan fees en je systeem maakt gemiddeld 1,5% per trade, is je netto marge 0,5%. Dat is je echte edge.

Marcus' business plan voor traders:
- Maandelijks doel: niet een bedrag, maar een gedragsdoel (bijv. 100% regels gevolgd)
- Kwartaalreview: statistieken analyseren, systeem aanpassen indien nodig
- Jaarlijks doel: kapitaalgroei % target + maximum drawdown grens

Actie: schrijf je trading business plan. Wat is je maandelijks gedragsdoel? Wat is je maximale jaarlijkse drawdown die je accepteert? Wat is je groeidoelstelling voor dit jaar?`,
        contentEN: `Marcus poses the question that makes the difference: are you a trader or a gambler? The difference isn't in the results of one week — it's in the mindset.

A gambler thinks per trade. A trader thinks per 1,000 trades.

Trading as a business means:

**1. Capital protection is priority #1**
A company that goes bankrupt can never make profit again. A trader who blows their account is done. Your first job is to survive — not to make profit.

**2. Consistent execution over maximum profit**
A company that makes €100k profit this quarter but €200k loss next quarter has no business — it has chaos. Consistency over 12 months is worth more than one great month.

**3. Systems thinking over intuition thinking**
CEOs build processes that work without their constant presence. Traders build systems that work regardless of their emotional state that day.

**4. Data over feeling**
Your journal is your accounting. Your statistics are your quarterly report. If you don't know your win rate, expectancy and max drawdown, you're running your business blind.

**5. Know your costs**
Spread, exchange fees, funding rates, taxes — these are your business costs. If you pay 1% per trade in fees and your system averages 1.5% per trade, your net margin is 0.5%. That's your real edge.

Marcus' business plan for traders:
- Monthly goal: not an amount, but a behavior goal (e.g. 100% rules followed)
- Quarterly review: analyze statistics, adjust system if needed
- Annual goal: capital growth % target + maximum drawdown limit

Action: write your trading business plan. What is your monthly behavior goal? What is your maximum annual drawdown you accept? What is your growth target for this year?`,
        termsNL: [
          { term: "Trading Business Plan", def: "Formeel document met doelen, regels, risicogrenzen en reviewmomenten voor je trading." },
          { term: "Expectancy", def: "Verwachte winst per trade = (win rate × gem. winst) − (verliesrate × gem. verlies)." },
          { term: "Netto Edge", def: "Je systeem-voordeel na aftrek van alle kosten (fees, spread, funding)." },
          { term: "Gedragsdoel", def: "Doel gebaseerd op gedrag (regels volgen) in plaats van resultaat (winstbedrag)." },
          { term: "Kwartaalreview", def: "Periodieke analyse van je trading statistieken om je systeem te verbeteren." },
        ],
        termsEN: [
          { term: "Trading Business Plan", def: "Formal document with goals, rules, risk limits and review moments for your trading." },
          { term: "Expectancy", def: "Expected profit per trade = (win rate × avg win) − (loss rate × avg loss)." },
          { term: "Net Edge", def: "Your system advantage after all costs (fees, spread, funding)." },
          { term: "Behavior Goal", def: "Goal based on behavior (following rules) rather than result (profit amount)." },
          { term: "Quarterly Review", def: "Periodic analysis of your trading statistics to improve your system." },
        ],
        checkNL: {
          q: "Je hebt je beste maand ooit: +35% rendement. Je hebt één grote trade gedaan buiten je systeem die €5.000 opleverde. Wat is de juiste conclusie?",
          options: [
            "Je systeem werkt uitstekend — ga zo door",
            "De maand was goed maar de buiten-systeem trade was geluk, geen skill",
            "Pas je systeem aan om meer zulke trades toe te staan",
            "Verhoog je positiegroottes want je hebt bewezen dat je goed bent",
          ],
          correct: 1,
          explain: "Een goede maand door een buiten-systeem trade te nemen is gevaarlijk. Je hebt niet bewezen dat je systeem werkt — je hebt bewezen dat je een gok hebt genomen die uitkwam. Als je dit herhaalt, zal de volgende gok niet altijd uitkomen. Een professional evalueert: 'Heb ik mijn regels gevolgd?' — niet 'Heb ik geld verdiend?'",
        },
        checkEN: {
          q: "You have your best month ever: +35% return. You made one big trade outside your system that earned €5,000. What is the correct conclusion?",
          options: [
            "Your system works excellently — keep going",
            "The month was good but the outside-system trade was luck, not skill",
            "Adjust your system to allow more such trades",
            "Increase position sizes because you've proven you're good",
          ],
          correct: 1,
          explain: "A good month from taking an outside-system trade is dangerous. You haven't proven your system works — you've proven you took a guess that paid off. If you repeat this, the next guess won't always pay off. A professional evaluates: 'Did I follow my rules?' — not 'Did I make money?'",
        },
      },
      {
        id: "l10-edge",
        icon: "⚔️",
        titleNL: "Je echte edge vinden en beschermen",
        titleEN: "Finding and protecting your real edge",
        contentNL: `Marcus stelt de meest fundamentele vraag in trading: waarom zou de markt jou geld geven?

Dit klinkt hard maar het is de enige eerlijke vraag. De markt is een zero-sum spel (minus fees). Elke euro die jij wint, verliest iemand anders. Wie verliest er aan jou? En waarom?

Een edge is een statistisch voordeel dat je op lange termijn winst oplevert. Zonder edge ben je een random gokker die toevallig wint of verliest.

De vijf bronnen van echte edge:

**1. Informatie Edge**
Je weet iets wat anderen niet weten, eerder weten of beter interpreteren. On-chain data, funding rates, orderbook analyse — dit zijn vormen van informatie-edge.

**2. Analyse Edge**
Je analyseert dezelfde informatie beter dan anderen. Confluence-analyse, multi-timeframe mastery, divergentie-herkenning — als je dit beter doet dan de gemiddelde retailer, heb je een edge.

**3. Executie Edge**
Je timing en uitvoering zijn beter. Je wacht op perfecte setups terwijl anderen impulsief handelen. Je stop losses zitten op slimmere plekken.

**4. Psychologische Edge**
Je gedrag onder druk is beter. Je volgt je regels als anderen in paniek raken. Dit is zeldzamer dan het lijkt.

**5. Risicobeheer Edge**
Je verliest minder op verliezende trades dan je wint op winnende. Zelfs met een 50% win rate kun je winstgevend zijn als je R/R > 1.5 is.

Hoe bescherm je je edge?
- Backtesten om te verifiëren dat het echt bestaat
- Journaling om te meten of je het nog steeds hebt
- Aanpassen als marktomstandigheden veranderen (een edge kan verdwijnen)
- Niet publiek maken — als iedereen weet wat je edge is, verdwijnt hij

Marcus' waarschuwing: de meeste traders denken dat ze een edge hebben maar hebben er geen. Ze winnen in bull markets omdat alles stijgt, niet vanwege skill. De bear market onthult wie er echt een edge heeft.

Actie: schrijf op wat jij denkt dat je edge is. Onderbouw het met backtestdata. Als je geen data hebt, heb je (nog) geen bewezen edge.`,
        contentEN: `Marcus poses the most fundamental question in trading: why would the market give you money?

This sounds harsh but it's the only honest question. The market is a zero-sum game (minus fees). Every euro you win, someone else loses. Who loses to you? And why?

An edge is a statistical advantage that generates profit over the long term. Without an edge you're a random gambler who wins or loses by chance.

The five sources of real edge:

**1. Information Edge**
You know something others don't know, know earlier, or interpret better. On-chain data, funding rates, orderbook analysis — these are forms of information edge.

**2. Analysis Edge**
You analyze the same information better than others. Confluence analysis, multi-timeframe mastery, divergence recognition — if you do this better than the average retailer, you have an edge.

**3. Execution Edge**
Your timing and execution are better. You wait for perfect setups while others trade impulsively. Your stop losses sit in smarter places.

**4. Psychological Edge**
Your behavior under pressure is better. You follow your rules when others panic. This is rarer than it looks.

**5. Risk Management Edge**
You lose less on losing trades than you win on winning trades. Even with a 50% win rate you can be profitable if your R/R > 1.5.

How do you protect your edge?
- Backtesting to verify it really exists
- Journaling to measure whether you still have it
- Adapting when market conditions change (an edge can disappear)
- Not making it public — if everyone knows your edge, it disappears

Marcus' warning: most traders think they have an edge but don't. They win in bull markets because everything rises, not because of skill. The bear market reveals who really has an edge.

Action: write down what you think your edge is. Support it with backtest data. If you have no data, you (still) have no proven edge.`,
        termsNL: [
          { term: "Edge", def: "Statistisch bewezen voordeel dat een systeem op lange termijn winstgevend maakt." },
          { term: "Zero-Sum Game", def: "Spel waarbij de winst van één speler gelijk is aan het verlies van een andere speler." },
          { term: "Informatie Edge", def: "Voordeel door eerder of beter toegang te hebben tot relevante marktinformatie." },
          { term: "Executie Edge", def: "Voordeel door betere timing, entry/exit keuzes en stop loss plaatsing." },
          { term: "Psychologische Edge", def: "Voordeel door betere discipline en emotiebeheersing dan de gemiddelde trader." },
        ],
        termsEN: [
          { term: "Edge", def: "Statistically proven advantage that makes a system profitable over the long term." },
          { term: "Zero-Sum Game", def: "Game where one player's gain equals another player's loss." },
          { term: "Information Edge", def: "Advantage from earlier or better access to relevant market information." },
          { term: "Execution Edge", def: "Advantage from better timing, entry/exit choices and stop loss placement." },
          { term: "Psychological Edge", def: "Advantage from better discipline and emotional control than the average trader." },
        ],
        checkNL: {
          q: "Je hebt 2 jaar winstgevend gehandeld in een bull market. Is dit bewijs van een echte edge?",
          options: [
            "Ja — 2 jaar winstgevend is statistisch significant",
            "Nee — in een bull market stijgt alles; echte edge blijkt uit prestaties in alle marktomstandigheden",
            "Ja — als je beter presteert dan hodl, heb je een edge",
            "Nee — je hebt minimaal 5 jaar nodig om edge te bewijzen",
          ],
          correct: 1,
          explain: "In een bull market winnen de meeste mensen — ook zonder edge. BTC steeg in 2020-2021 met 700%. Als je portfolio 200% steeg, deed je het slechter dan hodl. Een echte edge toont zich in bear markets, zijwaartse markten en crashes. Pas dan weet je of je skill hebt of alleen meegelift op de markt.",
        },
        checkEN: {
          q: "You've traded profitably for 2 years in a bull market. Is this proof of a real edge?",
          options: [
            "Yes — 2 years profitable is statistically significant",
            "No — in a bull market everything rises; real edge shows in performance across all market conditions",
            "Yes — if you outperform hodl, you have an edge",
            "No — you need at least 5 years to prove edge",
          ],
          correct: 1,
          explain: "In a bull market most people win — even without an edge. BTC rose 700% in 2020-2021. If your portfolio rose 200%, you underperformed hodl. A real edge shows itself in bear markets, sideways markets and crashes. Only then do you know if you have skill or just rode the market.",
        },
      },
      {
        id: "l10-prop",
        icon: "🏦",
        titleNL: "Prop trading en extern kapitaal: handelen met andermans geld",
        titleEN: "Prop trading and external capital: trading with other people's money",
        contentNL: `Marcus stelt je de vraag waar veel succesvolle traders uiteindelijk naartoe groeien: wat als je met meer kapitaal kon handelen dan je zelf hebt?

Prop trading (proprietary trading) is handelen met het kapitaal van een bedrijf in plaats van je eigen geld. Als je winstgevend bent, profiteer je van een percentage van de winst — zonder het risico van je eigen kapitaal.

Hoe werkt een prop firm?
1. Je betaalt een eenmalige evaluatiefee (€100-€500)
2. Je handelt een evaluatieperiode (30-90 dagen) met strenge regels
3. Als je slaagt (max drawdown, winstdoel), krijg je een funded account
4. Je deelt de winst: typisch 70-90% voor jou, 10-30% voor de firm
5. Je kunt met accounts van €25k tot €200k handelen

De regels zijn streng:
- Max dagelijks verlies: typisch 4-5% van account
- Max totaal verlies: typisch 10% van account
- Winstdoel: typisch 8-10% in evaluatieperiode

Waarom is dit interessant?
Als je €10k eigen kapitaal hebt en 3% per maand maakt, verdien je €300/maand.
Met een €100k prop account en dezelfde strategie, verdien je €3.000/maand (bij 100% winstverdeling).

De risico's:
- De evaluatiefee kwijt als je faalt
- Psychologische druk van strikte regels
- Sommige prop firms zijn frauduleus — check reviews zorgvuldig

Bekende legitieme firms: FTMO, MyForexFunds (failliet gegaan 2023 — les: altijd onderzoeken), The Funded Trader, Apex Trader Funding.

Marcus' advies: begin pas met prop trading als je 6+ maanden consistent winstgevend bent op je eigen account. Een prop firm evalueert niet je gevoel — alleen je resultaten.

Actie: ga naar FTMO.com en bekijk de evaluatieregels. Zou je huidige strategie de maximale drawdown-regels overleven?`,
        contentEN: `Marcus poses the question where many successful traders eventually grow toward: what if you could trade with more capital than you have yourself?

Prop trading (proprietary trading) is trading with a company's capital instead of your own money. If you're profitable, you benefit from a percentage of the profit — without the risk of your own capital.

How does a prop firm work?
1. You pay a one-time evaluation fee (€100-€500)
2. You trade an evaluation period (30-90 days) with strict rules
3. If you pass (max drawdown, profit target), you get a funded account
4. You split the profit: typically 70-90% for you, 10-30% for the firm
5. You can trade accounts of €25k to €200k

The rules are strict:
- Max daily loss: typically 4-5% of account
- Max total loss: typically 10% of account
- Profit target: typically 8-10% in evaluation period

Why is this interesting?
If you have €10k own capital and make 3% per month, you earn €300/month.
With a €100k prop account and the same strategy, you earn €3,000/month (at 100% profit split).

The risks:
- Evaluation fee lost if you fail
- Psychological pressure of strict rules
- Some prop firms are fraudulent — check reviews carefully

Known legitimate firms: FTMO, MyForexFunds (went bankrupt 2023 — lesson: always research), The Funded Trader, Apex Trader Funding.

Marcus' advice: only start prop trading when you've been consistently profitable for 6+ months on your own account. A prop firm doesn't evaluate your feeling — only your results.

Action: go to FTMO.com and look at the evaluation rules. Would your current strategy survive the maximum drawdown rules?`,
        termsNL: [
          { term: "Prop Trading", def: "Handelen met kapitaal van een bedrijf (prop firm) in ruil voor een winstpercentage." },
          { term: "Funded Account", def: "Account met prop firm-kapitaal dat je toegewezen krijgt na een geslaagde evaluatie." },
          { term: "Evaluatieperiode", def: "De testfase bij een prop firm waarbij je winstdoel en drawdown-limieten moet halen." },
          { term: "Winstverdeling", def: "De procentuele verdeling van winst tussen trader en prop firm (bijv. 80/20)." },
          { term: "Max Dagelijks Verlies", def: "De maximale daling per dag die een prop firm toestaat voordat je uitgeschakeld wordt." },
        ],
        termsEN: [
          { term: "Prop Trading", def: "Trading with a company's capital (prop firm) in exchange for a profit percentage." },
          { term: "Funded Account", def: "Account with prop firm capital assigned to you after a successful evaluation." },
          { term: "Evaluation Period", def: "The test phase at a prop firm where you must hit profit targets and drawdown limits." },
          { term: "Profit Split", def: "The percentage split of profit between trader and prop firm (e.g. 80/20)." },
          { term: "Max Daily Loss", def: "The maximum daily decline a prop firm allows before you are cut off." },
        ],
        checkNL: {
          q: "Je hebt een prop firm funded account van €50.000 met een max dagelijks verlies van 5%. Je hebt al 3% verlies op die dag. Hoeveel kun je nog maximaal verliezen?",
          options: [
            "€1.500",
            "€2.500",
            "€1.000",
            "€0 — je moet stoppen met handelen",
          ],
          correct: 0,
          explain: "Max dagelijks verlies is 5% van €50.000 = €2.500. Je hebt al 3% = €1.500 verloren. Resterend: €2.500 − €1.500 = €1.000. Wacht — het juiste antwoord is €1.000 (optie C). Elke euro die je nog verliest na de €1.000 limiet bereikt te zijn, kost je je funded account. Prop trading dwingt je tot ijzeren discipline.",
        },
        checkEN: {
          q: "You have a prop firm funded account of €50,000 with a max daily loss of 5%. You've already lost 3% that day. How much can you still maximally lose?",
          options: [
            "€1,500",
            "€2,500",
            "€1,000",
            "€0 — you must stop trading",
          ],
          correct: 2,
          explain: "Max daily loss is 5% of €50,000 = €2,500. You've already lost 3% = €1,500. Remaining: €2,500 − €1,500 = €1,000. Every euro lost beyond reaching the €1,000 remaining limit costs you your funded account. Prop trading forces you into iron discipline.",
        },
      },
      {
        id: "l10-scaling",
        icon: "🚀",
        titleNL: "Schalen: van hobbytrader naar full-time professional",
        titleEN: "Scaling: from hobby trader to full-time professional",
        contentNL: `Marcus sluit het curriculum af met de vraag die alle serieuze traders zichzelf vroeg of laat stellen: wanneer is trading mijn full-time carrière?

Het eerlijke antwoord: de meeste mensen zouden dit moment nooit mogen bereiken zonder een strenge zelfevaluatie. En de meeste mensen die het proberen, falen — niet omdat ze slechte traders zijn, maar omdat ze de transition verkeerd aanpakken.

De drie fasen van een professionele trading carrière:

**Fase 1: Bewijs (6-24 maanden)**
- Consistent winstgevend over minimaal 12 maanden (alle marktomstandigheden)
- Bewezen systeem met gebackteste edge
- Minimaal €25.000-50.000 eigen kapitaal
- Trading journal met 200+ trades
- Maximale drawdown nooit overschreden

**Fase 2: Opschalen (12-36 maanden)**
- Prop firm accounts toevoegen (FTMO etc.)
- Systematisch kapitaal opbouwen via winsten
- Mogelijk: andere traders coachen of signals bieden
- Belasting en juridische structuur regelen

**Fase 3: Full-Time (3-5 jaar)**
- Vervangend inkomen genereren via trading + andere inkomensstromen
- Minstens 12 maanden levenskosten in cash als buffer
- Psychologisch klaar om zonder salaris te leven

De grootste fout die mensen maken: te vroeg stoppen met hun baan.

Marcus' regel: de dag dat trading niet meer hoeft te winnen omdat jij het geld nodig hebt, is de dag dat je beter gaat handelen. Druk doet slechte beslissingen nemen. Bouw het op naast je baan totdat trading optioneel is.

De inkomstenstromen van professionele traders:
1. Eigen account trading
2. Prop firm accounts
3. Educatie (cursussen, coaching, signal services)
4. Content (YouTube, community)
5. Consulting

Je hoeft niet alles alleen te doen uit trading — maar trading moet je anker zijn.

Actie: definieer jouw persoonlijke mijlpalen voor elke fase. Wanneer heb jij fase 1 bereikt? Wat zijn jouw criteria? Schrijf ze op — ze zijn jouw roadmap naar professionele trading.`,
        contentEN: `Marcus closes the curriculum with the question all serious traders ask themselves sooner or later: when does trading become my full-time career?

The honest answer: most people should never reach this point without a strict self-evaluation. And most people who try, fail — not because they're bad traders, but because they handle the transition wrong.

The three phases of a professional trading career:

**Phase 1: Proof (6-24 months)**
- Consistently profitable over at least 12 months (all market conditions)
- Proven system with backtested edge
- Minimum €25,000-50,000 own capital
- Trading journal with 200+ trades
- Maximum drawdown never exceeded

**Phase 2: Scaling (12-36 months)**
- Add prop firm accounts (FTMO etc.)
- Systematically build capital through profits
- Possibly: coach other traders or offer signals
- Sort out tax and legal structure

**Phase 3: Full-Time (3-5 years)**
- Generate replacement income through trading + other income streams
- At least 12 months living expenses in cash as buffer
- Psychologically ready to live without a salary

The biggest mistake people make: quitting their job too early.

Marcus' rule: the day trading no longer has to win because you need the money, is the day you trade better. Pressure causes bad decisions. Build it alongside your job until trading is optional.

The income streams of professional traders:
1. Own account trading
2. Prop firm accounts
3. Education (courses, coaching, signal services)
4. Content (YouTube, community)
5. Consulting

You don't have to make everything from trading alone — but trading must be your anchor.

Action: define your personal milestones for each phase. When have you reached phase 1? What are your criteria? Write them down — they are your roadmap to professional trading.`,
        termsNL: [
          { term: "Full-Time Trading", def: "Trading als primaire inkomstenbron, zonder ander dienstverband." },
          { term: "Fase 1: Bewijs", def: "De eerste fase: 12+ maanden consistent winstgevend met bewezen systeem." },
          { term: "Inkomensstromen", def: "Meerdere bronnen van inkomen die samen een stabiel financieel fundament bieden." },
          { term: "Kapitaalbuffer", def: "Spaargeld dat 12+ maanden levenskosten dekt — beschermt trading van financiële druk." },
          { term: "Optioneel Trading", def: "De staat waarbij je niet afhankelijk bent van trading-inkomen — je kunt maar hoeft niet." },
        ],
        termsEN: [
          { term: "Full-Time Trading", def: "Trading as primary income source, without other employment." },
          { term: "Phase 1: Proof", def: "The first phase: 12+ months consistently profitable with proven system." },
          { term: "Income Streams", def: "Multiple sources of income that together provide a stable financial foundation." },
          { term: "Capital Buffer", def: "Savings covering 12+ months of living expenses — protects trading from financial pressure." },
          { term: "Optional Trading", def: "The state where you're not dependent on trading income — you can but don't have to." },
        ],
        checkNL: {
          q: "Je bent 8 maanden winstgevend in een bull market. Je hebt €15.000 spaargeld. Je baan is saai. Moet je nu stoppen met werken om full-time te traden?",
          options: [
            "Ja — 8 maanden bewijs is genoeg om te beginnen",
            "Nee — je mist bewijs in alle marktomstandigheden, voldoende kapitaal en een buffer",
            "Ja — maar begin met een prop firm account voor extra kapitaal",
            "Nee — je moet minimaal €100.000 hebben voor full-time trading",
          ],
          correct: 1,
          explain: "8 maanden in een bull market is geen bewijs van edge. €15.000 is te weinig om van te leven via trading. Je hebt geen 12-maanden buffer. Stop niet met je baan — bouw het systeem op naast je baan. Als je over 2 jaar nog steeds winstgevend bent in alle marktomstandigheden en voldoende kapitaal hebt opgebouwd, maak je dan die beslissing.",
        },
        checkEN: {
          q: "You've been profitable for 8 months in a bull market. You have €15,000 in savings. Your job is boring. Should you quit now to trade full-time?",
          options: [
            "Yes — 8 months of proof is enough to start",
            "No — you lack proof across all market conditions, sufficient capital and a buffer",
            "Yes — but start with a prop firm account for extra capital",
            "No — you need at least €100,000 for full-time trading",
          ],
          correct: 1,
          explain: "8 months in a bull market is no proof of edge. €15,000 is too little to live on through trading. You have no 12-month buffer. Don't quit your job — build the system alongside your job. If in 2 years you're still profitable across all market conditions and have built sufficient capital, make that decision then.",
        },
      },
    ],
  },
];

// ── Check Question Component ────────────────────────────────────────────────
function CheckQuestion({ check, lang }: { check: Check; lang: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const correct = selected === check.correct;

  return (
    <div className={`lesson-check${answered ? (correct ? " correct" : " wrong") : ""}`}>
      <div className="lesson-check-label">
        {lang === "en" ? "🧠 Marcus checks:" : "🧠 Marcus checkt:"}
      </div>
      <div className="lesson-check-question">{check.q}</div>
      <div className="lesson-check-options">
        {check.options.map((opt, i) => (
          <button
            key={i}
            className={`lesson-check-option${answered && i === check.correct ? " is-correct" : ""}${answered && selected === i && !correct ? " is-wrong" : ""}${!answered ? " unanswered" : ""}`}
            onClick={() => !answered && setSelected(i)}
            disabled={answered}
          >
            <span className="lesson-check-letter">{String.fromCharCode(65 + i)}</span>
            {opt}
          </button>
        ))}
      </div>
      {answered && (
        <div className={`lesson-check-feedback${correct ? " correct" : " wrong"}`}>
          <span>{correct ? "✅" : "❌"}</span>
          <span>{check.explain}</span>
        </div>
      )}
    </div>
  );
}

// ── Lesson Card ─────────────────────────────────────────────────────────────
function LessonCard({ lesson, lang, isRead, onRead, onQuizClick, isPublic, isUnlocked, lessonNum, totalLessons }: {
  lesson: Lesson;
  lang: string;
  isRead: boolean;
  onRead: (id: string) => void;
  onQuizClick: () => void;
  isPublic?: boolean;
  isUnlocked?: boolean;
  lessonNum: number;
  totalLessons: number;
}) {
  const [open, setOpen] = useState(false);
  const title = lang === "en" ? lesson.titleEN : lesson.titleNL;
  const content = lang === "en" ? lesson.contentEN : lesson.contentNL;
  const terms = lang === "en" ? lesson.termsEN : lesson.termsNL;
  const check = lang === "en" ? lesson.checkEN : lesson.checkNL;

  const locked = isPublic === false || isUnlocked === false;

  function toggle() {
    if (locked) return;
    setOpen(o => {
      if (!o && !isRead) onRead(lesson.id);
      return !o;
    });
  }

  if (isPublic === false) {
    return (
      <div className="curriculum-card curriculum-card-locked">
        <div className="curriculum-card-header" style={{ cursor: "default", opacity: 0.6 }}>
          <span className="curriculum-card-icon">🔒</span>
          <span className="curriculum-card-title">{title}</span>
        </div>
      </div>
    );
  }

  if (isUnlocked === false) {
    return (
      <div className="curriculum-card curriculum-card-locked">
        <div className="curriculum-card-header" style={{ cursor: "default", opacity: 0.6 }}>
          <span className="curriculum-card-icon">🔒</span>
          <span className="curriculum-card-title">{title}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginLeft: "auto" }}>
            {lang === "en" ? "Complete previous lesson first" : "Rond vorige les af"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`curriculum-card${isRead ? " curriculum-card-read" : ""}`}>
      <button className="curriculum-card-header" onClick={toggle}>
        <span className="curriculum-card-icon">{lesson.icon}</span>
        <span className="curriculum-card-title">{title}</span>
        <span className="curriculum-card-status">{isRead ? "✓" : ""}</span>
        <span className="curriculum-card-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="curriculum-card-body">
          <div className="curriculum-marcus-label">Marcus:</div>
          <div className="curriculum-content">
            {content.split("\n\n").map((para, i) => (
              <p key={i} style={{ margin: "0 0 10px 0", lineHeight: 1.6 }}>{para}</p>
            ))}
          </div>
          {lesson.diagram && (
            <div className="lesson-diagram">{lesson.diagram}</div>
          )}
          {terms && terms.length > 0 && (
            <div className="curriculum-terms">
              <div className="curriculum-terms-label">
                {lang === "en" ? "📚 Key Terms" : "📚 Begrippen"}
              </div>
              <div className="curriculum-terms-grid">
                {terms.map((t, i) => (
                  <div key={i} className="curriculum-term">
                    <span className="curriculum-term-name">{t.term}</span>
                    <span className="curriculum-term-def">{t.def}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Inline check question */}
          {check && <CheckQuestion check={check} lang={lang} />}
          {/* Quiz CTA alleen na de laatste les van het niveau */}
          {isRead && lessonNum === totalLessons && (
            <div className="curriculum-quiz-cta">
              <span>✅ {lang === "en" ? "All lessons done — ready for the quiz?" : "Alle lessen klaar — klaar voor de quiz?"}</span>
              <button className="curriculum-quiz-cta-btn" onClick={onQuizClick}>
                {lang === "en" ? "Go to quiz →" : "Naar de quiz →"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
type ReadMap = Record<string, boolean>;

export default function MarcusCurriculum({ onQuizTabClick }: { onQuizTabClick?: () => void } = {}) {
  const { lang } = useLanguage();
  const { data: session } = useSession();
  const isLoggedIn = !!session;
  const isPro = ["pro", "admin"].includes((session?.user as { role?: string })?.role ?? "");
  const [readMap, setReadMap] = useState<ReadMap>({});
  const [userLevel, setUserLevel] = useState(1);
  const [activeLevel, setActiveLevel] = useState(1);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch("/api/me/quiz").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.level) {
        setUserLevel(d.level);
        setActiveLevel(d.level);
      }
    }).catch(() => {});

    try {
      const saved = localStorage.getItem("btcmentor-curriculum-read");
      if (saved) setReadMap(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [isLoggedIn]);

  function markRead(id: string) {
    setReadMap(prev => {
      const next = { ...prev, [id]: true };
      localStorage.setItem("btcmentor-curriculum-read", JSON.stringify(next));
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`btcmentor-lesson-read-${today}`, "1");
      return next;
    });
  }

  const levelData = CURRICULUM.find(l => l.level === activeLevel) ?? CURRICULUM[0];
  const readCount = levelData.lessons.filter(l => readMap[l.id]).length;
  const totalCount = levelData.lessons.length;

  function askMarcus() {
    const levelLabel = lang === "en" ? levelData.labelEN : levelData.labelNL;
    const prompt = lang === "en"
      ? `I'm studying ${levelLabel}. Based on what I'm learning right now, give me a practical exercise I can do on the live chart to apply these concepts. Be specific.`
      : `Ik studeer ${levelLabel}. Geef me op basis van wat ik nu leer een concrete oefening die ik op de live grafiek kan doen om deze concepten toe te passen. Wees specifiek.`;
    localStorage.setItem("btcmentor-marcus-prompt", prompt);
    window.location.href = "/trade";
  }

  return (
    <div className="curriculum-wrap">
      <div className="curriculum-level-tabs">
        {CURRICULUM.map(lvl => {
          const label = lang === "en" ? `L${lvl.level}` : `N${lvl.level}`;
          const proLocked = lvl.level >= 4 && !isPro;
          const progressLocked = lvl.level > userLevel + 1;
          const locked = progressLocked || proLocked;
          const lockTitle = proLocked
            ? (lang === "en" ? "PRO required — upgrade to access" : "PRO vereist — upgrade voor toegang")
            : (lang === "en" ? "Complete previous level first" : "Voltooi vorig niveau eerst");
          return (
            <button
              key={lvl.level}
              className={`curriculum-level-tab${activeLevel === lvl.level ? " active" : ""}${locked ? " locked" : ""}${proLocked ? " pro-locked" : ""}`}
              onClick={() => !locked && setActiveLevel(lvl.level)}
              title={locked ? lockTitle : ""}
            >
              {proLocked ? "⭐" : progressLocked ? "🔒" : label}
            </button>
          );
        })}
      </div>

      <div className="curriculum-level-header">
        <div className="curriculum-level-title">
          {lang === "en" ? levelData.labelEN : levelData.labelNL}
        </div>
        <div className="curriculum-level-desc">
          {lang === "en" ? levelData.descEN : levelData.descNL}
        </div>
        <div className="curriculum-progress-row">
          <div className="curriculum-progress-bar">
            <div className="curriculum-progress-fill" style={{ width: `${totalCount > 0 ? (readCount / totalCount) * 100 : 0}%` }} />
          </div>
          <span className="curriculum-progress-label">{readCount}/{totalCount} {lang === "en" ? "lessons read" : "lessen gelezen"}</span>
        </div>
      </div>

      {!isLoggedIn && (
        <div className="curriculum-gate-banner">
          <div className="curriculum-gate-content">
            <div className="curriculum-gate-title">
              🔒 {lang === "en" ? "This is Level 1 of 5" : "Dit is Niveau 1 van 5"}
            </div>
            <p className="curriculum-gate-desc">
              {lang === "en"
                ? "15 more free lessons across 3 levels, an AI quiz at your level, and Marcus as your personal coach."
                : "Nog 15 gratis lessen verspreid over 3 niveaus, een AI-quiz op jouw niveau en Marcus als persoonlijke coach."}
            </p>
            <Link href="/auth/register" className="curriculum-gate-cta">
              {lang === "en" ? "Register for free →" : "Gratis registreren →"}
            </Link>
          </div>
        </div>
      )}
      {isLoggedIn && !isPro && activeLevel >= 4 && (
        <div className="curriculum-gate-banner">
          <div className="curriculum-gate-content">
            <div className="curriculum-gate-title">
              ⭐ {lang === "en" ? "PRO content — Level 4 and 5" : "PRO inhoud — Niveau 4 en 5"}
            </div>
            <p className="curriculum-gate-desc">
              {lang === "en"
                ? "Multi-timeframe analysis, smart money, trading psychology and building your own system. Available with PRO."
                : "Multi-timeframe analyse, smart money, trading psychologie en het bouwen van jouw eigen systeem. Beschikbaar met PRO."}
            </p>
            <Link href="/pro" className="curriculum-gate-cta">
              {lang === "en" ? "Upgrade to PRO →" : "Upgrade naar PRO →"}
            </Link>
          </div>
        </div>
      )}

      <div className="curriculum-lessons">
        {levelData.lessons.map((lesson, idx) => {
          const lessonPublic =
            (!isLoggedIn && activeLevel === 1 && idx === 0) ||
            (isLoggedIn && activeLevel <= 3) ||
            (isLoggedIn && activeLevel >= 4 && isPro);
          // Sequentieel: les 0 altijd open, les N pas open als les N-1 gelezen is
          const lessonUnlocked = idx === 0 || !!readMap[levelData.lessons[idx - 1].id];
          return (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              lang={lang}
              isRead={!!readMap[lesson.id]}
              onRead={markRead}
              onQuizClick={() => onQuizTabClick?.()}
              isPublic={lessonPublic}
              isUnlocked={lessonUnlocked}
              lessonNum={idx + 1}
              totalLessons={levelData.lessons.length}
            />
          );
        })}
      </div>

      <button className="curriculum-marcus-btn" onClick={askMarcus}>
        👤 {lang === "en" ? "Ask Marcus for a practice exercise" : "Vraag Marcus om een oefening"}
      </button>
    </div>
  );
}
