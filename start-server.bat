@echo off
echo Bitcoin Mentor server starten...
cd /d C:\Users\devel\bitcoin-mentor
pm2 resurrect 2>/dev/null || pm2 start ecosystem.config.js
echo Server draait op http://localhost:3000
timeout /t 3
