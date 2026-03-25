# Bitcoin Mentor — Prioriteitenlijst

Laatste update: 2026-03-24

## Voltooide items (vandaag)
- ✅ Alle hardcoded NL strings vertaald (badges, status, nieuwsbeschrijvingen, admin panel, meta)
- ✅ launch.json vastgezet op poort 3001
- ✅ "Trading Mentor" + "Marcus AI" samengevoegd → Mentor Marcus tab
- ✅ Quiz JSON afkap gefixed (max_tokens: 1200 → 4096)
- ✅ Finnhub timeouts toegevoegd (AbortSignal.timeout(5000))

---

## Prioriteitenlijst (volgende stappen)

| # | Item | Impact | Status |
|---|------|--------|--------|
| 1 | **Paper trading UX zoals echt platform** — buy/sell tabs, SL/TP automatisering, gedeeltelijk sluiten, equity sparkline | ⭐⭐⭐⭐⭐ | ✅ |
| 2 | **4H candles direct van Binance** (juiste timing) | ⭐⭐⭐⭐⭐ | ✅ |
| 3 | **WebSocket live prijs** (1-2s refresh) | ⭐⭐⭐⭐ | ✅ |
| 4 | **Quiz: vragen cachen in DB** (snelheid) | ⭐⭐⭐⭐ | ✅ |
| 5 | **Quiz: geen dubbele vragen** (rotatie per gebruiker) | ⭐⭐⭐⭐ | ✅ |
| 6 | **Videos fallback UX** (auto-detect, grote YouTube knop) | ⭐⭐⭐ | ✅ |
| 7 | **Taal: chart labels + Marcus consistent** EN/NL | ⭐⭐⭐ | ✅ |
| 8 | **"Laatste update" timestamp in UI** | ⭐⭐ | ✅ |
| 9 | **Zelf registreren / wachtwoord reset via e-mail** | ⭐⭐⭐ | ✅ |
| 10 | **PWA / installeerbaar als app op telefoon** | ⭐⭐ | ⬜ |

---

## Paper Trading UX — detail (item 1)

Wat er gebouwd wordt:
- **Buy/Sell tabs** (groen/rood, zoals Binance/ByBit)
- **Positiekaart** als positie open is: entry, current, ROI%, P&L
- **Gedeeltelijk sluiten**: 25% / 50% / 75% / 100% knoppen
- **SL/TP automatisering**: stel bij opening in, auto-sluit bij raken
- **Equity sparkline**: mini-grafiek van portefeuille over tijd
- **Betere handelsgeschiedenistabel**: kolommen met tijd, zijde, bedrag, prijs, P&L
- **Order preview**: toont BTC/asset-hoeveelheid bij ingeven bedrag

---

## Regels
- Medium → Perfect: altijd afmaken tot productieniveau
- Lijst aanvullen als nieuwe items binnenkomen
- Alles opslaan in dit bestand
