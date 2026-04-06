# Bitcoin Mentor — Prioriteitenlijst

Laatste update: 2026-04-06

## Voltooide items

### 2026-03-24
- ✅ Alle hardcoded NL strings vertaald (badges, status, nieuwsbeschrijvingen, admin panel, meta)
- ✅ launch.json vastgezet op poort 3001
- ✅ "Trading Mentor" + "Marcus AI" samengevoegd → Mentor Marcus tab
- ✅ Quiz JSON afkap gefixed (max_tokens: 1200 → 4096)
- ✅ Finnhub timeouts toegevoegd (AbortSignal.timeout(5000))

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
- ✅ "Laatste update" timestamp in UI
- ✅ Wachtwoord reset via e-mail (forgot/reset flow, nodemailer, tokens in DB)
- ✅ PWA / installeerbaar als app op telefoon (manifest, icons, SW caching)

---

## Prioriteitenlijst (volgende stappen)

| # | Item | Impact | Status |
|---|------|--------|--------|
| 1 | **Onboarding flow verbeteren** — stap-voor-stap intro voor nieuwe gebruikers | ⭐⭐⭐⭐ | ⬜ |
| 2 | **Marcus: geheugen per gebruiker** — onthoud stijl, niveau, vorige trades | ⭐⭐⭐⭐⭐ | ⬜ |
| 3 | **Multi-asset vergelijking** — toon signalen van meerdere assets naast elkaar | ⭐⭐⭐⭐ | ⬜ |
| 4 | **Alerts via e-mail** — stuur e-mail als asset in koopzone komt | ⭐⭐⭐⭐ | ⬜ |
| 5 | **Paper trading leaderboard** — score op basis van echte trades, niet alleen P&L | ⭐⭐⭐ | ⬜ |
| 6 | **Admin: quiz pool vullen** — knop in admin panel om pool bij te vullen per level | ⭐⭐⭐ | ⬜ |
| 7 | **Dark/light mode toggle** — gebruiker kiest zelf | ⭐⭐ | ⬜ |
| 8 | **Trade journal exporteren** — download trades als CSV/Excel | ⭐⭐⭐ | ⬜ |
| 9 | **Binance Testnet koppeling** — echte order flow zonder echt geld | ⭐⭐⭐ | ⬜ |
| 10 | **A/B test: Marcus toon** — meting welke stijl beter converteert | ⭐⭐ | ⬜ |
| 11 | **Exchange aanbevelingen per trading mode** — in Settings tonen welk platform het beste past (day→Bybit/Kraken, swing/long→Bitvavo) | ⭐⭐⭐⭐ | ⬜ |
| 12 | **Bybit API integratie** — API keys koppelen, live saldo zien, orders plaatsen (net zoals Bitvavo). Bybit: 0.10% fees, spot + futures, wereldwijd beschikbaar | ⭐⭐⭐⭐⭐ | ⬜ |
| 13 | **Internationalisering — exchange ondersteuning buiten EU** — zie sectie hieronder | ⭐⭐⭐⭐⭐ | ⬜ |
| 14 | **Landdetectie** — automatisch juiste exchange aanbevelen op basis van land van gebruiker | ⭐⭐⭐⭐ | ⬜ |
| 15 | **Stripe betalingen** — abonnementen internationaal accepteren (nu alleen NL?) | ⭐⭐⭐⭐ | ⬜ |
| 16 | **USD als standaard valuta voor niet-EU gebruikers** — nu is EUR standaard | ⭐⭐⭐ | ⬜ |
| 17 | **Meertalige ondersteuning uitbreiden** — nu NL/EN, toevoegen: Spaans, Frans, Duits | ⭐⭐⭐⭐ | ⬜ |
| 18 | **Content lokalisatie** — Marcus tone of voice per taal aanpassen (niet alleen vertalen) | ⭐⭐⭐ | ⬜ |

---

## Internationaal — Wat missen we om wereldwijd te kunnen groeien?

### Exchange per regio
| Regio | Beste exchange voor day trading | Beste voor swing/long |
|---|---|---|
| 🇳🇱 Nederland / EU | Kraken (DNB-vergunning) of Bybit | Bitvavo |
| 🌍 Buiten EU (globaal) | Bybit (wereldwijd, 0.10%), OKX (0.08% maker) | Binance (niet NL), Bybit |
| 🇺🇸 USA | Kraken Pro, Coinbase Advanced | Coinbase, Kraken |
| 🌏 Azië | Bybit, OKX, MEXC (0% maker!) | Bybit, OKX |

**Conclusie:** Bybit is de meest universele keuze — werkt wereldwijd (behalve VS), laagste fees, goede API.

### Wat ontbreekt technisch voor internationaal
1. **Meertalige Marcus** — nu NL/EN maar geen ES/FR/DE/AR
2. **Lokale betaalmethoden** — Stripe alleen, geen iDEAL-alternatief voor andere landen
3. **Tijdzone bewustzijn** — market hours per regio (Aziatische sessie, VS sessie)
4. **Regulatory disclaimers per land** — sommige landen vereisen specifieke teksten
5. **Mobiele app** — internationaal publiek verwacht native app (nu PWA)
6. **MEXC integratie** — populair in Azië, 0% maker fees
7. **OKX integratie** — groot in Azië en Midden-Oosten

---

## Regels
- Medium → Perfect: altijd afmaken tot productieniveau
- Lijst aanvullen als nieuwe items binnenkomen
- Alles opslaan in dit bestand
