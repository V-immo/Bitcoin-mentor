const Database = require("better-sqlite3");
const path = require("path");
const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data", "bitcoin-mentor.db");
const db = new Database(dbPath);

db.exec(`CREATE TABLE IF NOT EXISTS trading_knowledge (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  topic   TEXT    NOT NULL,
  tags    TEXT    NOT NULL,
  source  TEXT    NOT NULL,
  lesson  TEXT    NOT NULL,
  level   INTEGER NOT NULL DEFAULT 1
)`);

const count = db.prepare("SELECT COUNT(*) as c FROM trading_knowledge").get();
if (count.c > 0) {
  console.log("ℹ️  trading_knowledge al gevuld — skip");
  db.close();
  process.exit(0);
}

const insert = db.prepare("INSERT INTO trading_knowledge (topic, tags, source, lesson, level) VALUES (?, ?, ?, ?, ?)");
const insertAll = db.transaction((rows) => {
  for (const r of rows) insert.run(r.topic, r.tags, r.source, r.lesson, r.level);
});

const knowledge = [
  // PSYCHOLOGY
  { topic: "psychology", tags: "angst,fear,emotion,emotie,bang,panic,paniek", source: "Mark Douglas", lesson: "Angst in trading komt van het verwachten van een bepaalde uitkomst. Accepteer dat elke uitkomst mogelijk is — dan verdwijnt de angst.", level: 1 },
  { topic: "psychology", tags: "verlies,loss,losing,pijn,pain,verliezen", source: "Mark Douglas", lesson: "Een verlies is geen falen — het is de kosten van zakendoen. Een slechte trade is er een waarbij je je regels brak, niet één die verlies gaf.", level: 1 },
  { topic: "psychology", tags: "winnen,winner,winning,greed,hebzucht,profit,winst", source: "Ed Seykota", lesson: "Hebzucht doodt traders. Als de trade goed gaat, is de neiging om meer in te zetten. Dat is wanneer de markt je pakt.", level: 2 },
  { topic: "psychology", tags: "fomo,gemist,missed,spijt,regret,te laat", source: "Jesse Livermore", lesson: "Er is altijd een volgende trade. De markt gaat nooit weg. FOMO is de vijand van goed positionmanagement.", level: 1 },
  { topic: "psychology", tags: "hoop,hope,hopen,wachten,praying,recovery", source: "Mark Douglas", lesson: "Als je 'hoopt' dat een trade terugkomt — heb je al verloren. Hoop is geen strategie. Stop-loss wel.", level: 1 },
  { topic: "psychology", tags: "discipline,systeem,system,regels,rules,consistent", source: "Richard Dennis", lesson: "Trading discipline is niet over karakter — het is over het hebben van duidelijke regels en ze mechanisch uitvoeren.", level: 2 },
  { topic: "psychology", tags: "zelfvertrouwen,confidence,twijfel,doubt,onzeker", source: "Mark Douglas", lesson: "Vertrouwen in trading komt niet van het weten wat de markt gaat doen. Het komt van weten hoe jij reageert op alles wat de markt doet.", level: 2 },
  { topic: "psychology", tags: "revenge,wraak,revenge trading,verlies goedmaken", source: "Paul Tudor Jones", lesson: "Revenge trading — een verlies direct goedmaken — is de snelste manier naar een grote drawdown. Stop na een verlies. Reset.", level: 1 },
  { topic: "psychology", tags: "overtraden,overtrading,te veel trades,bored,verveling", source: "Jesse Livermore", lesson: "De markt betaalt niet voor activiteit. Het betaalt voor geduld en correcte actie op het juiste moment.", level: 2 },
  { topic: "psychology", tags: "process,uitkomst,outcome,resultaat,beoordelen", source: "Mark Douglas", lesson: "Beoordeel een trade op het proces, niet de uitkomst. Een goede beslissing kan verlies geven. Dat is geen probleem.", level: 2 },

  // RISK MANAGEMENT
  { topic: "risk-management", tags: "stop-loss,stoploss,stop,verlies,risico,risk", source: "Jesse Livermore", lesson: "Eerste verlies is je kleinste verlies. Gooi een verliezende positie meteen weg — nooit vasthouden in de hoop op herstel.", level: 1 },
  { topic: "risk-management", tags: "stop-loss,stoploss,stop plaatsen,waar,level", source: "Adam Grimes", lesson: "Stop-loss staat niet waar jij pijn voelt, maar waar je setup ongeldig wordt. Marktstructuur bepaalt de stop, niet jouw comfort.", level: 2 },
  { topic: "risk-management", tags: "risico,risk,procent,percentage,hoeveel,kapitaal", source: "Van Tharp", lesson: "Riseer nooit meer dan 1-2% van je totale kapitaal per trade. Met 50 slechte trades achter elkaar overleefd je nog steeds.", level: 1 },
  { topic: "risk-management", tags: "drawdown,verliesreeks,losing streak,serie,verlies", source: "Van Tharp", lesson: "Een verliesreeks is statistisch onvermijdelijk. Bij 1% risico per trade overleef je 20 verliezen op rij. Bij 10% risico ben je failliet.", level: 2 },
  { topic: "risk-management", tags: "positie,position,grootte,size,sizing,hoeveel kopen", source: "Van Tharp", lesson: "Position sizing is de enige variabele die bepaalt of je op lange termijn overleeft. Kennis van de markt is secundair.", level: 1 },
  { topic: "risk-management", tags: "risk reward,RR,ratio,verhouding,winst verlies", source: "Van Tharp", lesson: "Streef naar minimum 2:1 risk/reward. Met 40% winrate en 2R gemiddelde winst ben je winstgevend op lange termijn.", level: 1 },
  { topic: "risk-management", tags: "average down,bijkopen,middelen,averaging", source: "Paul Tudor Jones", lesson: "Nooit bijkopen in een verliezende positie. Dat vergroot een slechte trade. Koop alleen bij als de markt jou gelijk geeft.", level: 1 },
  { topic: "risk-management", tags: "capital,kapitaal,beschermen,preserve,defensive", source: "Paul Tudor Jones", lesson: "Eerste prioriteit: overleef. Tweede prioriteit: maak winst. Bescherm je kapitaal als een schaars goed.", level: 1 },
  { topic: "risk-management", tags: "R multiple,r-multiple,winst uitdrukken,meten", source: "Van Tharp", lesson: "Meet elke trade in R. Als je €50 riskeert (1R) en €150 wint, maak je 3R. Zo vergelijk je trades ongeacht het bedrag.", level: 2 },
  { topic: "risk-management", tags: "correlatie,correlation,portfolio,meerdere assets", source: "Van Tharp", lesson: "Trading meerdere gecorreleerde assets vergroot je risico niet X keer — het vergroot het X². Bitcoin en ETH bewegen samen — dat is eigenlijk één positie.", level: 3 },

  // ENTRY
  { topic: "entry", tags: "instappen,entry,kopen,buy,wanneer,timing", source: "Jesse Livermore", lesson: "Koop niet terwijl de prijs daalt. Wacht tot de prijs bewijst dat hij omhoog gaat. Het bewijs is altijd duurder dan gokken, maar veiliger.", level: 1 },
  { topic: "entry", tags: "breakout,uitbraak,weerstand,resistance,doorbreken", source: "Richard Dennis", lesson: "Een echte breakout heeft volume. Uitbraken zonder volume zijn vaak fakeouts. Wacht op de bevestiging.", level: 2 },
  { topic: "entry", tags: "pullback,terugval,retracement,ingaan,entry na stijging", source: "Adam Grimes", lesson: "De beste entries zijn pullbacks naar support in een uptrend — niet breakouts. Lagere prijs, hetzelfde potentieel.", level: 2 },
  { topic: "entry", tags: "te vroeg,too early,anticiperen,anticipate,vooruitlopen", source: "Jesse Livermore", lesson: "Te vroeg instappen kost je geld én zelfvertrouwen. Wacht op het bewijs. Dat de setup straks komt is zekerder dan dat hij nu al begint.", level: 1 },
  { topic: "entry", tags: "koopzone,buy zone,support zone,entry zone,niveau", source: "ICT", lesson: "De beste entries zitten in zones van eerdere vraag (demand zones), niet op willekeurige ronde getallen. Zoek orderblokken.", level: 3 },
  { topic: "entry", tags: "confluent,confluentie,bevestiging,confirmation,meerdere signalen", source: "Adam Grimes", lesson: "Eén signaal is geen reden om in te stappen. Zoek confluent: trend + zone + candle patroon + volume = sterke setup.", level: 2 },
  { topic: "entry", tags: "limit order,marktorder,market order,slippage,type order", source: "Van Tharp", lesson: "Gebruik limit orders bij entries voor betere prijs. Marktorders kosten je slippage — bij crypto kan dat 0.1-0.5% zijn.", level: 2 },

  // EXIT
  { topic: "exit", tags: "uitstappen,exit,verkopen,sell,wanneer,timing verkoop", source: "Jesse Livermore", lesson: "Laat winnaars lopen. De grote winst zit niet in het kopen — het zit in het geduldig houden van een winnende positie.", level: 1 },
  { topic: "exit", tags: "take profit,target,doel,niveau,winst nemen", source: "Van Tharp", lesson: "Stel targets op weerstandsniveaus, niet op ronde getallen. De markt reageert op structuur, niet op $50.000 of $100.000.", level: 2 },
  { topic: "exit", tags: "trailing stop,trailing,volgen,meebewegen,lock in profit", source: "Richard Dennis", lesson: "Gebruik een trailing stop om winst vast te leggen zonder te vroeg te verkopen. Laat de markt je eruit stoppen, verkoop niet uit angst.", level: 2 },
  { topic: "exit", tags: "gedeeltelijk sluiten,partial,half,deel,scale out", source: "Van Tharp", lesson: "Bij 1R winst, sluit 50% positie en zet stop op break-even. Je runt dan gratis de rest — geen risico meer op verlies.", level: 2 },
  { topic: "exit", tags: "te vroeg,too early,vroegtijdig,premature,ongeduldig", source: "Ed Seykota", lesson: "Te vroeg uitstappen is verkapte angst. Als de setup nog intact is, is er geen reden om te verkopen. Vertrouw je systeem.", level: 2 },
  { topic: "exit", tags: "break even,kostprijs,geen risico,veilig", source: "Van Tharp", lesson: "Stop naar break-even als de trade 1R in je voordeel beweegt. Je elimineert het risico terwijl je de upside open houdt.", level: 1 },

  // TREND
  { topic: "trend", tags: "trend,richting,uptrend,downtrend,zijwaarts,sideways", source: "Richard Dennis", lesson: "Trend is je vriend. Trade ALTIJD mee met de grotere trend. Countertrend trades hebben een veel lagere kans van slagen.", level: 1 },
  { topic: "trend", tags: "trend bepalen,identify,herkennen,higher highs,higher lows", source: "Dow Theory", lesson: "Uptrend = hogere highs + hogere lows. Downtrend = lagere highs + lagere lows. Zijwaarts = gelijke highs en lows.", level: 1 },
  { topic: "trend", tags: "timeframe,meerdere timeframes,multi-timeframe,HTF,LTF", source: "Adam Grimes", lesson: "Trade altijd in de richting van de hogere timeframe trend. Daily uptrend + 4H pullback = sterke setup. Nooit andersom.", level: 2 },
  { topic: "trend", tags: "trendbreuk,trend break,structuurbreuk,structure break,keerpunt", source: "ICT", lesson: "Een trend breekt als een significant swing high (in downtrend) of swing low (in uptrend) gebroken wordt op slotbasis.", level: 2 },
  { topic: "trend", tags: "moving average,MA,gemiddelde,200,50,trend indicator", source: "Technical Analysis", lesson: "Prijs boven 200 MA = lange termijn uptrend. Prijs onder 200 MA = lange termijn downtrend. Eenvoudig maar krachtig.", level: 1 },

  // SUPPORT / RESISTANCE
  { topic: "support-resistance", tags: "support,steun,bodem,vloer,floor,bounce", source: "Technical Analysis", lesson: "Support is waar kopers eerder instapten en het verschil maakten. Hoe vaker een niveau getest en gehouden, hoe sterker.", level: 1 },
  { topic: "support-resistance", tags: "resistance,weerstand,plafond,ceiling,afgestoten", source: "Technical Analysis", lesson: "Gebroken resistance wordt nieuwe support. Dit is één van de meest betrouwbare patronen in alle markten.", level: 1 },
  { topic: "support-resistance", tags: "zone,area,area of interest,koopzone,prijszone", source: "Adam Grimes", lesson: "Denk in zones, niet in exacte prijzen. Een support zone van $2.050-$2.100 is realistischer dan exact $2.075.", level: 2 },
  { topic: "support-resistance", tags: "false break,fakeout,liquidity sweep,sweep,fake", source: "ICT", lesson: "Markten vegen vaak even door een support of resistance heen om stops te raken — daarna keert de prijs terug. Dit is een liquidity sweep.", level: 3 },

  // POSITION SIZING
  { topic: "position-sizing", tags: "hoeveel,how much,bedrag,amount,inzet,stake", source: "Van Tharp", lesson: "Bepaal eerst je stop-loss in afstand (%), dan bereken je positiegrootte: (Kapitaal × 1%) ÷ stop% = max positie.", level: 1 },
  { topic: "position-sizing", tags: "kelly,kelly criterion,optimaal,optimal,grootte", source: "Van Tharp", lesson: "Het Kelly-criterium geeft de theoretisch optimale inzet. In de praktijk gebruik je half-Kelly om drawdowns te beperken.", level: 3 },
  { topic: "position-sizing", tags: "te groot,too big,over-leveraged,leverage,hefboom", source: "Paul Tudor Jones", lesson: "Te grote posities creëren emotionele beslissingen. Als je positie je 's nachts wakker houdt, is hij te groot.", level: 1 },

  // MARKET STRUCTURE (ICT/SMC)
  { topic: "market-structure", tags: "liquiditeit,liquidity,stops,highs,lows,equal highs", source: "ICT", lesson: "Prijs zoekt altijd liquiditeit. Gelijke highs = verzameling van stops boven die highs. Verwacht een sweep voordat de prijs daalt.", level: 3 },
  { topic: "market-structure", tags: "orderblok,order block,OB,institutioneel,institutional", source: "ICT", lesson: "Een orderblok is de laatste tegengestelde candle voor een sterke move. Prijs keert er vaak naar terug om te herbalanceren.", level: 3 },
  { topic: "market-structure", tags: "fair value gap,FVG,imbalance,onbalans,gap opvullen", source: "ICT", lesson: "Fair Value Gaps zijn prijsgaten door snelle moves. De markt vult ze vaak later in. Koop/verkoop niet in een FVG — wacht op de andere kant.", level: 3 },
  { topic: "market-structure", tags: "choch,change of character,structuurwijziging,shift,keerpunt", source: "ICT", lesson: "Een Change of Character (CHoCH) is het eerste teken van trendwijziging — een swing high gebroken in een downtrend. Vroeg signaal.", level: 3 },

  // CRYPTO-SPECIFIC
  { topic: "crypto", tags: "bitcoin,btc,halving,halvering,cyclus,cycle", source: "Crypto Research", lesson: "Bitcoin halveert elke ~4 jaar. Historisch volgt de sterkste bull market 6-18 maanden na het halving. April 2024 = laatste halving.", level: 2 },
  { topic: "crypto", tags: "altcoin,alts,bitcoin dominantie,dominance,rotatie", source: "Crypto Research", lesson: "Als BTC dominantie daalt terwijl BTC stijgt = geld stroomt naar alts. Als BTC daalt en dominantie stijgt = altcoins bloeden meer.", level: 2 },
  { topic: "crypto", tags: "funding rate,funding,short squeeze,long squeeze,perp", source: "Crypto Research", lesson: "Hoge positieve funding = te veel longs. Markt neigt dan te dalen om longs te liquideren. Negatieve funding = te veel shorts, verwacht stijging.", level: 3 },
  { topic: "crypto", tags: "fear greed,angst,hebzucht,sentiment,extreme,contrarian", source: "Crypto Research", lesson: "Extreme Fear (<25) = historisch beste koopmomenten. Extreme Greed (>75) = verkoop en wacht. Contrarian denken loont.", level: 2 },
  { topic: "crypto", tags: "volume,liquiditeit,dunne markt,thin market,weekend", source: "Crypto Research", lesson: "Crypto heeft 24/7 handel maar dunste volume in weekends en Aziatische sessies. Grote moves in dunne markten zijn minder betrouwbaar.", level: 2 },

  // TRADING MINDSET
  { topic: "mindset", tags: "geduld,patience,wachten,wait,niet handelen,no trade", source: "Jesse Livermore", lesson: "Soms is de beste trade geen trade. Geduldig wachten op de perfecte setup is een vaardigheid die geld oplevert.", level: 1 },
  { topic: "mindset", tags: "journal,dagboek,bijhouden,track,leren van trades", source: "Van Tharp", lesson: "Een trading journal is het meest onderschatte gereedschap. Je leert meer van 50 gedocumenteerde trades dan van 500 random trades.", level: 1 },
  { topic: "mindset", tags: "winst,profit,winstgevend,expectancy,edge,voordeel", source: "Van Tharp", lesson: "Je edge is het enige wat telt op lange termijn. Zonder positieve expectancy maakt geen enkele rule je winstgevend.", level: 2 },
  { topic: "mindset", tags: "leren,learn,beginnen,beginner,ervaring,experience", source: "Mark Douglas", lesson: "Trading is een vak. Verwacht dat het 2-3 jaar duurt voordat je consistent winstgevend bent. Gebruik die tijd om te leren, niet te verdienen.", level: 1 },
  { topic: "mindset", tags: "markt,market,respect,bescheidenheid,humility,wrong", source: "George Soros", lesson: "Het is niet erg om ongelijk te hebben. Het is wel erg om lang ongelijk te blijven. Toegeven dat je fout zit = sterkste eigenschap.", level: 2 },
];

insertAll(knowledge);
console.log(`✅ ${knowledge.length} trading lessen toegevoegd aan kennisbank`);
db.close();
