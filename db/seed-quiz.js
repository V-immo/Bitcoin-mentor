// Gebruik: node db/seed-quiz.js
// Vult de quiz_pool met vragen via de Anthropic API

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Laad .env.local
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  });
}

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY niet gevonden in .env.local");
  process.exit(1);
}

const dbPath = process.env.DB_PATH || "./data/bitcoin-mentor.db";
const db = new Database(path.resolve(dbPath));

// Zorg dat tabellen bestaan
db.exec(`
  CREATE TABLE IF NOT EXISTS quiz_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level INTEGER NOT NULL,
    topic TEXT NOT NULL,
    question_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    times_shown INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_quiz_pool_level ON quiz_pool(level);
`);

const TOPICS = {
  1: ["RSI basics", "wat is een stop-loss", "bull vs bear markt", "wat zijn candlesticks", "wat is een trend", "wat is liquiditeit", "hoe werkt paper trading", "wat is een portfolio"],
  2: ["trend herkennen", "support en resistance", "R/R verhouding", "timeframes", "moving averages uitleg", "RSI divergentie", "hoe stel je stop-loss in", "wat is een swing trade"],
  3: ["MA crossovers", "marktstructuur", "volume analyse", "FOMO herkennen", "multi-timeframe bevestiging", "trailing stop-loss", "Fibonacci retracement", "consolidatie herkennen"],
  4: ["multi-timeframe analyse", "halving cyclus", "hoe werken funding rates", "BTC dominantie", "on-chain data basics", "liquiditeit sweeps", "correlatie BTC en S&P 500"],
  5: ["geavanceerde entry timing", "smart money concepten", "supply and demand zones", "orderflow analyse", "trading journal", "positiebeheer tijdens een trade", "DCA strategie"],
};

async function callAI(level, topics) {
  const prompt = `Genereer precies 7 UNIEKE quizvragen voor een trading-leerling op niveau ${level}/5.

ONDERWERPEN: ${topics.join(", ")}

Geef terug als JSON array (alleen de array, geen extra tekst):
[{"id":"1","topic":"onderwerp","question":"De vraag","options":["A. optie1","B. optie2","C. optie3","D. optie4"],"correct":"A","explanation":"Uitleg in 2 zinnen.","difficulty":${level}}]

Zorg dat exact één antwoord correct is.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`API fout: ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "[]";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Geen JSON in antwoord");
  return JSON.parse(match[0]);
}

async function main() {
  const insert = db.prepare("INSERT INTO quiz_pool (level, topic, question_json) VALUES (?, ?, ?)");

  for (const [levelStr, topics] of Object.entries(TOPICS)) {
    const level = Number(levelStr);
    process.stdout.write(`Level ${level}: genereren...`);

    try {
      const questions = await callAI(level, topics);
      const insertMany = db.transaction((qs) => {
        for (const q of qs) insert.run(level, q.topic ?? topics[0], JSON.stringify(q));
      });
      insertMany(questions);
      console.log(` ✓ ${questions.length} vragen opgeslagen`);
    } catch (err) {
      console.log(` ❌ ${err.message}`);
    }

    // Wacht even tussen calls
    await new Promise(r => setTimeout(r, 1000));
  }

  const total = db.prepare("SELECT COUNT(*) as n FROM quiz_pool").get();
  console.log(`\n✅ Klaar! ${total.n} vragen totaal in de pool.`);
  db.close();
}

main().catch(console.error);
