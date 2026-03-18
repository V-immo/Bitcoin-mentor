# Bitcoin Mentor — Walkthrough v4.2

Welkom bij Bitcoin Mentor v4.2.

Bitcoin Mentor is een live Bitcoin analyse- en leertool. De app helpt je om marktsituaties te begrijpen, setups te beoordelen en te oefenen met paper trading zonder echt geld te gebruiken.

> **Belangrijk:** dit is een analyse- en leertool, geen broker en geen automatische trading bot. Er worden nooit echte orders verstuurd.

---

## 1. Wat doet deze app?

Bitcoin Mentor combineert live marktdata met technische analyse en vertaalt dat naar een duidelijk advies.

De app kan drie statussen tonen:

| Status | Betekenis |
|--------|-----------|
| **Goed moment** | De setup is sterk genoeg en de prijs ligt gunstig |
| **Nog even wachten** | Er zit potentie in de setup, maar timing of prijs is nog niet mooi |
| **Vandaag niet kopen** | De setup is te zwak of wordt geblokkeerd door harde filters |

De app doet daarbij het volgende:

- haalt de actuele Bitcoin-prijs op
- werkt de prijs live bij via Binance WebSocket
- haalt candle-data op voor 1h, 4h en 1d
- berekent trend via SMA50 en SMA200
- berekent RSI op meerdere timeframes
- detecteert structuur
- bepaalt support- en resistancezones
- meet volume-sterkte
- geeft een score en probability score
- toont een live Simple Mode overzicht
- toont een live chart
- geeft coaching via een lokale AI Training Coach
- laat oefenen met paper trading

---

## 2. Bestandsstructuur

De kern van de app zit in deze bestanden:

| Bestand | Rol |
|---------|-----|
| `lib/btc.ts` | Bitcoin-prijs ophalen, Binance primair en CoinGecko als fallback |
| `lib/market.ts` | Technische analyse: candles, SMA, RSI, structuur, zones, volume |
| `lib/mentor.ts` | Bouwt de volledige MentorSignal op |
| `lib/types.ts` | TypeScript types |
| `app/api/btc/route.ts` | API endpoint dat de laatste analyse teruggeeft |
| `app/page.tsx` | Server component die `buildMentorSignal()` aanroept |
| `components/RealtimeDashboard.tsx` | Hoofdcomponent met live state en dashboard |
| `components/LiveSimpleMode.tsx` | Bovenste live overzicht met zones en grote prijs |
| `components/SimpleChart.tsx` | SVG candlestick chart |
| `components/AITradeCoach.tsx` | Lokale regels-gebaseerde coach |
| `components/PaperTradingPanel.tsx` | Paper trading met localStorage |

---

## 3. Dataflow

De app werkt in twee lagen.

**Eerst wordt op de server een eerste analyse opgebouwd:**

1. `page.tsx` roept `buildMentorSignal()` aan
2. `buildMentorSignal()` gebruikt `lib/btc.ts` en `lib/market.ts`
3. de server geeft `initialData` door aan RealtimeDashboard

**Daarna neemt de client het live over:**

1. RealtimeDashboard opent WebSocket streams
2. RealtimeDashboard haalt extra 5m candles op
3. RealtimeDashboard refresht de analyse via `/api/btc`
4. alle zichtbare componenten reageren op live state

---

## 4. Live gedrag

In v4.2 gebruikt de app drie live streams:

| Stream | Functie |
|--------|---------|
| `btcusdt@miniTicker` | live prijs |
| `btcusdt@kline_4h` | live updates van de huidige 4h candle |
| `btcusdt@kline_5m` | live updates van de huidige 5m candle |

Daarnaast wordt bij het laden meteen een set historische 5m candles opgehaald, zodat de 5m chart niet leeg start.

De analyse zelf wordt elke 15 seconden opnieuw opgehaald via `/api/btc`.

Dat betekent:

- de prijs beweegt live
- de 5m chart beweegt zichtbaar sneller
- de 4h chart sluit beter aan op de analyse
- de coach krijgt live prijsdata
- paper trading gebruikt live prijs
- de volledige analyse wordt periodiek vernieuwd

---

## 5. Candle merge logica

Voor live candle-updates gebruikt de app `mergeLiveKline()`.

Die doet drie dingen:

- als een binnenkomende candle dezelfde openTime heeft als de laatste candle, wordt die laatste candle bijgewerkt
- als de binnenkomende candle nieuwer is, wordt er een nieuwe candle toegevoegd
- er worden maximaal 60 candles bijgehouden

Daardoor kan de chart live blijven bewegen zonder dat de hele dataset telkens opnieuw hoeft te worden opgebouwd.

---

## 6. Technische analyse

De technische analyse wordt opgebouwd uit meerdere onderdelen.

### Trend

Trend wordt bepaald met SMA50 en SMA200.

| Situatie | Trend |
|----------|-------|
| SMA50 > SMA200 | bullish |
| SMA50 < SMA200 | bearish |
| gelijk of te dicht bij elkaar | neutral |

Dit gebeurt voor:

- 1h
- 4h
- 1d

### Structuur

Structuur vergelijkt de eerste helft en tweede helft van een candlevenster.

- Als recente highs en lows gemiddeld hoger liggen, krijgt de structuur het label **bullish**.
- Als recente highs en lows gemiddeld lager liggen, krijgt de structuur het label **bearish**.
- Anders blijft de structuur **neutral**.

### RSI

RSI wordt berekend op:

- 1h
- 4h
- 1d

De 4h RSI wordt gebruikt om bonuspunten of waarschuwingen te geven.
De daily RSI kan zelfs een harde blocker worden als die te hoog is.

### Support en resistance

De app gebruikt twee niveaus:

- absolute support en resistance
- support- en resistancezones

Support is de laagste low van de laatste 50 4h candles.
Resistance is de hoogste high van de laatste 50 4h candles.

De supportzone wordt opgebouwd uit de 5 laagste lows uit de laatste 50 candles.
De resistancezone wordt opgebouwd uit de 5 hoogste highs uit de laatste 50 candles.

### Volume

Volume-sterkte wordt berekend als:

- laatste 10 candles
- vergeleken met
- vorige 20 candles

Als recent volume groter is, krijgt volume het label **strong**.
Anders **weak**.

---

## 7. Koopzone en stop-loss

De koopzone wordt afgeleid van de supportzone.

De app gebruikt:

- `entryZoneLow` = supportZoneLow × 1.002
- `entryZoneHigh` = supportZoneHigh × 1.01
- `stopLoss` = supportZoneLow × 0.985

Daarnaast berekent de app:

- afstand tot resistance in procent
- risk/reward ratio

---

## 8. Scoremodel

De app geeft punten aan sterke signalen.

| Conditie | Punten |
|----------|--------|
| Daily trend bullish | +20 |
| Daily trend neutral | +5 |
| 4H trend bullish | +15 |
| 4H trend neutral | +4 |
| Daily structuur bullish | +10 |
| 4H structuur bullish | +10 |
| 1H trend bullish | +6 |
| Volume strong | +8 |
| Prijs in koopzone | +15 |
| Prijs onder koopzone | +5 |
| Ruimte omhoog > 6% | +8 |
| Ruimte omhoog > 3% | +3 |
| Risk/reward ≥ 2 | +8 |
| Risk/reward ≥ 1.5 | +4 |
| RSI 4H tussen 45 en 65 | +6 |

De score wordt daarna begrensd tussen 0 en 100.

De probability score is in deze versie gelijk aan de gewone score.

---

## 9. Harde blockers

Sommige situaties blokkeren een setup volledig.

Dat zijn:

- Daily trend bearish
- 4H trend bearish
- Daily structure bearish
- 4H structure bearish
- Ruimte omhoog ≤ 3%
- Risk/reward < 1.2
- Daily RSI > 75

Als een blocker actief is, kan de app niet naar **Goed moment** gaan.

---

## 10. Status en grade

Na score en blockers bepaalt de app status, actie en grade.

| Grade | Status | Actie |
|-------|--------|-------|
| A | Goed moment | Kleine koop mogelijk |
| B | Nog even wachten | Wacht op betere prijs |
| C | Nog even wachten | Wacht op betere prijs |
| F | Vandaag niet kopen | Niet kopen |

De eindstatus hangt af van:

- trend
- structuur
- prijspositie
- ruimte omhoog
- risk/reward
- score
- blockers

---

## 11. Alert state

De app gebruikt drie alerts:

| Alert | Betekenis |
|-------|-----------|
| **Koopzone geraakt** | prijs zit in de entry zone |
| **Bijna in koopzone** | prijs zit net boven de entry zone |
| **Geen alert** | prijs zit verder weg |

---

## 12. Live Simple Mode

Bovenaan de app staat LiveSimpleMode.

Die toont:

- een groot live prijsgetal
- een status badge
- een actie-label
- live indicatoren voor prijs en candles
- laatste tick
- een visueel overzicht met resistancezone, koopzone, stop-loss en huidige prijs

De grote live prijs gebruikt een pulse-animatie bij elke tick.
Dat gebeurt doordat `tickKey` telkens wordt opgehoogd en React het element opnieuw rendert.

---

## 13. Candlestick chart

De chartcomponent is SimpleChart.

Die toont:

- candles
- groene koopzone
- rode stop-loss lijn
- grijze resistancezone
- witte huidige prijslijn
- een legenda
- een uitlegbox

De gebruiker kan schakelen tussen:

- **5m live chart**
- **4h analyse chart**

De 5m chart voelt zichtbaar sneller live.
De 4h chart past beter bij de analyse.

---

## 14. AI Training Coach

De coach is volledig lokaal en regels-gebaseerd.
Er wordt geen externe AI API aangeroepen.

De coach gebruikt:

- status
- actie
- score
- grade
- prijspositie
- stop-loss
- resistance
- risk/reward
- 4h trend
- 1h trend
- 4h structuur
- RSI 4h
- blockers
- warnings
- live mode

De coach toont eerst een samenvatting met:

- status
- actie
- score
- grade

Daarna volgen coachregels in normale taal.

---

## 15. Paper trading

Paper trading wordt opgeslagen in:

- `localStorage` onder de key `bitcoin-mentor-paper-v2`

De gebruiker kan:

- startkapitaal instellen
- een virtuele koop openen
- een virtuele trade sluiten
- open P/L volgen
- gesloten P/L volgen
- balans zien
- winrate zien
- beste en slechtste trade zien
- trade history openen

Er wordt nooit een echte trade uitgevoerd.

---

## 16. Hydration fix

Om hydration-problemen te vermijden:

- `lastAnalysisRefresh` start als lege string
- `lastTickLabel` start als lege string

Pas in een `useEffect` op de client worden die gevuld met de lokale tijd.

Zo voorkom je een mismatch tussen server-render en client-render.

---

## 17. Styling

De app gebruikt een donker thema met custom CSS.

Belangrijke kleuren:

| Variabele | Gebruik |
|-----------|---------|
| `--bg` | achtergrond |
| `--card` | kaarten |
| `--text` | hoofdtekst |
| `--muted` | secundaire tekst |
| `--green` | bullish / koop |
| `--orange` | waarschuwing |
| `--red` | bearish / stop-loss |

De layout is:

- 2 kolommen op desktop
- 1 kolom op mobiel

---

## 18. Starten

### Development

```bash
npm run dev
```

Open daarna: `http://localhost:3000`

### Productie met PM2

```bash
npm run build
pm2 start ecosystem.config.js
```

---

## 19. Samenvatting

Bitcoin Mentor v4.2 biedt:

- live prijsupdates
- live 5m candles
- live 4h candles
- multi-timeframe analyse
- SMA
- RSI
- structuurdetectie
- support- en resistancezones
- koopzone en stop-loss
- scoremodel met blockers
- live Simple Mode
- candlestick chart
- AI Training Coach
- paper trading

Het doel is eenvoudig:

- leren traden
- strategieën testen
- geen echt geld riskeren