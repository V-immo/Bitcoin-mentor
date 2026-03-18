# Bitcoin Mentor v4

Bitcoin Mentor v4 is een Bitcoin testtool die:

- de actuele BTC-prijs ophaalt via CoinGecko
- candlestick data ophaalt via Binance voor 1h, 4h en 1d
- trend bepaalt via SMA50 en SMA200
- trend structure bepaalt op 4h en daily
- RSI berekent op 1h, 4h en daily
- support en resistance zones bepaalt uit recente 4h candles
- volume sterkte meet op 1h candles
- een score en probability score berekent
- slechte setups hard blokkeert
- een simpele einduitkomst toont:
  **Goed moment**, **Nog even wachten**, of **Vandaag niet kopen**

## Belangrijk

De backend gebruikt niet alleen een score.
Hij gebruikt ook **hard blockers**.

Dus als één van deze dingen fout zit, wordt een setup direct afgekeurd:

- daily trend bearish
- 4h trend bearish
- daily structuur bearish
- 4h structuur bearish
- te weinig ruimte omhoog
- risk/reward te zwak
- daily RSI te hoog

## Starten in VS Code

```bash
npm install
npm run dev
```

Open daarna: http://localhost:3000

API testen: http://localhost:3000/api/btc

---

> Nu klopt de code én de uitleg met elkaar.
