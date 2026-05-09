#!/bin/sh
set -eu

# Optional basic-auth for /grafana and /prometheus (credentials provided via env).
# We intentionally generate the htpasswd file at container start so secrets never go into git.

AUTH_FILE="/etc/nginx/auth/monitoring.htpasswd"

if [ -n "${MONITORING_BASIC_AUTH_USER:-}" ] && [ -n "${MONITORING_BASIC_AUTH_PASS:-}" ]; then
  mkdir -p /etc/nginx/auth
  # -B: bcrypt, -b: password from CLI, -c: create
  htpasswd -Bbc "$AUTH_FILE" "$MONITORING_BASIC_AUTH_USER" "$MONITORING_BASIC_AUTH_PASS" >/dev/null 2>&1
fi

exec nginx -g "daemon off;"

