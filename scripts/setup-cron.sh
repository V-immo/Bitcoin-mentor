#!/bin/bash
# Eenmalig uitvoeren op de server om de comeback-cron in te stellen.
# Vereiste: CRON_SECRET staat in /var/www/bitcoin-mentor/.env.local
#
# Gebruik: bash scripts/setup-cron.sh

set -e

# Lees CRON_SECRET uit .env.local
ENV_FILE="/var/www/bitcoin-mentor/.env.local"
CRON_SECRET=""
if [ -f "$ENV_FILE" ]; then
  CRON_SECRET=$(grep "^CRON_SECRET=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
fi

if [ -z "$CRON_SECRET" ]; then
  echo "Fout: CRON_SECRET niet gevonden in $ENV_FILE"
  echo "Voeg toe: CRON_SECRET=<willekeurige_string> in $ENV_FILE"
  exit 1
fi

BASE_URL="https://bitcoinmentor.be"
CRON_CMD="curl -s \"${BASE_URL}/api/cron/comeback?secret=${CRON_SECRET}\" > /dev/null 2>&1"

# Voeg toe aan crontab als nog niet bestaat
CRON_ENTRY="30 8 * * * $CRON_CMD"
( crontab -l 2>/dev/null | grep -v "cron/comeback"; echo "$CRON_ENTRY" ) | crontab -

echo "Cron job ingesteld: elke dag om 08:30 come-back push versturen"
crontab -l | grep comeback
