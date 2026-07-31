#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"

FLYWAY_BIN="${FLYWAY_BIN:-flyway}"
JDBC_URL="${FLYWAY_URL:-jdbc:postgresql://127.0.0.1:15422/postgres}"
DB_USER="${FLYWAY_USER:-postgres}"
DB_PASSWORD="${FLYWAY_PASSWORD:-postgres}"

COMMAND="${1:-}"
if [ -z "$COMMAND" ]; then
  echo "Usage: $0 {migrate|info|validate}"
  exit 1
fi

if command -v "$FLYWAY_BIN" >/dev/null 2>&1; then
  "$FLYWAY_BIN" \
    "-locations=filesystem:$MIGRATIONS_DIR" \
    "-url=$JDBC_URL" \
    "-user=$DB_USER" \
    "-password=$DB_PASSWORD" \
    "-connectRetries=10" \
    "-schemas=public" \
    "$COMMAND"
  exit $?
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Flyway CLI not found and Docker is unavailable. Install Flyway, Docker, or set FLYWAY_BIN."
  exit 1
fi

DOCKER_JDBC_URL="${JDBC_URL//127.0.0.1/host.docker.internal}"
DOCKER_JDBC_URL="${DOCKER_JDBC_URL//localhost/host.docker.internal}"

docker run --rm \
  -v "${MIGRATIONS_DIR}:/flyway/sql" \
  flyway/flyway \
  "-locations=filesystem:/flyway/sql" \
  "-url=$DOCKER_JDBC_URL" \
  "-user=$DB_USER" \
  "-password=$DB_PASSWORD" \
  "-connectRetries=10" \
  "-schemas=public" \
  "$COMMAND"
