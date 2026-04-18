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
  diagramId?: string;
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
    descNL: "Geen voorkennis nodig. Marcus legt alles uit van nul.",
    descEN: "No prior knowledge needed. Marcus explains everything from scratch.",
    lessons: [
      {
        id: "l1-bitcoin",
        icon: "₿",
        titleNL: "Wat is Bitcoin eigenlijk?",
        titleEN: "What is Bitcoin really?",
        contentNL: `Bitcoin is digitaal geld dat niet bestaat op een stukje papier, maar op duizenden computers tegelijk. Er is geen bank, geen overheid, geen baas — het systeem regelt zichzelf.

Stel je voor: je stuurt iemand €10 via je bank. Die bank registreert dat jij €10 minder hebt en die persoon €10 meer. De bank is de tussenpersoon die dat bijhoudt.

Bitcoin schrapt die tussenpersoon. Het netwerk zelf — een lijst van alle transacties op duizenden computers tegelijk — houdt bij wie wat heeft. Dat noemen we de blockchain.

Er zijn precies 21 miljoen Bitcoins. Nooit meer. Dat maakt het schaars — net als goud. En net als goud: als er meer vraag is dan aanbod, stijgt de prijs.

Marcus zegt: Bitcoin is geen snelle manier om rijk te worden. Het is een nieuw soort geld dat je zelf beheert, zonder bank. Begrijp dat eerst, dan pas heeft alles wat je hierna leert echt betekenis.`,
        contentEN: `Bitcoin is digital money that doesn't exist on a piece of paper, but on thousands of computers simultaneously. No bank, no government, no boss — the system runs itself.

Imagine: you send someone €10 through your bank. The bank records that you have €10 less and that person has €10 more. The bank is the middleman keeping track.

Bitcoin removes that middleman. The network itself — a list of all transactions across thousands of computers simultaneously — keeps track of who has what. We call this the blockchain.

There are exactly 21 million Bitcoins. Never more. That makes it scarce — like gold. And just like gold: if there's more demand than supply, the price rises.

Marcus says: Bitcoin isn't a quick way to get rich. It's a new kind of money that you control yourself, without a bank. Understand that first, then everything you learn after this will make real sense.`,
        termsNL: [
          { term: "Bitcoin (BTC)", def: "Digitale munt — het eerste en grootste cryptocurrency. Symbool: ₿" },
          { term: "Blockchain", def: "De lijst van ALLE Bitcoin-transacties ooit. Staat op duizenden computers tegelijk. Kan niet vervalst worden." },
          { term: "Crypto", def: "Afkorting van cryptocurrency — digitaal geld gebouwd op blockchain-technologie." },
          { term: "Wallet", def: "Je digitale portemonnee. Geen echte portemonnee — maar een code (private key) die bewijst dat de BTC van jou is." },
        ],
        termsEN: [
          { term: "Bitcoin (BTC)", def: "Digital currency — the first and largest cryptocurrency. Symbol: ₿" },
          { term: "Blockchain", def: "The list of ALL Bitcoin transactions ever. Stored on thousands of computers simultaneously. Cannot be forged." },
          { term: "Crypto", def: "Short for cryptocurrency — digital money built on blockchain technology." },
          { term: "Wallet", def: "Your digital wallet. Not a real wallet — but a code (private key) that proves the BTC is yours." },
        ],
        checkNL: {
          q: "Je bankrekening heeft €10.000. De bank gaat failliet. Wat is het verschil met Bitcoin in je eigen wallet?",
          options: [
            "Ook Bitcoin is niet veilig bij bankfaillissementen",
            "Met Bitcoin ben jij de bank — geen tussenpersoon die failliet kan gaan",
            "De overheid garandeert je Bitcoin saldo net als bij een bank",
            "Bitcoin verdwijnt ook als er geen servers meer draaien",
          ],
          correct: 1,
          explain: "Precies. Met een eigen wallet bezit jij de private key — geen bank, geen tussenpersoon. Dit is het kernidee van Bitcoin: 'be your own bank'. Daarom zeggen we: not your keys, not your coins.",
        },
        checkEN: {
          q: "Your bank account has €10,000. The bank goes bankrupt. What's different with Bitcoin in your own wallet?",
          options: [
            "Bitcoin is also unsafe when banks fail",
            "With Bitcoin you are the bank — no middleman that can go bankrupt",
            "The government guarantees your Bitcoin balance just like a bank",
            "Bitcoin also disappears if there are no more servers running",
          ],
          correct: 1,
          explain: "Exactly. With your own wallet you hold the private key — no bank, no middleman. This is Bitcoin's core idea: 'be your own bank'. That's why we say: not your keys, not your coins.",
        },
      },
      {
        id: "l1-prijs",
        icon: "📈",
        titleNL: "Hoe werkt de prijs van Bitcoin?",
        titleEN: "How does Bitcoin's price work?",
        contentNL: `De prijs van Bitcoin wordt bepaald door vraag en aanbod — net als bij elk product op de markt.

Voorbeeld: Als morgen een land aankondigde dat Bitcoin wettig betaalmiddel wordt, willen meer mensen BTC kopen. Meer kopers, zelfde hoeveelheid coins → prijs stijgt.

Als een groot land Bitcoin verbiedt, worden mensen bang en willen ze verkopen. Meer verkopers, minder kopers → prijs daalt.

Bitcoin heeft geen vaste prijs. Er is geen "juiste" prijs. De prijs is gewoon het laatste bedrag waartegen iemand wilde kopen én verkopen op een exchange.

Dat is ook waarom de prijs elke seconde verandert — er worden de hele dag transacties gedaan door mensen overal ter wereld.

Wat de prijs beïnvloedt:
— Groot nieuws (positief of negatief)
— Regelgeving van overheden
— Grote beleggers die veel kopen of verkopen
— Algemeen marktsentiment (hoe voelt iedereen zich over de markt?)
— De Bitcoin halving (elke ~4 jaar worden nieuwe BTC gehalveerd → schaarser)`,
        contentEN: `The price of Bitcoin is determined by supply and demand — just like any product on the market.

Example: If tomorrow a country announced that Bitcoin is legal tender, more people want to buy BTC. More buyers, same amount of coins → price rises.

If a major country bans Bitcoin, people get scared and want to sell. More sellers, fewer buyers → price drops.

Bitcoin has no fixed price. There is no "correct" price. The price is simply the last amount at which someone was willing to buy AND sell on an exchange.

That's also why the price changes every second — transactions happen all day by people all over the world.

What influences the price:
— Major news (positive or negative)
— Government regulations
— Large investors buying or selling
— General market sentiment (how does everyone feel about the market?)
— The Bitcoin halving (every ~4 years new BTC are halved → scarcer)`,
        termsNL: [
          { term: "Prijs / Koers", def: "Het bedrag dat je nu betaalt voor 1 Bitcoin. Verandert elke seconde." },
          { term: "Exchange", def: "Een marktplaats waar je crypto koopt en verkoopt. Bitvavo, Binance, Bybit zijn exchanges." },
          { term: "Marktkapitalisatie", def: "Totale waarde van alle bitcoins samen. BTC prijs × 21 miljoen = market cap." },
          { term: "Vraag & Aanbod", def: "De fundamentele kracht achter elke prijs. Meer kopers dan verkopers → prijs omhoog." },
          { term: "Halving", def: "Elke ~4 jaar wordt de beloning voor miners gehalveerd. Minder nieuwe BTC = schaarser = historisch hogere prijs." },
        ],
        termsEN: [
          { term: "Price / Rate", def: "The amount you currently pay for 1 Bitcoin. Changes every second." },
          { term: "Exchange", def: "A marketplace where you buy and sell crypto. Bitvavo, Binance, Bybit are exchanges." },
          { term: "Market Capitalization", def: "Total value of all bitcoins combined. BTC price × 21 million = market cap." },
          { term: "Supply & Demand", def: "The fundamental force behind every price. More buyers than sellers → price up." },
          { term: "Halving", def: "Every ~4 years the reward for miners is halved. Less new BTC = scarcer = historically higher price." },
        ],
        checkNL: {
          q: "BTC staat op €80.000. Nieuws: 'Land X verbiedt Bitcoin.' Wat verwacht je op korte termijn?",
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
        titleNL: "Wallets, exchanges en veiligheid",
        titleEN: "Wallets, exchanges and security",
        contentNL: `Er zijn twee manieren om Bitcoin te bezitten: op een exchange of in een eigen wallet.

Op een exchange (zoals Bitvavo) is je BTC technisch van hen, niet van jou. Jij hebt een account. Als de exchange gehackt wordt of failliet gaat, ben jij je geld kwijt. Gebeurde bij FTX in 2022 — miljoenen mensen verloren alles.

In een eigen wallet (zoals een hardware wallet) bezit jij echt de BTC. Je hebt een private key — een geheime code. Wie die code heeft, heeft de Bitcoin. Verlies je de code → BTC weg. Er is geen "wachtwoord vergeten".

Voor trading en leren: gebruik een exchange. Voor grote bedragen op lange termijn: eigen wallet.

Twee soorten wallets:
— Hot wallet: verbonden met internet (app op je telefoon). Handig, maar minder veilig.
— Cold wallet: niet verbonden met internet (Ledger, Trezor). Veiligst voor grote bedragen.

Marcus zegt: "Not your keys, not your coins." Als jij de private key niet hebt, heb jij de Bitcoin technisch gezien niet echt.`,
        contentEN: `There are two ways to own Bitcoin: on an exchange or in your own wallet.

On an exchange (like Bitvavo) your BTC is technically theirs, not yours. You have an account. If the exchange gets hacked or goes bankrupt, you lose your money. This happened with FTX in 2022 — millions of people lost everything.

In your own wallet (like a hardware wallet) you truly own the BTC. You have a private key — a secret code. Whoever has that code has the Bitcoin. Lose the code → BTC gone. There's no "forgot password".

For trading and learning: use an exchange. For large amounts long-term: own wallet.

Two types of wallets:
— Hot wallet: connected to the internet (app on your phone). Convenient, but less secure.
— Cold wallet: not connected to the internet (Ledger, Trezor). Safest for large amounts.

Marcus says: "Not your keys, not your coins." If you don't have the private key, you technically don't really own the Bitcoin.`,
        termsNL: [
          { term: "Private Key", def: "Een geheime code die bewijst dat de BTC van jou is. NOOIT met iemand delen. Verloren = alles weg." },
          { term: "Hot Wallet", def: "Wallet verbonden met internet. Handig maar meer risico op hacks." },
          { term: "Cold Wallet", def: "Wallet NIET verbonden met internet. Veiliger voor grote bedragen (Ledger, Trezor)." },
          { term: "Seed Phrase", def: "12 of 24 woorden waarmee je je wallet kunt herstellen. Bewaar dit offline, nooit online." },
        ],
        termsEN: [
          { term: "Private Key", def: "A secret code proving the BTC is yours. NEVER share with anyone. Lost = everything gone." },
          { term: "Hot Wallet", def: "Wallet connected to the internet. Convenient but more risk of hacks." },
          { term: "Cold Wallet", def: "Wallet NOT connected to the internet. Safer for large amounts (Ledger, Trezor)." },
          { term: "Seed Phrase", def: "12 or 24 words to recover your wallet. Store offline, never online." },
        ],
        checkNL: {
          q: "Je hebt 2 BTC op Bitvavo staan. De exchange wordt gehackt en alle fondsen zijn weg. Wat is het resultaat?",
          options: [
            "Niks — verzekering dekt dit",
            "Je verliest alles, want Bitvavo bezit technisch jouw coins",
            "Je krijgt alles terug — exchanges zijn verplicht te compenseren",
            "Je kunt de BTC terugvinden op de blockchain",
          ],
          correct: 1,
          explain: "Helaas correct. Bij een exchange ben jij niet de eigenaar van de private keys — Bitvavo is dat. FTX ging in 2022 failliet: miljoenen verloren hun geld. Daarom geldt: voor grote bedragen altijd een eigen cold wallet.",
        },
        checkEN: {
          q: "You have 2 BTC on Bitvavo. The exchange gets hacked and all funds are gone. What's the result?",
          options: [
            "Nothing — insurance covers this",
            "You lose everything, because Bitvavo technically owns your coins",
            "You get everything back — exchanges are required to compensate",
            "You can recover the BTC on the blockchain",
          ],
          correct: 1,
          explain: "Unfortunately correct. On an exchange you don't own the private keys — Bitvavo does. FTX went bankrupt in 2022: millions lost their money. That's why for large amounts: always use your own cold wallet.",
        },
      },
      {
        id: "l1-groen-rood",
        icon: "🟢",
        titleNL: "Groen en rood — de markt begrijpen",
        titleEN: "Green and red — understanding the market",
        contentNL: `Overal zie je groen en rood in de crypto-wereld. Wat betekent dat?

Groen = prijs is gestegen ten opzichte van gisteren (of het vorige uur).
Rood = prijs is gedaald.

+5% bij BTC betekent: als BTC gisteren €80.000 waard was, is het nu €84.000.
-10% bij ETH betekent: als ETH €3.000 was, is het nu €2.700.

Een bull markt is wanneer prijzen stijgen over een langere periode. Iedereen is optimistisch, nieuws is positief, koersen stijgen. "Bullish" = positief sentiment.

Een bear markt is het tegenovergestelde. Prijzen dalen maanden achter elkaar. Mensen worden bang, verkopen. "Bearish" = negatief sentiment.

De crypto markt is 24/7 open — geen weekend, geen feestdagen. De beurs in New York sluit om 22:00 onze tijd, maar BTC handelt altijd door.

Belangrijke tijden voor BTC (Europese tijd):
— 14:30 — Wall Street opent: grote bewegingen mogelijk
— 22:00 — Wall Street sluit: soms ruste
— Nacht (Aziatische sessie): lagere volumes, maar bewegingen kunnen groot zijn

Marcus zegt: Leer om naar marktbeweging te kijken zonder paniek. Rood is niet altijd slecht — het kan een koopkans zijn. Groen is niet altijd goed — het kan overbought zijn.`,
        contentEN: `Everywhere you see green and red in the crypto world. What does that mean?

Green = price has risen compared to yesterday (or the previous hour).
Red = price has dropped.

+5% for BTC means: if BTC was worth €80,000 yesterday, it's now €84,000.
-10% for ETH means: if ETH was €3,000, it's now €2,700.

A bull market is when prices rise over a longer period. Everyone is optimistic, news is positive, prices rise. "Bullish" = positive sentiment.

A bear market is the opposite. Prices fall for months. People get scared, sell. "Bearish" = negative sentiment.

The crypto market is open 24/7 — no weekends, no holidays. The New York stock exchange closes at 10pm our time, but BTC always keeps trading.

Important times for BTC (European time):
— 14:30 — Wall Street opens: large movements possible
— 22:00 — Wall Street closes: sometimes calmer
— Night (Asian session): lower volumes, but movements can be large

Marcus says: Learn to watch market movements without panic. Red isn't always bad — it can be a buying opportunity. Green isn't always good — it can be overbought.`,
        termsNL: [
          { term: "Bull Markt", def: "Langdurige stijging van de markt. Iedereen is optimistisch. 'Bullish' = positief over de prijs." },
          { term: "Bear Markt", def: "Langdurige daling van de markt. Angst en pessimisme. 'Bearish' = negatief over de prijs." },
          { term: "Sentiment", def: "Hoe de markt zich 'voelt'. Positief sentiment → mensen kopen meer. Negatief → mensen verkopen." },
          { term: "Aziatische / Europese / Amerikaanse sessie", def: "De wereld handelt in shifts. Azië 00:00-08:00, Europa 08:00-16:00, VS 14:30-22:00 (Europese tijd)." },
        ],
        termsEN: [
          { term: "Bull Market", def: "Extended rise in the market. Everyone is optimistic. 'Bullish' = positive about the price." },
          { term: "Bear Market", def: "Extended fall in the market. Fear and pessimism. 'Bearish' = negative about the price." },
          { term: "Sentiment", def: "How the market 'feels'. Positive sentiment → people buy more. Negative → people sell." },
          { term: "Asian / European / American session", def: "The world trades in shifts. Asia 00:00-08:00, Europe 08:00-16:00, US 14:30-22:00 (European time)." },
        ],
        checkNL: {
          q: "BTC is de afgelopen 6 maanden met 60% gestegen. Nieuws is positief. Iedereen is enthousiast. Hoe noem je deze marktfase?",
          options: [
            "Bear markt — want het kan altijd dalen",
            "Sideways markt — want niets is zeker",
            "Bull markt — langdurige stijging met positief sentiment",
            "Correctie — want na stijging volgt altijd daling",
          ],
          correct: 2,
          explain: "Correct. Een bull markt is niet één dag groen — het is een periode van maanden met stijgende prijzen en positief sentiment. Belangrijk: zelfs in een bull markt zijn er tijdelijke dalingen (correcties). Rood = niet per se einde van de bull.",
        },
        checkEN: {
          q: "BTC has risen 60% over the past 6 months. News is positive. Everyone is enthusiastic. What do you call this market phase?",
          options: [
            "Bear market — because it can always fall",
            "Sideways market — because nothing is certain",
            "Bull market — extended rise with positive sentiment",
            "Correction — because a rise is always followed by a fall",
          ],
          correct: 2,
          explain: "Correct. A bull market isn't one green day — it's months of rising prices with positive sentiment. Important: even in a bull market there are temporary drops (corrections). Red ≠ end of the bull.",
        },
      },
    ],
  },
  {
    level: 2,
    labelNL: "Niveau 2 — Basis Trading",
    labelEN: "Level 2 — Basic Trading",
    descNL: "Grafieken lezen, orders plaatsen, risico's begrijpen.",
    descEN: "Reading charts, placing orders, understanding risks.",
    lessons: [
      {
        id: "l2-candles",
        icon: "🕯️",
        diagramId: "candles",
        titleNL: "Candlestick grafieken — het alfabet van de trader",
        titleEN: "Candlestick charts — the trader's alphabet",
        contentNL: `Een candlestick (kaars) is de meest gebruikte manier om prijsbewegingen te zien. Elke kaars toont 4 dingen voor een bepaalde tijdsperiode:

1. Open — op welke prijs begon de periode?
2. Close — op welke prijs eindigde de periode?
3. High — wat was de hoogste prijs in die periode?
4. Low — wat was de laagste prijs?

Een GROENE kaars: close hoger dan open → prijs steeg in die periode.
Een RODE kaars: close lager dan open → prijs daalde in die periode.

Het dikke deel van de kaars heet het lichaam (body). De dunne lijnen erboven en eronder zijn de schaduwen (wicks) — ze tonen de hoogste en laagste prijs.

Lange wick naar boven + kleine body = er werd hoog geprobeerd maar teruggedrukt. Verkoopdruk.
Lange wick naar onder + kleine body = er werd laag geprobeerd maar opgekocht. Koopdruk.

Timeframes: elke kaars staat voor een tijdsperiode. Op 1H = 1 kaars per uur. Op 4H = 1 kaars per 4 uur. Op 1D = 1 kaars per dag.

Marcus zegt: Leer kaarsen lezen zoals je letters leest. In het begin ziet het er chaotisch uit. Na 100 uur kijken zie je patronen die anderen missen — en dat is je edge.`,
        contentEN: `A candlestick (candle) is the most common way to see price movements. Each candle shows 4 things for a specific time period:

1. Open — at what price did the period start?
2. Close — at what price did the period end?
3. High — what was the highest price in that period?
4. Low — what was the lowest price?

A GREEN candle: close higher than open → price rose in that period.
A RED candle: close lower than open → price fell in that period.

The thick part of the candle is called the body. The thin lines above and below are the wicks (shadows) — they show the highest and lowest price.

Long wick up + small body = tried to go high but was pushed back. Selling pressure.
Long wick down + small body = tried to go low but was bought up. Buying pressure.

Timeframes: each candle represents a time period. On 1H = 1 candle per hour. On 4H = 1 candle per 4 hours. On 1D = 1 candle per day.

Marcus says: Learn to read candles like you read letters. At first it looks chaotic. After 100 hours of looking you'll see patterns others miss — and that's your edge.`,
        termsNL: [
          { term: "Candlestick / Kaars", def: "Grafische weergave van prijsbeweging. Toont open, close, high en low." },
          { term: "Body (Lichaam)", def: "Het dikke gedeelte van de kaars — verschil tussen open en close." },
          { term: "Wick / Schaduw", def: "De dunne lijnen boven/onder de body — tonen de uiterste hoge en lage prijzen." },
          { term: "Timeframe", def: "Hoe lang staat elke kaars voor? 1m, 5m, 15m, 1H, 4H, 1D — kies op basis van je trading stijl." },
          { term: "1D kaars", def: "Elke kaars = 1 dag. Ideaal voor swing trades en het grote plaatje zien." },
          { term: "4H kaars", def: "Elke kaars = 4 uur. Beste timeframe voor koopzones en setups zoeken." },
          { term: "1H kaars", def: "Elke kaars = 1 uur. Voor fijner instap-timing." },
        ],
        termsEN: [
          { term: "Candlestick / Candle", def: "Graphical representation of price movement. Shows open, close, high and low." },
          { term: "Body", def: "The thick part of the candle — difference between open and close." },
          { term: "Wick / Shadow", def: "The thin lines above/below the body — showing the extreme high and low prices." },
          { term: "Timeframe", def: "How long does each candle represent? 1m, 5m, 15m, 1H, 4H, 1D — choose based on your trading style." },
          { term: "1D candle", def: "Each candle = 1 day. Ideal for swing trades and seeing the big picture." },
          { term: "4H candle", def: "Each candle = 4 hours. Best timeframe for finding buy zones and setups." },
          { term: "1H candle", def: "Each candle = 1 hour. For finer entry timing." },
        ],
        checkNL: {
          q: "Je ziet een 4H kaars met een kleine body bovenaan en een lange wick naar beneden. Wat vertelt dit jou?",
          options: [
            "Verkopers waren in controle — de prijs daalde sterk",
            "Kopers probeerden de prijs laag te houden",
            "Prijs werd laag geduwd maar kopers kwamen terug — koopdruk op dat niveau",
            "Niks — wicks zijn niet belangrijk",
          ],
          correct: 2,
          explain: "Goed gelezen! Lange wick naar beneden = de prijs probeerde te dalen, maar kopers grepen in en duwden hem terug omhoog. Dit is koopdruk. Op een support-zone is dit een sterk signaal dat dat niveau wordt verdedigd.",
        },
        checkEN: {
          q: "You see a 4H candle with a small body at the top and a long wick downward. What does this tell you?",
          options: [
            "Sellers were in control — price dropped strongly",
            "Buyers were trying to hold the price low",
            "Price was pushed down but buyers returned — buying pressure at that level",
            "Nothing — wicks are not important",
          ],
          correct: 2,
          explain: "Well read! Long wick downward = price tried to fall, but buyers stepped in and pushed it back up. This is buying pressure. At a support zone this is a strong signal that level is being defended.",
        },
      },
      {
        id: "l2-orders",
        icon: "📋",
        titleNL: "Orders — hoe je koopt en verkoopt",
        titleEN: "Orders — how you buy and sell",
        contentNL: `Er zijn twee basistypen orders die elke trader moet kennen:

MARKTORDER: je koopt of verkoopt DIRECT tegen de huidige marktprijs. Snel, maar je hebt geen controle over de exacte prijs.
Voorbeeld: BTC staat op €80.000. Jij plaatst een marktorder voor 0.01 BTC. Je koopt direct, maar misschien op €80.050 door de spread.

LIMITORDER: je stelt een prijs in waarop je WILT kopen of verkopen. Jij wacht tot de markt naar jouw prijs komt.
Voorbeeld: BTC staat op €82.000 maar jij wilt kopen op €80.000. Je plaatst een limiet-kooporder op €80.000. Als de prijs daalt tot €80.000, wordt jouw order automatisch uitgevoerd.

STOP-LOSS: dit is je veiligheidsnet. Als de prijs daalt tot jouw stop-loss, sluit je positie automatisch.
Voorbeeld: je koopt BTC op €80.000. Stop-loss op €77.000 → als BTC daalt tot €77.000 verkoop je automatisch. Verlies = €3.000 per BTC.

TAKE-PROFIT: je stelt in op welke prijs je automatisch wint.
Voorbeeld: je koopt op €80.000, take-profit op €90.000. Als BTC stijgt tot €90.000, verkoop je automatisch. Winst = €10.000 per BTC.

Marcus zegt: Altijd een stop-loss. Altijd. Geen trade zonder. Eén trade zonder stop-loss kan je account ruïneren.`,
        contentEN: `There are two basic order types every trader needs to know:

MARKET ORDER: you buy or sell IMMEDIATELY at the current market price. Fast, but you have no control over the exact price.
Example: BTC is at €80,000. You place a market order for 0.01 BTC. You buy immediately, but perhaps at €80,050 due to the spread.

LIMIT ORDER: you set a price at which you WANT to buy or sell. You wait until the market comes to your price.
Example: BTC is at €82,000 but you want to buy at €80,000. You place a limit buy order at €80,000. When the price drops to €80,000, your order executes automatically.

STOP-LOSS: this is your safety net. If the price falls to your stop-loss, your position closes automatically.
Example: you buy BTC at €80,000. Stop-loss at €77,000 → if BTC drops to €77,000 you automatically sell. Loss = €3,000 per BTC.

TAKE-PROFIT: you set at what price you automatically take profits.
Example: you buy at €80,000, take-profit at €90,000. When BTC rises to €90,000, you automatically sell. Profit = €10,000 per BTC.

Marcus says: Always a stop-loss. Always. No trade without one. One trade without a stop-loss can ruin your account.`,
        termsNL: [
          { term: "Marktorder", def: "Directe koop of verkoop tegen huidige prijs. Snel, maar kleine onzekerheid over exacte prijs (spread)." },
          { term: "Limitorder", def: "Koop of verkoop pas als de markt jouw ingestelde prijs bereikt. Meer controle." },
          { term: "Stop-Loss (SL)", def: "Automatische verkoop als de prijs daalt tot jouw grens. Beschermt je kapitaal. VERPLICHT." },
          { term: "Take-Profit (TP)", def: "Automatische verkoop als de prijs stijgt tot jouw winstdoel." },
          { term: "Spread", def: "Verschil tussen koop- en verkoopprijs op een exchange. De exchange verdient hieraan." },
          { term: "Positie", def: "Een open trade. 'Je hebt een positie in BTC' = je bezit BTC waarvoor je een trade hebt open staan." },
        ],
        termsEN: [
          { term: "Market Order", def: "Immediate buy or sell at current price. Fast, but slight uncertainty about exact price (spread)." },
          { term: "Limit Order", def: "Buy or sell only when the market reaches your set price. More control." },
          { term: "Stop-Loss (SL)", def: "Automatic sale when price drops to your limit. Protects your capital. MANDATORY." },
          { term: "Take-Profit (TP)", def: "Automatic sale when price rises to your profit target." },
          { term: "Spread", def: "Difference between buy and sell price on an exchange. The exchange earns this." },
          { term: "Position", def: "An open trade. 'You have a position in BTC' = you own BTC with an open trade." },
        ],
        checkNL: {
          q: "BTC staat op €82.000. Jij denkt: 'ik wil kopen op €79.500 als het terugkomt.' Welk ordertype gebruik je?",
          options: [
            "Marktorder — direct kopen voor €82.000",
            "Stop-loss — instellen op €79.500",
            "Limitorder — kooporder plaatsen op €79.500",
            "Take-profit — instellen op €79.500",
          ],
          correct: 2,
          explain: "Correct! Een limitorder laat jou een prijs kiezen. Als BTC daalt naar €79.500 wordt jouw order automatisch uitgevoerd. Zo koop je op jouw prijs, niet de marktprijs van dat moment. Professionele traders gebruiken bijna altijd limitorders.",
        },
        checkEN: {
          q: "BTC is at €82,000. You think: 'I want to buy at €79,500 if it comes back down.' Which order type do you use?",
          options: [
            "Market order — buy immediately for €82,000",
            "Stop-loss — set at €79,500",
            "Limit order — place buy order at €79,500",
            "Take-profit — set at €79,500",
          ],
          correct: 2,
          explain: "Correct! A limit order lets you choose your price. When BTC drops to €79,500 your order executes automatically. That way you buy at your price, not whatever the market price is at that moment. Professional traders almost always use limit orders.",
        },
      },
      {
        id: "l2-trend",
        icon: "📉",
        diagramId: "trend",
        titleNL: "Trends herkennen — de basis van alles",
        titleEN: "Recognizing trends — the basis of everything",
        contentNL: `De allerbelangrijkste regel in trading: trade MET de trend, niet ertegen.

Er zijn drie soorten trends:
1. Uptrend (stijgend): hogere highs en hogere lows. Elke top is hoger dan de vorige. Elke bodem ook.
2. Downtrend (dalend): lagere highs en lagere lows. Elke top is lager. Elke bodem ook.
3. Sideways (zijwaarts): de prijs beweegt horizontaal. Geen duidelijke richting.

Hogere highs en hogere lows (HH/HL) → uptrend. Als je dat ziet op de 4H of 1D grafiek, is de kans groter dat de volgende beweging ook omhoog is.

Lagere highs en lagere lows (LH/LL) → downtrend. Gevaarlijk om te kopen.

Timeframes tellen hier dubbel: misschien is de 1H-grafiek in uptrend maar de 1D in downtrend. Dan koop je eigenlijk in een dalende markt — dat is gevaarlijk.

Regel: Trade altijd in de richting van de hogere timeframe (1D of 4H). De 1H en 15m gebruik je voor timing.

Marcus zegt: "De trend is je vriend, tot hij voorbij is." Koop in een stijgende markt, wacht in een dalende. Simpel klinkt het — maar de meeste beginners doen het omgekeerd.`,
        contentEN: `The most important rule in trading: trade WITH the trend, not against it.

There are three types of trends:
1. Uptrend (rising): higher highs and higher lows. Each peak is higher than the previous one. Each bottom too.
2. Downtrend (falling): lower highs and lower lows. Each peak is lower. Each bottom too.
3. Sideways: price moves horizontally. No clear direction.

Higher highs and higher lows (HH/HL) → uptrend. If you see this on the 4H or 1D chart, it's more likely the next move is also up.

Lower highs and lower lows (LH/LL) → downtrend. Dangerous to buy.

Timeframes count double here: maybe the 1H chart is in uptrend but the 1D is in downtrend. Then you're actually buying in a falling market — that's dangerous.

Rule: Always trade in the direction of the higher timeframe (1D or 4H). Use 1H and 15m for timing.

Marcus says: "The trend is your friend, until it ends." Buy in a rising market, wait in a falling one. Sounds simple — but most beginners do the opposite.`,
        termsNL: [
          { term: "Uptrend", def: "Stijgende markt. Hogere highs en hogere lows. Bullish structuur." },
          { term: "Downtrend", def: "Dalende markt. Lagere highs en lagere lows. Bearish structuur." },
          { term: "Sideways / Consolidatie", def: "Prijs beweegt horizontaal. Geen trend. Vaak wachten op doorbraak." },
          { term: "Higher High (HH)", def: "Een nieuwe top hoger dan de vorige top. Kenmerk van uptrend." },
          { term: "Higher Low (HL)", def: "Een nieuwe bodem hoger dan de vorige bodem. Kenmerk van uptrend." },
          { term: "Lower High (LH)", def: "Een nieuwe top lager dan de vorige. Kenmerk van downtrend — waarschuwing." },
        ],
        termsEN: [
          { term: "Uptrend", def: "Rising market. Higher highs and higher lows. Bullish structure." },
          { term: "Downtrend", def: "Falling market. Lower highs and lower lows. Bearish structure." },
          { term: "Sideways / Consolidation", def: "Price moves horizontally. No trend. Often wait for breakout." },
          { term: "Higher High (HH)", def: "A new peak higher than the previous peak. Characteristic of uptrend." },
          { term: "Higher Low (HL)", def: "A new bottom higher than the previous bottom. Characteristic of uptrend." },
          { term: "Lower High (LH)", def: "A new peak lower than the previous. Characteristic of downtrend — warning." },
        ],
        checkNL: {
          q: "De 1D grafiek van BTC toont: top op €85k → top op €90k → top op €88k. Wat zegt dit over de trend?",
          options: [
            "Uptrend — elke top is hoger",
            "Mogelijke trendbreuk — de laatste top (€88k) was lager dan de vorige (€90k)",
            "Downtrend — de prijs daalde van €90k naar €88k",
            "Sideways — want de prijs beweegt niet genoeg",
          ],
          correct: 1,
          explain: "Scherp! €85k → €90k = Higher High ✓. Maar €90k → €88k = Lower High. Dat is een waarschuwingssignaal: de uptrend wordt mogelijk zwakker. Nog geen bevestigde downtrend, maar je zou voorzichtiger zijn met kopen op dit moment.",
        },
        checkEN: {
          q: "The 1D BTC chart shows: peak at €85k → peak at €90k → peak at €88k. What does this say about the trend?",
          options: [
            "Uptrend — each peak is higher",
            "Possible trend break — the last peak (€88k) was lower than the previous (€90k)",
            "Downtrend — price fell from €90k to €88k",
            "Sideways — price isn't moving enough",
          ],
          correct: 1,
          explain: "Sharp! €85k → €90k = Higher High ✓. But €90k → €88k = Lower High. That's a warning signal: the uptrend may be weakening. Not yet a confirmed downtrend, but you'd be more cautious about buying right now.",
        },
      },
      {
        id: "l2-risico",
        icon: "🛡️",
        titleNL: "Risicobeheer — de #1 skill",
        titleEN: "Risk management — the #1 skill",
        contentNL: `Risicobeheer is belangrijker dan het kiezen van de juiste trade. Dat klinkt gek, maar het is waar.

Waarom? Zelfs de beste traders hebben 40-50% verliezende trades. Wat hen winstgevend maakt is niet dat ze altijd goed zitten — het is dat ze winsten groter zijn dan verliezen.

De 1% regel: riseer nooit meer dan 1-2% van je totale kapitaal op één trade.
Voorbeeld: je hebt €10.000 paper trading kapitaal. Max verlies per trade = €100-200.

Risk/Reward (R/R): voor elke euro die je riskeert, hoe veel winst kun je maken?
— R/R van 1:1 = voor €100 risico, €100 mogelijke winst. Slecht. Je moet >50% winnen om winstgevend te zijn.
— R/R van 1:2 = voor €100 risico, €200 mogelijke winst. Goed. Je moet maar 34% winnen.
— R/R van 1:3 = voor €100 risico, €300 mogelijke winst. Uitstekend. Je moet maar 25% winnen.

Paper trading: oefen eerst met nep geld. In Bitcoin Mentor gebruik je de Paper Trade tab. Alles werkt zoals echt, maar het geld is virtueel.

Marcus zegt: Een kleine rekening beschermen is makkelijker dan een grote opbouwen. Begin conservatief. Verhoog inzet pas als je consistent winstgevend bent.`,
        contentEN: `Risk management is more important than picking the right trade. That sounds strange, but it's true.

Why? Even the best traders have 40-50% losing trades. What makes them profitable isn't that they're always right — it's that their wins are bigger than their losses.

The 1% rule: never risk more than 1-2% of your total capital on one trade.
Example: you have €10,000 paper trading capital. Max loss per trade = €100-200.

Risk/Reward (R/R): for every euro you risk, how much profit can you make?
— R/R of 1:1 = for €100 risk, €100 possible profit. Bad. You need >50% wins to be profitable.
— R/R of 1:2 = for €100 risk, €200 possible profit. Good. You only need 34% wins.
— R/R of 1:3 = for €100 risk, €300 possible profit. Excellent. You only need 25% wins.

Paper trading: practice first with fake money. In Bitcoin Mentor use the Paper Trade tab. Everything works like real, but the money is virtual.

Marcus says: Protecting a small account is easier than building a large one. Start conservatively. Increase stake only when you're consistently profitable.`,
        termsNL: [
          { term: "Risicobeheer", def: "Het slim beheersen van verlies. Bepaalt of je overleeft als trader." },
          { term: "1% Regel", def: "Riseer nooit meer dan 1-2% van je totale kapitaal op 1 trade." },
          { term: "Risk/Reward (R/R)", def: "Verhouding tussen je risico en je potentiële winst. Streef naar minimum 1:2." },
          { term: "Paper Trading", def: "Oefenen met nep geld. Echte marktprijzen, geen echt risico. Eerste stap voor elke beginner." },
          { term: "Positiegrootte", def: "Hoeveel van je kapitaal je inzet op één trade. Bepaal dit ALTIJD op basis van je stop-loss." },
          { term: "Drawdown", def: "Het percentage verlies van je piek. Als je €10.000 had en nu €8.000 = 20% drawdown." },
        ],
        termsEN: [
          { term: "Risk Management", def: "Smartly controlling losses. Determines whether you survive as a trader." },
          { term: "1% Rule", def: "Never risk more than 1-2% of your total capital on 1 trade." },
          { term: "Risk/Reward (R/R)", def: "Ratio between your risk and potential profit. Aim for minimum 1:2." },
          { term: "Paper Trading", def: "Practicing with fake money. Real market prices, no real risk. First step for every beginner." },
          { term: "Position Size", def: "How much of your capital you put into one trade. ALWAYS determine this based on your stop-loss." },
          { term: "Drawdown", def: "Percentage loss from your peak. If you had €10,000 and now €8,000 = 20% drawdown." },
        ],
        checkNL: {
          q: "Trader A: 70% winrate, gemiddelde winst 0.5R. Trader B: 40% winrate, gemiddelde winst 3R. Wie is winstgevender over 100 trades?",
          options: [
            "Trader A — hogere winrate betekent meer winst",
            "Trader B — grotere winsten compenseren de verliezen ruimschoots",
            "Allebei gelijk — 70% vs 40% maakt het uit",
            "Onmogelijk te zeggen zonder meer info",
          ],
          correct: 1,
          explain: "Trader B wint! Rekenen: A maakt 70 × 0.5R − 30 × 1R = 35R − 30R = +5R per 100 trades. B maakt 40 × 3R − 60 × 1R = 120R − 60R = +60R. Trader B verdient 12× meer. Dit is waarom R/R belangrijker is dan winrate.",
        },
        checkEN: {
          q: "Trader A: 70% win rate, average win 0.5R. Trader B: 40% win rate, average win 3R. Who is more profitable over 100 trades?",
          options: [
            "Trader A — higher win rate means more profit",
            "Trader B — bigger wins more than compensate for the losses",
            "Both equal — 70% vs 40% makes the difference",
            "Impossible to say without more info",
          ],
          correct: 1,
          explain: "Trader B wins! Math: A makes 70 × 0.5R − 30 × 1R = 35R − 30R = +5R per 100 trades. B makes 40 × 3R − 60 × 1R = 120R − 60R = +60R. Trader B earns 12× more. This is why R/R matters more than win rate.",
        },
      },
    ],
  },
  {
    level: 3,
    labelNL: "Niveau 3 — Technische Analyse",
    labelEN: "Level 3 — Technical Analysis",
    descNL: "Support, resistance, RSI, moving averages en setup-kwaliteit.",
    descEN: "Support, resistance, RSI, moving averages and setup quality.",
    lessons: [
      {
        id: "l3-sr",
        icon: "🧱",
        diagramId: "sr",
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
  // ── Niveau 6 — Trading Psychologie (interactief, scenario-gebaseerd) ──────
  // Uniek: geen enkel platform koppelt psychologie-lessen aan je eigen trade-gedrag.
  // Format: situatie → keuze → Marcus analyseert de bias + gevolgen over 100 trades.
  {
    level: 6,
    labelNL: "Niveau 6 — Trading Psychologie",
    labelEN: "Level 6 — Trading Psychology",
    descNL: "De meeste traders verliezen niet door slechte analyse, maar door slechte beslissingen onder druk. Dit niveau traint je oordeel met echte scenario's.",
    descEN: "Most traders don't lose because of bad analysis, but because of bad decisions under pressure. This level trains your judgment with real scenarios.",
    lessons: [
      {
        id: "l6-fomo",
        icon: "🚀",
        titleNL: "FOMO — de duurste emotie in trading",
        titleEN: "FOMO — the most expensive emotion in trading",
        contentNL: `FOMO staat voor Fear Of Missing Out — de angst om een beweging te missen. Het is de meest voorkomende reden waarom beginners kopen op pieken en verkopen in dalen.

Het patroon is altijd hetzelfde: de markt beweegt snel omhoog. Je staat aan de zijlijn. Je ziet anderen winst maken. Het gevoel van urgentie neemt over. Je koopt. De markt draait om. Je verliest.

Waarom werkt FOMO zo krachtig? Omdat je brein verlies en gemiste winst even zwaar ervaart. Het gevoel van "ik had er bij moeten zijn" activeert precies dezelfde emotionele respons als een echt verlies.

Marcus zegt: elke trade die je mist is een goede trade. Waarom? Omdat je hem gemist hebt op basis van jouw systeem. Jouw systeem had geen entry signaal — dus er was geen trade. De markt biedt elke dag nieuwe kansen. Een gemiste kans is geen verlies. Een FOMO-trade die fout gaat, is een verlies.

Het enige wat werkt tegen FOMO: een systeem met duidelijke entry-voorwaarden. Als de markt je entry niet geeft, is er geen trade. Punt.`,
        contentEN: `FOMO stands for Fear Of Missing Out — the fear of missing a move. It's the most common reason beginners buy at peaks and sell at lows.

The pattern is always the same: the market moves sharply upward. You're on the sidelines. You see others making profits. The sense of urgency takes over. You buy. The market reverses. You lose.

Why does FOMO work so powerfully? Because your brain experiences missed gains and real losses with equal weight. The feeling of "I should have been there" activates the exact same emotional response as an actual loss.

Marcus says: every trade you miss is a good trade. Why? Because you missed it based on your system. Your system had no entry signal — so there was no trade. The market offers new opportunities every day. A missed opportunity is not a loss. A FOMO trade that goes wrong is a loss.

The only thing that works against FOMO: a system with clear entry conditions. If the market doesn't give you your entry, there is no trade. Full stop.`,
        checkNL: {
          q: "BTC is de afgelopen 2 uur met 9% gestegen. Je had geen positie. De markt staat op een all-time high. Wat doe je?",
          options: [
            "Nu instappen — de trend is duidelijk omhoog en ik wil niet meer missen",
            "Wachten op een pullback naar een duidelijk support niveau",
            "Accepteren dat ik deze move gemist heb en wachten op de volgende setup",
          ],
          correct: 2,
          explain: "Juist. Instappen na 9% pump op een ATH is per definitie een FOMO-trade. Je koopt op het moment van maximale euforie — statistisch het slechtste instapmoment. Over 100 van zulke trades verlies je structureel omdat de R/R negatief is: weinig ruimte omhoog, veel ruimte voor een correctie. Wachten op een pullback (B) is al beter, maar vereist dat je een concreet plan hebt waar je instapt. Optie C is de sterkste: een gemiste move is geen verlies. De volgende setup komt altijd.",
        },
        checkEN: {
          q: "BTC has risen 9% in the last 2 hours. You had no position. The market is at an all-time high. What do you do?",
          options: [
            "Enter now — the trend is clearly upward and I don't want to miss more",
            "Wait for a pullback to a clear support level",
            "Accept that I missed this move and wait for the next setup",
          ],
          correct: 2,
          explain: "Correct. Entering after a 9% pump at ATH is by definition a FOMO trade. You're buying at the moment of maximum euphoria — statistically the worst entry point. Over 100 such trades you lose structurally because the R/R is negative: little room upward, much room for a correction. Waiting for a pullback (B) is better, but requires a concrete plan for where you enter. Option C is the strongest: a missed move is not a loss. The next setup always comes.",
        },
      },
      {
        id: "l6-revenge",
        icon: "😤",
        titleNL: "Revenge trading — hoe één verlies tien verliezen wordt",
        titleEN: "Revenge trading — how one loss becomes ten losses",
        contentNL: `Revenge trading is het fenomeen waarbij je na een verlies direct een nieuwe trade opent om "het goed te maken." Het is een van de meest destructieve patronen in trading, omdat het verlies op verlies stapelt — terwijl je emotioneel het minst geschikt bent om te handelen.

De psychologie erachter: verlies activeert pijn. Je brein wil die pijn ongedaan maken. De snelste manier is een nieuwe trade openen en winnen. Maar op het moment dat je dat denkt, ben je al niet meer rationeel. Je negeert je systeem, vergroot je positie, of pakt setups die je normaal nooit zou nemen.

Het resultaat over 100 revenge trades is universeel: een winrate die significant onder je normale winrate ligt. Dat klopt ook logisch — je trade zonder setup, zonder plan, met verhoogde emotie.

Marcus zegt: een verlies is informatie. Het vertelt je iets over de markt, je entry, of je risicobeheer. Maar je kunt die informatie alleen verwerken als je eerst stopt. 30 minuten pauze na een verlies is geen zwakte — het is risicomanagement.

De ijzeren regel: als je een verlies hebt geleden dat pijn doet, doe geen trade meer die dag. Kom de volgende dag terug met een helder hoofd.`,
        contentEN: `Revenge trading is the phenomenon where after a loss you immediately open a new trade to "make it back." It's one of the most destructive patterns in trading, because it stacks loss on loss — while you're emotionally least equipped to trade.

The psychology behind it: loss activates pain. Your brain wants to undo that pain. The fastest way is to open a new trade and win. But at the moment you think that, you're already no longer rational. You ignore your system, increase your position size, or take setups you'd never normally take.

The result over 100 revenge trades is universal: a win rate significantly below your normal win rate. That makes logical sense too — you're trading without a setup, without a plan, with heightened emotion.

Marcus says: a loss is information. It tells you something about the market, your entry, or your risk management. But you can only process that information if you stop first. A 30-minute break after a loss is not weakness — it is risk management.

The iron rule: if you've taken a loss that stings, make no more trades that day. Come back the next day with a clear head.`,
        checkNL: {
          q: "Je hebt zojuist €250 verloren op een trade. BTC beweegt en je ziet een setup. Wat doe je?",
          options: [
            "Direct instappen — ik wil het verlies zo snel mogelijk terugverdienen",
            "30 minuten pauze nemen, daarna objectief beoordelen of de setup echt geldig is",
            "De trade analyseren, in het journal schrijven, en pas morgen opnieuw traden",
          ],
          correct: 2,
          explain: "Optie A is revenge trading — je staat met verlies in de markt en je denkt al aan de volgende trade. Dat is de definitie van irrationeel handelen. Optie B is al goed: de pauze geeft je brein tijd om te herkalibreren. Maar optie C is de sterkste: je verliest een dag traden, maar je wint data. Traders die hun verliezen journalen en een nacht slapen voor de volgende trade, presteren over 100 trades significant beter dan traders die direct doorgaan. Het verlies van €250 is al weg. Het gaat erom dat je er €0 extra aan verliest.",
        },
        checkEN: {
          q: "You just lost €250 on a trade. BTC is moving and you see a setup. What do you do?",
          options: [
            "Enter immediately — I want to recover the loss as quickly as possible",
            "Take a 30-minute break, then objectively assess whether the setup is genuinely valid",
            "Analyze the trade, write it in the journal, and only trade again tomorrow",
          ],
          correct: 2,
          explain: "Option A is revenge trading — you're sitting with a loss and already thinking about the next trade. That is the definition of irrational action. Option B is already good: the break gives your brain time to recalibrate. But option C is the strongest: you lose a day of trading, but you gain data. Traders who journal their losses and sleep on it before the next trade perform significantly better over 100 trades than traders who immediately continue. The €250 loss is already gone. The point is not to lose another €0 extra on it.",
        },
      },
      {
        id: "l6-overconfidence",
        icon: "🎰",
        titleNL: "Overconfidence — waarom winstreeksen gevaarlijk zijn",
        titleEN: "Overconfidence — why winning streaks are dangerous",
        contentNL: `Overconfidence is de bias waarbij recente successen leiden tot overdreven zelfvertrouwen — met als gevolg het nemen van grotere risico's dan je systeem toestaat. Paradoxaal genoeg is een winstreeks van 5 trades een van de gevaarlijkste momenten in je trading carrière.

Hoe het werkt: je hebt 5 goede trades achter de rug. Je brein concludeert: "ik doe het goed." Het gevoel van vaardigheid neemt toe. Je vergeet dat je succes ook beïnvloed wordt door marktomstandigheden, geluk en timing. Je vergroot je positiegrootte. Trade 6 gaat fout. Door de grotere positie is het verlies groter dan elk individueel verlies uit de winstreeks.

Dit heet de Gamblers Fallacy in reverse: mensen denken dat een winstreeks hun vaardigheid bewijst, terwijl het in realiteit ook geluk en omstandigheden bevat die elk moment kunnen veranderen.

Marcus zegt: je positiegrootte mag nooit afhangen van hoe je je voelt. Positiegrootte is wiskundig bepaald — het is een percentage van je kapitaal dat gelijk blijft, ongeacht of je laatste 3 trades winnaars of verliezers waren.

De regel: verander je positiegrootte alleen als je systeem structureel verbetert — bewezen over minimaal 50 trades. Niet op basis van gevoel.`,
        contentEN: `Overconfidence is the bias where recent successes lead to excessive self-confidence — resulting in taking larger risks than your system allows. Paradoxically, a winning streak of 5 trades is one of the most dangerous moments in your trading career.

How it works: you've had 5 good trades. Your brain concludes: "I'm doing well." The feeling of skill increases. You forget that your success is also influenced by market conditions, luck, and timing. You increase your position size. Trade 6 goes wrong. Due to the larger position, the loss is larger than any individual loss from the winning streak.

This is called the Gambler's Fallacy in reverse: people think a winning streak proves their skill, while in reality it also contains luck and circumstances that can change at any moment.

Marcus says: your position size should never depend on how you feel. Position size is mathematically determined — it's a percentage of your capital that stays the same, regardless of whether your last 3 trades were winners or losers.

The rule: only change your position size if your system structurally improves — proven over at least 50 trades. Not based on feeling.`,
        checkNL: {
          q: "Je hebt 5 trades achter elkaar gewonnen. Je normale positiegrootte is 2% van je kapitaal. Wat doe je met de volgende trade?",
          options: [
            "Ik vergroot naar 6% — ik zit duidelijk in een goede flow",
            "Ik vergroot iets naar 2,5% — kleine beloning voor goede prestaties",
            "Ik blijf op 2% — mijn systeem bepaalt de positiegrootte, niet mijn streak",
          ],
          correct: 2,
          explain: "Optie C is de enige correcte keuze. Je positiegrootte is bepaald door je risicosysteem, niet door je emotionele toestand. Een winstreeks bewijst niets over de volgende trade — elke trade is statistisch onafhankelijk. Wat optie A en B doen: ze koppelen je risicogedrag aan je recente resultaten. Als trade 6 dan fout gaat (wat statistisch gewoon gaat gebeuren), verlies je meer dan je 'verdiend' had met 5 wins. Over 100 traders die dit patroon volgen, verliezen degenen met vaste positiegrootte significant minder dan degenen die opschalen na een winstreeks.",
        },
        checkEN: {
          q: "You've won 5 trades in a row. Your normal position size is 2% of your capital. What do you do with the next trade?",
          options: [
            "I increase to 6% — I'm clearly in a good flow right now",
            "I increase slightly to 2.5% — small reward for good performance",
            "I stay at 2% — my system determines position size, not my streak",
          ],
          correct: 2,
          explain: "Option C is the only correct choice. Your position size is determined by your risk system, not your emotional state. A winning streak proves nothing about the next trade — each trade is statistically independent. What options A and B do: they link your risk behavior to your recent results. If trade 6 then goes wrong (which statistically will happen), you lose more than you 'earned' from 5 wins. Across 100 traders who follow this pattern, those with fixed position sizing lose significantly less than those who scale up after a winning streak.",
        },
      },
      {
        id: "l6-system",
        icon: "📐",
        titleNL: "Een systeem bouwen en vasthouden",
        titleEN: "Building and sticking to a system",
        contentNL: `Een trading systeem is een set van regels die bepaalt wanneer je in- en uitstapt, hoe groot je positie is, en wanneer je niet tradt. Zonder systeem ben je geen trader — je bent een gokker met een charting app.

Het probleem dat de meeste traders hebben: ze bouwen een systeem, maar passen het aan zodra het even niet werkt. Een verliezende trade, en opeens zijn de regels "niet meer van toepassing." Twee verliezende trades, en het systeem is "gebroken." Dit is de diepste fout die je kunt maken.

Waarom werkt een systeem? Omdat het gebaseerd is op statistiek over honderden trades. Als je systeem een winrate van 55% heeft, gaan er 45 van de 100 trades fout. Dat betekent dat verliezende trades geen bugs zijn — het zijn features. Ze horen erbij.

Wat je nooit mag doen: het systeem aanpassen na een verliezende trade. Je verandert de regels op basis van één datapunt. Dat is wiskundig onverantwoord.

Marcus zegt: het testen van een systeem vereist minimaal 50 trades onder identieke omstandigheden. Pas daarna heb je genoeg data om te beslissen of het systeem werkt of niet. Doe je aanpassingen eerder, handel je op ruis.

De discipline om een systeem te volgen als het even tegenzit, is wat winstgevende traders onderscheidt van verliezende traders. Niet de strategie — de discipline.`,
        contentEN: `A trading system is a set of rules that determines when you enter and exit, how large your position is, and when you don't trade. Without a system, you're not a trader — you're a gambler with a charting app.

The problem most traders have: they build a system, but adjust it as soon as it stops working for a moment. A losing trade, and suddenly the rules are "no longer applicable." Two losing trades, and the system is "broken." This is the deepest mistake you can make.

Why does a system work? Because it's based on statistics over hundreds of trades. If your system has a win rate of 55%, 45 out of 100 trades will go wrong. That means losing trades aren't bugs — they're features. They're part of it.

What you must never do: adjust the system after a losing trade. You're changing the rules based on one data point. That is mathematically irresponsible.

Marcus says: testing a system requires a minimum of 50 trades under identical conditions. Only then do you have enough data to decide whether the system works or not. Make adjustments earlier and you're acting on noise.

The discipline to follow a system when it's going against you is what separates profitable traders from losing traders. Not the strategy — the discipline.`,
        checkNL: {
          q: "Je systeem heeft duidelijke entry-voorwaarden. Vandaag zie je een setup die er bijna aan voldoet — maar niet helemaal. Je voelt sterk dat het gaat werken. Wat doe je?",
          options: [
            "Neem de trade — het gevoel zegt dat het goed gaat",
            "Sla de trade over — mijn systeem zegt nee, dus is er geen trade",
            "Pas de entry-voorwaarde iets aan zodat de trade geldig is",
          ],
          correct: 1,
          explain: "Optie B is het enige correcte antwoord. Optie A is discretionair handelen — je vervangt je systeem door gevoel. Dat maakt je resultaten onreproduceerbaar en onmeetbaar. Optie C is het ergste: je past je regels aan om één specifieke trade te rechtvaardigen. Dat is niet aanpassen op data — dat is cherrypicking. Over 100 trades waarbij je 'bijna' geldig als geldig beschouwt, verdun je je edge tot nul. Je systeem is pas iets waard als je het ook volgt als je er geen zin in hebt.",
        },
        checkEN: {
          q: "Your system has clear entry conditions. Today you see a setup that almost meets them — but not quite. You have a strong feeling it will work. What do you do?",
          options: [
            "Take the trade — my gut says it's going to work",
            "Skip the trade — my system says no, so there is no trade",
            "Adjust the entry condition slightly so the trade becomes valid",
          ],
          correct: 1,
          explain: "Option B is the only correct answer. Option A is discretionary trading — you're replacing your system with gut feeling. That makes your results unreproducible and unmeasurable. Option C is the worst: you're adjusting your rules to justify one specific trade. That's not adapting based on data — that's cherrypicking. Over 100 trades where you count 'almost valid' as valid, you dilute your edge to zero. Your system is only worth something when you follow it even when you don't feel like it.",
        },
      },
      {
        id: "l6-journal",
        icon: "📓",
        titleNL: "Het trading journal — je enige echte coach",
        titleEN: "The trading journal — your only real coach",
        contentNL: `Een trading journal is de meest onderbenutte tool in de wereld van retail trading. Meer dan 90% van de traders die structureel verliest, journalt niet. Meer dan 80% van de traders die structureel wint, journalt wel. Dat is geen toeval.

Waarom werkt een journal? Omdat de mens slecht is in het herkennen van eigen patronen. We herinneren ons de winsten scherper dan de verliezen. We zien onze fouten niet als patroon maar als pech. Het journal maakt het onzichtbare zichtbaar.

Wat moet erin? Niet alleen de resultaten — de context. Op welk niveau stond de RSI? Was de trend op de hogere timeframe bullish of bearish? Hoe voelde je je toen je de trade plaatste — kalm, gefrustreerd, opgewonden? Na hoeveel minuten ging je trade de verkeerde kant op? Allemaal data.

Na 30 trades kun je terugkijken en zien: "ik verlies altijd als ik trade met een bearish trend op de 4H." Of: "mijn beste trades zijn altijd vroeg in de ochtend." Of: "elke trade die ik doe als ik gefrustreerd ben, verlies ik."

Marcus zegt: zonder journal heb je na 100 trades geen idee of je beter bent geworden. Met journal heb je een bewijs. Gebruik het.`,
        contentEN: `A trading journal is the most underutilized tool in the world of retail trading. More than 90% of traders who structurally lose do not journal. More than 80% of traders who structurally win do journal. That is not a coincidence.

Why does a journal work? Because humans are poor at recognizing their own patterns. We remember wins more sharply than losses. We don't see our mistakes as a pattern but as bad luck. The journal makes the invisible visible.

What should be in it? Not just the results — the context. What level was RSI at? Was the trend on the higher timeframe bullish or bearish? How did you feel when you placed the trade — calm, frustrated, excited? After how many minutes did your trade go the wrong way? All data.

After 30 trades you can look back and see: "I always lose when I trade against a bearish trend on the 4H." Or: "my best trades are always early in the morning." Or: "every trade I make when I'm frustrated, I lose."

Marcus says: without a journal, after 100 trades you have no idea whether you've improved. With a journal you have proof. Use it.`,
        checkNL: {
          q: "Je hebt een verliezende week gehad. Je opent je journal. Wat schrijf je?",
          options: [
            "Niets — het was al een slechte week, ik wil er niet nog langer bij stilstaan",
            "Een korte samenvatting van wat er mis ging",
            "Voor elke trade: entry, exit, emotie op het moment van entry, marktcontext, en wat ik er van leer",
          ],
          correct: 2,
          explain: "Optie C is de enige waardevolle keuze. Optie A is het meest voorkomend — en het meest destructief. Je mist precies de data die je zou helpen om volgende week beter te presteren. Optie B is al beter, maar onvolledig. Zonder de emotionele context en het marktoverzicht weet je niet *waarom* je verloor — of het aan je systeem lag, aan de markt, of aan je toestand. Verliezende weken zijn de meest waardevolle leermomenten — maar alleen als je ze documenteert. Traders die hun verliezende periodes goed journalen, presteren over de volgende 100 trades aantoonbaar beter.",
        },
        checkEN: {
          q: "You've had a losing week. You open your journal. What do you write?",
          options: [
            "Nothing — it was already a bad week, I don't want to dwell on it longer",
            "A brief summary of what went wrong",
            "For each trade: entry, exit, emotion at entry, market context, and what I learn from it",
          ],
          correct: 2,
          explain: "Option C is the only valuable choice. Option A is the most common — and the most destructive. You miss exactly the data that would help you perform better next week. Option B is already better, but incomplete. Without the emotional context and market overview you don't know *why* you lost — whether it was your system, the market, or your state of mind. Losing weeks are the most valuable learning moments — but only if you document them. Traders who journal their losing periods well demonstrably perform better over the next 100 trades.",
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

// ── Diagrammen ───────────────────────────────────────────────────────────────
function renderDiagram(id: string, lang: string): React.ReactNode {
  const isEN = lang === "en";
  const txt = { color: "#c9b3cb", fontSize: 10, fontFamily: "sans-serif" };

  if (id === "candles") {
    // Green candle: wick x=85, rect x=70-100 — labels to the LEFT
    // Red candle:   wick x=215, rect x=200-230 — labels to the RIGHT
    // Center label for Wick + Body + Bullish/Bearish titles
    return (
      <svg viewBox="0 0 300 165" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Candlestick diagram">
        {/* ── Groene (bullish) kaars ── */}
        <line x1="85" y1="18" x2="85" y2="148" stroke="#26c57c" strokeWidth="1.5" />
        <rect x="70" y="52" width="30" height="65" fill="#26c57c" rx="2" />
        {/* Titel */}
        <text x="85" y="10" {...txt} fill="#26c57c" fontWeight="bold" textAnchor="middle" fontSize={10}>{isEN ? "Bullish" : "Bullish"}</text>
        {/* Labels LINKS van groene kaars */}
        <text x="58" y="22" {...txt} textAnchor="end">High</text>
        <text x="58" y="57" {...txt} textAnchor="end">{isEN ? "Close" : "Close"}</text>
        <text x="58" y="120" {...txt} textAnchor="end">{isEN ? "Open" : "Open"}</text>
        <text x="58" y="152" {...txt} textAnchor="end">Low</text>
        {/* Connector lijnen links */}
        <line x1="60" y1="19" x2="68" y2="19" stroke="#c9b3cb" strokeWidth="0.8" />
        <line x1="60" y1="54" x2="68" y2="54" stroke="#c9b3cb" strokeWidth="0.8" />
        <line x1="60" y1="117" x2="68" y2="117" stroke="#c9b3cb" strokeWidth="0.8" />
        <line x1="60" y1="148" x2="68" y2="148" stroke="#c9b3cb" strokeWidth="0.8" />
        {/* Body label */}
        <text x="85" y="89" {...txt} fill="#26c57c" fontWeight="bold" fontSize={9} textAnchor="middle">{isEN ? "Body" : "Body"}</text>

        {/* Midden: Wick pijl + scheiding */}
        <line x1="149" y1="12" x2="149" y2="158" stroke="rgba(201,179,203,0.15)" strokeWidth="1" />
        <text x="150" y="89" {...txt} textAnchor="middle" fontSize={9}>Wick</text>
        <text x="150" y="101" {...txt} textAnchor="middle" fontSize={8}>{isEN ? "(shadow)" : "(schaduw)"}</text>

        {/* ── Rode (bearish) kaars ── */}
        <line x1="215" y1="18" x2="215" y2="148" stroke="#e91e63" strokeWidth="1.5" />
        <rect x="200" y="52" width="30" height="65" fill="#e91e63" rx="2" />
        {/* Titel */}
        <text x="215" y="10" {...txt} fill="#e91e63" fontWeight="bold" textAnchor="middle" fontSize={10}>{isEN ? "Bearish" : "Bearish"}</text>
        {/* Labels RECHTS van rode kaars */}
        <text x="242" y="22" {...txt}>High</text>
        <text x="242" y="57" {...txt}>{isEN ? "Open" : "Open"}</text>
        <text x="242" y="120" {...txt}>{isEN ? "Close" : "Close"}</text>
        <text x="242" y="152" {...txt}>Low</text>
        {/* Connector lijnen rechts */}
        <line x1="231" y1="19" x2="239" y2="19" stroke="#c9b3cb" strokeWidth="0.8" />
        <line x1="231" y1="54" x2="239" y2="54" stroke="#c9b3cb" strokeWidth="0.8" />
        <line x1="231" y1="117" x2="239" y2="117" stroke="#c9b3cb" strokeWidth="0.8" />
        <line x1="231" y1="148" x2="239" y2="148" stroke="#c9b3cb" strokeWidth="0.8" />
        {/* Body label */}
        <text x="215" y="89" {...txt} fill="#e91e63" fontWeight="bold" fontSize={9} textAnchor="middle">{isEN ? "Body" : "Body"}</text>
      </svg>
    );
  }

  if (id === "trend") {
    // Uptrend: punten stijgen (HH/HL), Downtrend: punten dalen (LH/LL)
    const up = [
      [10, 120], [35, 80], [55, 100], [85, 55], [105, 75], [135, 30],
    ] as [number, number][];
    const dn = [
      [10, 30], [35, 70], [55, 50], [85, 95], [105, 75], [135, 120],
    ] as [number, number][];
    const upPath = up.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
    const dnPath = dn.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");

    return (
      <svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Trend diagram">
        {/* Uptrend — linker helft */}
        <text x="75" y="14" {...txt} textAnchor="middle" fill="#26c57c" fontWeight="bold">{isEN ? "Uptrend" : "Uptrend"}</text>
        <g transform="translate(5, 10)">
          <path d={upPath} fill="none" stroke="#26c57c" strokeWidth="2" strokeLinejoin="round" />
          {/* HH labels */}
          <text x={up[1][0] - 3} y={up[1][1] - 6} {...txt} fill="#26c57c" fontSize={9}>HH</text>
          <text x={up[3][0] - 3} y={up[3][1] - 6} {...txt} fill="#26c57c" fontSize={9}>HH</text>
          <text x={up[5][0] - 3} y={up[5][1] - 6} {...txt} fill="#26c57c" fontSize={9}>HH</text>
          {/* HL labels */}
          <text x={up[2][0] - 3} y={up[2][1] + 12} {...txt} fill="#26c57c" fontSize={9}>HL</text>
          <text x={up[4][0] - 3} y={up[4][1] + 12} {...txt} fill="#26c57c" fontSize={9}>HL</text>
        </g>

        {/* Scheidingslijn */}
        <line x1="152" y1="10" x2="152" y2="145" stroke="#3d2a3b" strokeWidth="1" />

        {/* Downtrend — rechter helft */}
        <text x="225" y="14" {...txt} textAnchor="middle" fill="#e91e63" fontWeight="bold">{isEN ? "Downtrend" : "Downtrend"}</text>
        <g transform="translate(158, 10)">
          <path d={dnPath} fill="none" stroke="#e91e63" strokeWidth="2" strokeLinejoin="round" />
          {/* LH labels */}
          <text x={dn[0][0] - 3} y={dn[0][1] - 6} {...txt} fill="#e91e63" fontSize={9}>LH</text>
          <text x={dn[2][0] - 3} y={dn[2][1] - 6} {...txt} fill="#e91e63" fontSize={9}>LH</text>
          <text x={dn[4][0] - 3} y={dn[4][1] - 6} {...txt} fill="#e91e63" fontSize={9}>LH</text>
          {/* LL labels */}
          <text x={dn[1][0] - 3} y={dn[1][1] + 12} {...txt} fill="#e91e63" fontSize={9}>LL</text>
          <text x={dn[3][0] - 3} y={dn[3][1] + 12} {...txt} fill="#e91e63" fontSize={9}>LL</text>
        </g>

        {/* Legenda */}
        <text x="150" y="145" {...txt} textAnchor="middle" fontSize={9}>{isEN ? "HH = Higher High · HL = Higher Low · LH = Lower High · LL = Lower Low" : "HH = Hoger Hoogtepunt · HL = Hoger Dieptepunt · LH = Lager Hoogtepunt · LL = Lager Dieptepunt"}</text>
      </svg>
    );
  }

  if (id === "sr") {
    // Support at y=105, Resistance at y=42
    // Price: starts mid, drops to support (bounce 1), rises to resistance, drops to support (bounce 2),
    //        rises to resistance, drops to support (bounce 3), then breaks through resistance → breakout
    const pts: [number, number][] = [
      [10, 75],   // start
      [28, 105],  // bounce 1 at support
      [48, 45],   // rise to resistance
      [68, 105],  // bounce 2 at support
      [88, 45],   // rise to resistance
      [108, 105], // bounce 3 at support
      [132, 38],  // break through resistance
      [165, 18],  // keep climbing (breakout confirmed)
    ];
    const pricePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");

    return (
      <svg viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Support en Resistance diagram">
        {/* Support lijn */}
        <line x1="5" y1="105" x2="185" y2="105" stroke="#26c57c" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="190" y="109" {...txt} fill="#26c57c" fontSize={10}>{isEN ? "Support" : "Support"}</text>

        {/* Resistance lijn — eindigt bij breakout punt */}
        <line x1="5" y1="42" x2="128" y2="42" stroke="#e91e63" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="190" y="46" {...txt} fill="#e91e63" fontSize={10} textAnchor="start">{isEN ? "Resistance" : "Resistance"}</text>

        {/* Prijs lijn */}
        <path d={pricePath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />

        {/* Bounce pijlen op support */}
        <text x={pts[1][0]} y={pts[1][1] + 13} {...txt} fill="#26c57c" fontSize={10} textAnchor="middle">↑</text>
        <text x={pts[3][0]} y={pts[3][1] + 13} {...txt} fill="#26c57c" fontSize={10} textAnchor="middle">↑</text>
        <text x={pts[5][0]} y={pts[5][1] + 13} {...txt} fill="#26c57c" fontSize={10} textAnchor="middle">↑</text>

        {/* Breakout label */}
        <text x={pts[7][0] + 8} y={pts[7][1] + 4} {...txt} fill="#f59e0b" fontSize={9} textAnchor="start">{isEN ? "🚀 Breakout" : "🚀 Breakout"}</text>

        {/* Legenda */}
        <text x="150" y="133" {...txt} textAnchor="middle" fontSize={9}>
          {isEN ? "Price bounces off support 3× then breaks resistance" : "Prijs bounced 3× van support, dan breakout"}
        </text>
      </svg>
    );
  }

  return null;
}

// ── Lesson Card ─────────────────────────────────────────────────────────────
function LessonCard({ lesson, lang, isRead, onRead, onQuizClick, isPublic, lessonNum, totalLessons }: {
  lesson: Lesson;
  lang: string;
  isRead: boolean;
  onRead: (id: string) => void;
  onQuizClick: () => void;
  isPublic?: boolean;
  lessonNum: number;
  totalLessons: number;
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
      <div className="lesson-card lesson-card--locked">
        <div className="lesson-card-header">
          <span className="lesson-card-num">🔒</span>
          <span className="lesson-card-title">{title}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`lesson-card${isRead ? " lesson-card--read" : ""}${open ? " lesson-card--open" : ""}`}>
      <button className="lesson-card-header" onClick={toggle}>
        <div className="lesson-card-meta">
          <span className="lesson-card-num">
            {lang === "en" ? `Lesson ${lessonNum}` : `Les ${lessonNum}`}
            <span className="lesson-card-of"> / {totalLessons}</span>
          </span>
          {isRead && <span className="lesson-card-done">{lang === "en" ? "✓ Done" : "✓ Gelezen"}</span>}
        </div>
        <div className="lesson-card-title-row">
          <span className="lesson-card-icon">{lesson.icon}</span>
          <span className="lesson-card-title">{title}</span>
          <span className="lesson-card-arrow">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="lesson-body">
          {/* Leestekst */}
          <div className="lesson-text">
            {content.split("\n\n").map((para, i) => {
              // Detecteer lijstregels (beginnen met —, ·, -, •, of genummerd)
              const lines = para.split("\n");
              const isList = lines.length > 1 && lines.every(l => /^[—·\-•]/.test(l.trim()) || /^\d+\./.test(l.trim()));
              if (isList) {
                return (
                  <ul key={i} className="lesson-list">
                    {lines.map((l, j) => (
                      <li key={j}>{l.replace(/^[—·\-•]\s*/, "").replace(/^\d+\.\s*/, "")}</li>
                    ))}
                  </ul>
                );
              }
              // Speciale Marcus-uitspraken (beginnen met "Marcus zegt:" of "Marcus says:")
              if (/^Marcus (zegt|says):/.test(para)) {
                return (
                  <blockquote key={i} className="lesson-marcus-quote">
                    <span className="lesson-marcus-initial">M</span>
                    <span>{para.replace(/^Marcus (zegt|says):\s*/, "")}</span>
                  </blockquote>
                );
              }
              // Sectie-koppen (volledig hoofdletters of eindigen op ":")
              if (para === para.toUpperCase() && para.length < 60 && !para.includes("€") && !para.includes("%")) {
                return <h3 key={i} className="lesson-section-heading">{para}</h3>;
              }
              return <p key={i} className="lesson-para">{para}</p>;
            })}
          </div>

          {/* Diagram */}
          {lesson.diagramId && (
            <div className="lesson-diagram">
              {renderDiagram(lesson.diagramId, lang)}
            </div>
          )}

          {/* Begrippenlijst */}
          {terms && terms.length > 0 && (
            <div className="lesson-terms">
              <div className="lesson-terms-heading">
                {lang === "en" ? "Key Terms" : "Begrippen"}
              </div>
              <dl className="lesson-terms-list">
                {terms.map((t, i) => (
                  <div key={i} className="lesson-term-row">
                    <dt className="lesson-term-name">{t.term}</dt>
                    <dd className="lesson-term-def">{t.def}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Toetsvraag */}
          {check && (
            <div className="lesson-check-section">
              <div className="lesson-check-heading">
                {lang === "en" ? "Test yourself" : "Test jezelf"}
              </div>
              <CheckQuestion check={check} lang={lang} />
            </div>
          )}

          {/* CTA na lezen */}
          {isRead && (
            <div className="lesson-done-cta">
              <span className="lesson-done-msg">
                {lang === "en" ? "Lesson completed — ready for the quiz?" : "Les voltooid — klaar voor de quiz?"}
              </span>
              <button className="lesson-done-btn" onClick={onQuizClick}>
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
  const [readMap, setReadMap] = useState<ReadMap>({});
  const [userLevel, setUserLevel] = useState(1);
  const [activeLevel, setActiveLevel] = useState(1);
  const [isPro, setIsPro] = useState(false);

  const PRO_LEVEL_START = 3;

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch("/api/me/quiz").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.level) {
        setUserLevel(d.level);
        setActiveLevel(d.level);
      }
    }).catch(() => {});

    fetch("/api/me/pro").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.isPro) setIsPro(true);
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
          const locked = lvl.level > userLevel + 1;
          const proRequired = lvl.level >= PRO_LEVEL_START && !isPro;
          return (
            <button
              key={lvl.level}
              className={`curriculum-level-tab${activeLevel === lvl.level ? " active" : ""}${locked ? " locked" : ""}${proRequired && !locked ? " pro-required" : ""}`}
              onClick={() => !locked && setActiveLevel(lvl.level)}
              title={locked ? (lang === "en" ? "Complete previous level first" : "Voltooi vorig niveau eerst") : ""}
            >
              {locked ? "🔒" : proRequired ? "✦" : label}
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
                ? "17 more lessons, a quiz at your level, and Marcus as your personal coach. Completely free."
                : "Nog 17 lessen, een quiz op jouw niveau en Marcus als persoonlijke coach. Volledig gratis."}
            </p>
            <Link href="/auth/register" className="curriculum-gate-cta">
              {lang === "en" ? "Register for free →" : "Gratis registreren →"}
            </Link>
          </div>
        </div>
      )}

      {/* Marcus Pro gate voor niveaus 3+ */}
      {activeLevel >= PRO_LEVEL_START && !isPro ? (
        <div className="pro-gate-banner">
          <div className="pro-gate-icon">✦</div>
          <div className="pro-gate-body">
            <div className="pro-gate-title">
              {lang === "en" ? "Marcus Pro — required for this level" : "Marcus Pro — vereist voor dit niveau"}
            </div>
            <p className="pro-gate-desc">
              {lang === "en"
                ? "Levels 3–6 are part of Marcus Pro. Upgrade to unlock Technical Analysis, Advanced, Mastery and Psychology — the levels that make the real difference."
                : "Niveau 3–6 zijn onderdeel van Marcus Pro. Upgrade om Technische Analyse, Geavanceerd, Meesterschap en Psychologie te ontgrendelen — de niveaus die het echte verschil maken."}
            </p>
            <div className="pro-gate-features">
              {[
                lang === "en" ? "All 6 curriculum levels" : "Alle 6 curriculumniveaus",
                lang === "en" ? "Unlimited Marcus chat" : "Onbeperkte Marcus chat",
                lang === "en" ? "Live Trading certificate" : "Live Trading certificaat",
              ].map((f, i) => (
                <span key={i} className="pro-gate-feature-pill">✓ {f}</span>
              ))}
            </div>
            <div className="pro-gate-pricing">
              <span className="pro-gate-price">€9,99<span className="pro-gate-unit">/maand</span></span>
              <span className="pro-gate-or">{lang === "en" ? "or" : "of"}</span>
              <span className="pro-gate-price">€79<span className="pro-gate-unit">/jaar</span></span>
            </div>
            <Link href="/pro" className="pro-gate-cta">
              {lang === "en" ? "Upgrade to Marcus Pro →" : "Upgrade naar Marcus Pro →"}
            </Link>
          </div>
        </div>
      ) : (
        <div className="curriculum-lessons">
          {levelData.lessons.map((lesson, idx) => {
            const lessonPublic = isLoggedIn || (activeLevel === 1 && idx === 0);
            return (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                lang={lang}
                isRead={!!readMap[lesson.id]}
                onRead={markRead}
                onQuizClick={() => onQuizTabClick?.()}
                isPublic={lessonPublic}
                lessonNum={idx + 1}
                totalLessons={levelData.lessons.length}
              />
            );
          })}
        </div>
      )}

      <button className="curriculum-marcus-btn" onClick={askMarcus}>
        👤 {lang === "en" ? "Ask Marcus for a practice exercise" : "Vraag Marcus om een oefening"}
      </button>
    </div>
  );
}
