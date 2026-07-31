#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Ensuring Docker is running..."
"$SCRIPT_DIR/docker-ensure.sh"

echo "Starting DB-only docker-compose..."
COMPOSE_PATH="$SCRIPT_DIR/../supabase/docker-compose.db.yml"
docker compose -f "$COMPOSE_PATH" up -d

echo "Done. Use 'docker ps' to verify the container is running."
