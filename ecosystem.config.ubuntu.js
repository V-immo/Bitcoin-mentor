// ═══════════════════════════════════════════════════════════════════
//  Bitcoin Mentor — PM2 config voor Ubuntu productie-server
//  Gebruik: pm2 start ecosystem.config.ubuntu.js
// ═══════════════════════════════════════════════════════════════════
//
//  Voorbereiding op Ubuntu:
//  1.  sudo apt update && sudo apt install nodejs npm nginx certbot python3-certbot-nginx -y
//  2.  sudo npm install -g pm2 n
//  3.  sudo n lts   (Node 20 LTS installeren)
//  4.  git clone <repo> /var/www/bitcoin-mentor
//  5.  cd /var/www/bitcoin-mentor && npm install
//  6.  npm run build   (next build)
//  7.  cp .env.local.example .env.local && nano .env.local  (API keys invullen)
//  8.  node db/init.js && node db/create-admin.js admin admin@jouwdomein.nl WachtwoordHier
//  9.  pm2 start ecosystem.config.ubuntu.js
//  10. pm2 save && pm2 startup
//  11. sudo nginx -t && sudo systemctl reload nginx
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  apps: [
    {
      name: "bitcoin-mentor",
      script: "./node_modules/next/dist/bin/next",
      args: "start --port 3000",           // next start = productie build
      cwd: "/var/www/bitcoin-mentor",      // pad op Ubuntu server
      interpreter: "node",
      exec_mode: "fork",                   // VERPLICHT voor SQLite (geen cluster!)
      instances: 1,                        // Altijd 1 instantie met SQLite
      max_memory_restart: "512M",
      max_restarts: 5,
      restart_delay: 5000,
      autorestart: true,
      watch: false,                        // Geen file watching in productie
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        // Zet deze variabelen in /var/www/bitcoin-mentor/.env.local
        // AUTH_SECRET, ANTHROPIC_API_KEY, DB_PATH, NEXTAUTH_URL
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/bitcoin-mentor/error.log",
      out_file: "/var/log/bitcoin-mentor/out.log",
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
//  .env.local op de Ubuntu server — minimaal vereist:
// ═══════════════════════════════════════════════════════════════════
//  AUTH_SECRET=<genereer met: openssl rand -base64 32>
//  ANTHROPIC_API_KEY=sk-ant-...
//  DB_PATH=/var/www/bitcoin-mentor/data/bitcoin-mentor.db
//  NEXTAUTH_URL=https://jouwdomein.nl
// ═══════════════════════════════════════════════════════════════════
//
//  Dagelijkse SQLite backup (crontab -e):
//  0 3 * * * cp /var/www/bitcoin-mentor/data/bitcoin-mentor.db \
//    /var/backups/bitcoin-mentor/db-$(date +\%Y\%m\%d).db
// ═══════════════════════════════════════════════════════════════════
