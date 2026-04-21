# Bitcoin Mentor — Codebase Rules

## Stijlregels UI

**Geen emoji's in de UI.** Nooit. Geen uitzondering.

- Gebruik Lucide React icons (`import { X } from "lucide-react"`) voor interactieve elementen
- Gebruik typografische symbolen voor decoratieve accenten: `✓` `✗` `→` `←` `▲` `◉` `○` `★`
- Gebruik nooit: 🔥 🎯 ✅ ⚠️ 🏆 📊 📈 🎓 💰 🔔 ⭐ 🏅 💡 🎁 💬 🚀 🎉 ❌ 📋 🟢 🔴 of andere emoji's
- Emoji's in `translations.ts` zijn ook verboden — gebruik gewone tekst

## Stack

- Next.js 16 App Router + Turbopack
- SQLite via `db/db.ts`
- Auth via NextAuth
- AI via Anthropic SDK (Claude)
- Icons: Lucide React

## Server

- pm2 op 202.71.14.150 — gebruik `pm2 delete` + `pm2 start` (niet restart)
- Deploy via GitHub Actions (automatisch bij push naar main)
- Build kan de eerste keer falen door Turbopack race condition — deploy.yml doet automatisch retry

## Database

- Geen `IF NOT EXISTS` in `ALTER TABLE` — gebruik `pragma table_info` check
- Migraties toevoegen in `db/migrate-*.js` en registreren in `.github/workflows/deploy.yml`
