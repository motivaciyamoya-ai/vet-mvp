#!/usr/bin/env bash
set -euo pipefail

# Ежедневный зашифрованный pg_dump. См. docs/POSTGRES-BACKUPS.md

BACKUP_DIR="${BACKUP_DIR:-/var/backups/vetmvp-pg}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

RAW="${BACKUP_DIR}/vetmvp-${STAMP}.sql"
ENC="${RAW}.gpg"

if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_dump "$DATABASE_URL" --no-owner --no-acl -f "$RAW"
else
  : "${PGHOST:?}" "${PGUSER:?}" "${PGPASSWORD:?}" "${PGDATABASE:?}"
  export PGHOST PGUSER PGPASSWORD PGDATABASE PGPORT="${PGPORT:-5432}"
  pg_dump --no-owner --no-acl -f "$RAW"
fi

if [[ -n "${GPG_RECIPIENT:-}" ]]; then
  gpg --batch --yes -e -r "$GPG_RECIPIENT" -o "$ENC" "$RAW"
  rm -f "$RAW"
  echo "Encrypted backup: $ENC"
else
  echo "WARN: GPG_RECIPIENT not set; leaving unencrypted SQL at $RAW (not recommended)" >&2
fi

find "$BACKUP_DIR" -name 'vetmvp-*.sql' -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name 'vetmvp-*.sql.gpg' -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true

echo "Done."
