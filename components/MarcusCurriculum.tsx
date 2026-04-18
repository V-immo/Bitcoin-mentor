"use client";

import { useState, useEffect } from "react";
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
};

type Level = {
  level: number;
  labelNL: string;
  labelEN: string;
  descNL: string;
  descEN: string;
  lessons: Lesson[];
};

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
function LessonCard({ lesson, lang, isRead, onRead, onQuizClick, isPublic }: {
  lesson: Lesson;
  lang: string;
  isRead: boolean;
  onRead: (id: string) => void;
  onQuizClick: () => void;
  isPublic?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const title = lang === "en" ? lesson.titleEN : lesson.titleNL;
  const content = lang === "en" ? lesson.contentEN : lesson.contentNL;
  const terms = lang === "en" ? lesson.termsEN : lesson.termsNL;
  const check = lang === "en" ? lesson.checkEN : lesson.checkNL;

  function toggle() {
    if (isPublic === false) return;
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
          {/* Quiz CTA na les lezen */}
          {isRead && (
            <div className="curriculum-quiz-cta">
              <span>✅ {lang === "en" ? "Lesson read! Ready to test yourself?" : "Les gelezen! Klaar om jezelf te testen?"}</span>
              <button className="curriculum-quiz-cta-btn" onClick={onQuizClick}>
                {lang === "en" ? "→ Do the quiz" : "→ Doe de quiz"}
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
            <Link href="/upgrade" className="curriculum-gate-cta">
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
          return (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              lang={lang}
              isRead={!!readMap[lesson.id]}
              onRead={markRead}
              onQuizClick={() => onQuizTabClick?.()}
              isPublic={lessonPublic}
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
