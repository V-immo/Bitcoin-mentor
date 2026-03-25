# Bitcoin Mentor — Prioriteitenlijst

Laatste update: 2026-03-25

## Voltooide items

### 2026-03-24
- ✅ Alle hardcoded NL strings vertaald (badges, status, nieuwsbeschrijvingen, admin panel, meta)
- ✅ launch.json vastgezet op poort 3001
- ✅ "Trading Mentor" + "Marcus AI" samengevoegd → Mentor Marcus tab
- ✅ Quiz JSON afkap gefixed (max_tokens: 1200 → 4096)
- ✅ Finnhub timeouts toegevoegd (AbortSignal.timeout(5000))

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

---

## Regels
- Medium → Perfect: altijd afmaken tot productieniveau
- Lijst aanvullen als nieuwe items binnenkomen
- Alles opslaan in dit bestand
