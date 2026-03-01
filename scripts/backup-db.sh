#!/bin/bash
# BeeExemption.com — Nightly Database Backup
# Saves contacts + leads tables to workspace/backups/ and keeps 30 days

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="/Users/scoutbot/.openclaw/workspace/backups/beeexemption"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)

# Load env
source "$PROJECT_DIR/.env.local"

mkdir -p "$BACKUP_DIR"

OUTFILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"

echo "📦 BeeExemption DB Backup — $TIMESTAMP"
echo "→ Writing to: $OUTFILE"

# Dump using pg_dump with the unpooled URL (required for pg_dump)
PGPASSWORD=$(echo "$DATABASE_URL_UNPOOLED" | sed 's/.*:\(.*\)@.*/\1/') \
/opt/homebrew/opt/postgresql@17/bin/pg_dump \
  --no-owner \
  --no-acl \
  --table=contacts \
  --table=leads \
  --table=promo_codes \
  --table=promo_redemptions \
  "$DATABASE_URL_UNPOOLED" \
  > "$OUTFILE"

SIZE=$(du -sh "$OUTFILE" | cut -f1)
echo "✅ Backup complete — $SIZE"

# Compress
gzip "$OUTFILE"
echo "🗜️  Compressed → ${OUTFILE}.gz"

# Prune backups older than 30 days
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete
KEPT=$(ls "$BACKUP_DIR" | wc -l | tr -d ' ')
echo "📁 $KEPT backup(s) retained in $BACKUP_DIR"

# Telegram alert
TG_BOT_TOKEN="${TG_BOT_TOKEN:-}"
TG_CHAT_ID="${TG_ALERT_CHAT_ID:-8331764023}"
if [ -n "$TG_BOT_TOKEN" ]; then
  MSG="✅ BeeExemption DB backup complete — ${TIMESTAMP} (${SIZE}gz)"
  curl -s -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TG_CHAT_ID}&text=${MSG}" > /dev/null
fi

echo "Done."
