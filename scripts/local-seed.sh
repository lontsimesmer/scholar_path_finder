#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SEED_PATH="$SCRIPT_DIR/seed.sql"

if [ ! -f "$SEED_PATH" ]; then
  echo "Seed file not found: $SEED_PATH"
  exit 1
fi

CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -E "supabase_db_|db.*pdphzddlfgdpngangnjx" | head -1)

if [ -z "$CONTAINER_NAME" ]; then
  echo "No local Supabase Postgres container found. Start the stack with npm run db:supabase:start."
  exit 1
fi

docker cp "$SEED_PATH" "${CONTAINER_NAME}:/tmp/powerprestation-seed.sql"
docker exec "$CONTAINER_NAME" psql -U postgres -d postgres -f /tmp/powerprestation-seed.sql
