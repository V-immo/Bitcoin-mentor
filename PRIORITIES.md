# Bitcoin Mentor — Prioriteitenlijst & Internationale Roadmap

Laatste update: 2026-04-07

---

## Voltooide items

### 2026-04-07
- ✅ **Trade Plan Validator** — Marcus beoordeelt trade plan (GOED/AANPASSEN/NIET_DOEN), score 1-10, sterk/zwak/tip
- ✅ **Bitvavo EUR pricefeed** — directe WS, geen conversie meer, prijs klopt exact met Bitvavo app
- ✅ Trading mode badge in topbar (Day/Swing/Long zichtbaar)
- ✅ Neutrale timeframe labels (geen "Swing trading" meer op 4H knop)
- ✅ tab "Handelen" terug naar "Paper Trade" (NL + EN)
- ✅ Agenda terug in navigatie
- ✅ Volledige taalaudit NL/EN — alle strings vertaald, geen hardcoded tekst meer
- ✅ Exchange aanbevelingen per trading mode in Settings (Bybit/Bitvavo/Kraken per dag/swing/long)
- ✅ **Marcus ziet live wat gebruiker ziet** — appContext: asset, prijs, tab, signaal, koopzone, SL, R/R, RSI, trend
- ✅ Volledige APP GIDS in Marcus system prompt — hij kent alle routes, tabs, hoe paper trade openen etc.
- ✅ **Marcus Curriculum** — 5 niveaus volledig uitgeschreven lessen in Marcus-stem + begrippen-woordenboek
- ✅ Quiz topics verdubbeld (30 per niveau, was 15-20) — sterk verminderde herhaling
- ✅ deploy.yml: `rm -rf .next` voor schone builds — geen stale cache fouten meer

### 2026-04-06
- ✅ Marcus past zich aan per trading stijl (day/swing/long) — coaching, timeframes, taal
- ✅ Settings save bug gefixed (goal early-return blokkeerde trading_mode opslaan)
- ✅ Scan engine is mode-aware — 15m zones voor day, 4H voor swing, 1D voor long
- ✅ Trade layout redesign — order panel bovenaan, inline signal hint (entry/SL/TP)
- ✅ DB auto-migratie in getDb() — alle tabellen en kolommen altijd aanwezig op productie

### 2026-03-25
- ✅ Paper trading UX zoals echt platform — buy/sell tabs, SL/TP, equity sparkline
- ✅ 4H candles direct van Binance (juiste timing, filterClosedCandles)
- ✅ WebSocket auto-reconnect met exponential backoff (1s→30s)
- ✅ Quiz vragen cachen in DB + geen dubbele vragen per gebruiker
- ✅ Videos fallback UX — auto-detect geblokkeerde embed, grote YouTube knop
- ✅ Chart labels + Marcus consistent EN/NL (i18n keys)
- ✅ Wachtwoord reset via e-mail (forgot/reset flow, nodemailer, tokens in DB)
- ✅ PWA / installeerbaar als app op telefoon (manifest, icons, SW caching)

### 2026-03-24
- ✅ Alle hardcoded NL strings vertaald
- ✅ Quiz JSON afkap gefixed
- ✅ "Trading Mentor" + "Marcus AI" samengevoegd → Mentor Marcus tab

---

## FASE 1 — Direct doen (fundering internationaal)

| # | Item | Impact | Status |
|---|------|--------|--------|
| 1 | **Exchange aanbevelingen per mode** — in Settings tonen welk platform past (day→Bybit/Kraken, swing/long→Bitvavo) | ⭐⭐⭐⭐ | ✅ |
| 2 | **Bybit API integratie** — keys koppelen, live saldo + orders (net zoals Bitvavo). 0.10% fees, wereldwijd beschikbaar | ⭐⭐⭐⭐⭐ | ✅ |
| 3 | **Landdetectie + juiste exchange aanbevelen** — automatisch op basis van IP/land | ⭐⭐⭐⭐ | ✅ |
| 4 | **USD als standaard voor niet-EU gebruikers** — nu is EUR hardcoded default | ⭐⭐⭐ | ✅ |
| 5 | **Alerts via e-mail** — push als asset in koopzone komt | ⭐⭐⭐⭐ | ✅ |
| 6 | **Onboarding flow** — stap-voor-stap intro, trading stijl kiezen, exchange koppelen | ⭐⭐⭐⭐ | ✅ |
| 7 | **Admin: quiz pool beheren** — knop in admin om pool bij te vullen per level | ⭐⭐⭐ | ⬜ |
| 8 | **Trade journal exporteren** — CSV/Excel download | ⭐⭐⭐ | ⬜ |

---

## FASE 2 — Groei & differentiatie

| # | Item | Impact | Status |
|---|------|--------|--------|
| 9 | **Marcus memory** — onthoudt stijl, niveau, vorige trades over sessies heen. Niemand doet dit écht goed | ⭐⭐⭐⭐⭐ | ✅ |
| 10 | **Trade Plan Validator** — voor je een trade doet, leg het plan voor aan Marcus. Hij geeft een score (setup kwaliteit, R:R, risico) en rode vlaggen. *Bestaat nergens anders in deze vorm* | ⭐⭐⭐⭐⭐ | ✅ |
| 11 | **Psychology score per trade** — na elke trade vul je emotie in (FOMO, rustig, twijfel). Marcus correleert dit over tijd: "je handelt 31% slechter als je FOMO voelt" | ⭐⭐⭐⭐⭐ | ⬜ |
| 12 | **Multi-asset vergelijking** — scan alle assets naast elkaar, filter op beste setup | ⭐⭐⭐⭐ | ⬜ |
| 13 | **Meertalig uitbreiden** — ES, FR, DE (Marcus toon per taal aanpassen, niet alleen vertalen) | ⭐⭐⭐⭐ | ⬜ |
| 14 | **Tijdzone bewustzijn Marcus** — hij kent Aziatische, Europese en VS sessies, past advies aan | ⭐⭐⭐ | ⬜ |
| 15 | **OKX integratie** — groot in Azië + Midden-Oosten, 0.08% maker | ⭐⭐⭐⭐ | ⬜ |
| 16 | **MEXC integratie** — populair Azië, 0% maker fees, meest agressieve fee structuur ter wereld | ⭐⭐⭐ | ⬜ |

---

## FASE 3 — Innovatie (dingen die nog niet bestaan)

Dit zijn functies die nergens anders bestaan in deze combinatie. Dit is wat Bitcoin Mentor onderscheidt.

| # | Feature | Waarom uniek | Impact |
|---|---------|--------------|--------|
| 17 | **Marcus als live trade coach** — je deelt je scherm/chart en Marcus geeft real-time commentaar op je entry | Geen enkel platform heeft een AI die live meekijkt op een chart | ⭐⭐⭐⭐⭐ |
| 18 | **Learn-to-Earn** — kleine crypto rewards (USDC/BTC satoshis) als je quizzes haalt of trades goed executeert | Binance/CoinMarketCap doen dit maar niet gecombineerd met echte coaching | ⭐⭐⭐⭐⭐ |
| 19 | **Verified track record op blockchain** — Marcus zijn signalen worden on-chain gelogd, publiek verifieerbaar. Geen enkele AI-coach doet dit | Vertrouwen = het grootste probleem in deze markt | ⭐⭐⭐⭐⭐ |
| 20 | **Copy Marcus** — volg Marcus zijn signalen automatisch via Bybit/OKX API. Marcus triggert een order als alle condities kloppen | eToro heeft copy trading maar niet AI-gegenereerde signalen | ⭐⭐⭐⭐⭐ |
| 21 | **Slaap & stress tracking** — koppel Apple Health/Google Fit. Marcus ziet: "je hebt 5u geslapen en handelt nu — ik raad dit af" | Niemand doet wearable integratie voor trading psychology | ⭐⭐⭐⭐ |
| 22 | **Community met verified P&L** — leaderboard waar trades verifieerbaar zijn (niet zelf-gerapporteerd). Rangschik op risico-gecorrigeerd rendement, niet alleen winst | eToro leaderboard is gaming-gevoelig. Verified = anders | ⭐⭐⭐⭐ |
| 23 | **Marcus voice** — praat met Marcus via microfoon, hij antwoordt met stem. Handig tijdens traden als je handen vol zijn | Geen enkele trading coach heeft stem-interface | ⭐⭐⭐⭐ |
| 24 | **Swing/Day trade replay** — bekijk je vorige trades terug als video met candles + Marcus commentaar achteraf | TraderVue doet journaling maar geen AI replay coaching | ⭐⭐⭐⭐ |
| 25 | **Trade pre-mortem** — Marcus vraagt VOOR de trade: "Wat kan er misgaan?" Dwingt nadenken over scenario's | Behavioral finance research toont dat pre-mortems grote fouten voorkomen | ⭐⭐⭐⭐ |
| 26 | **Groeps-challenges** — "Wie kan 30 dagen disciplined traden?" Groepen van 5-10 mensen met Marcus als coach voor de groep | Community + accountability = virale groei | ⭐⭐⭐⭐ |
| 27 | **Native mobiele app (iOS + Android)** — nu PWA, maar push notifications + widgets voor koopzones zijn veel sterker native | Internationaal publiek verwacht native | ⭐⭐⭐⭐⭐ |

---

## Internationaal — Exchange per regio

| Regio | Day trading | Swing / Long term |
|---|---|---|
| 🇳🇱 Nederland / EU | Kraken (DNB-vergunning), Bybit | Bitvavo |
| 🌍 Buiten EU (globaal) | Bybit (0.10%, wereldwijd), OKX (0.08%) | Bybit, OKX |
| 🇺🇸 USA | Kraken Pro, Coinbase Advanced | Coinbase, Kraken |
| 🌏 Azië / Pacific | MEXC (0% maker!), OKX, Bybit | Bybit, OKX |
| 🇬🇧 UK | Kraken, Bybit | Kraken, Coinbase |
| 🇦🇪 Midden-Oosten | Bybit, OKX | OKX, Bybit |

**Universele keuze:** Bybit — werkt in bijna elk land, laagste fees, goede API.

---

## Wat de competitie mist (onze kans)

| Platform | Sterk in | Mist |
|---|---|---|
| eToro | Copy trading, sociale feed, 30M+ gebruikers | Echte coaching, geen AI-mentor, geen crypto-only focus |
| Trading212 | Goedkoop, gebruiksvriendelijk | Geen education, geen AI, geen coaching |
| TradingView | Beste charts ter wereld | Geen coaching, geen exchange koppeling, geen leren |
| Binance Academy | Veel gratis content | Niet persoonlijk, geen live coaching, statisch |
| TradeCoachX / TradingRehab | Psychology analyse | Losstaand van exchange, geen live signalen |
| Bybit Copy Trading | Goede copy trade infra | Geen educatie, geen AI coach |

**Bitcoin Mentor = het enige platform dat combineert:**
coaching + signalen + paper trading + exchange koppeling + quiz + psychology → alles in één

---

## Regels
- Medium → Perfect: altijd afmaken tot productieniveau
- Lijst aanvullen als nieuwe items binnenkomen
- Fasering respecteren: fundering voor groei, groei voor innovatie
