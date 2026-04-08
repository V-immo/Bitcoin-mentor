const fs = require("fs");
const path = require("path");

// Laad .env.local handmatig zodat pm2 de keys doorgeeft aan Next.js
function loadEnvLocal() {
  const envPath = path.join(__dirname, ".env.local");
  try {
    const content = fs.readFileSync(envPath, "utf8");
    const vars = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      vars[key] = val;
    }
    return vars;
  } catch {
    return {};
  }
}

const envVars = loadEnvLocal();

module.exports = {
  apps: [
    {
      name: "bitcoin-mentor",
      script: "./node_modules/next/dist/bin/next",
      args: "start --port 3000",
      cwd: "/var/www/bitcoin-mentor",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        ...envVars,
      },
      max_restarts: 15,
      min_uptime: 5000,
      restart_delay: 3000,
      autorestart: true,
    },
  ],
};
