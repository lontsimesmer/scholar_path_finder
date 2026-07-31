#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
EXAMPLE_PATH="$REPO_ROOT/.env.supabase.local.example"
ENV_LOCAL_PATH="$REPO_ROOT/.env.local"

case "${1:-}" in
  local-on)
    if [ ! -f "$EXAMPLE_PATH" ]; then
      echo "Missing example file: $EXAMPLE_PATH"
      exit 1
    fi
    cp "$EXAMPLE_PATH" "$ENV_LOCAL_PATH"
    echo "Local Supabase env enabled in .env.local"
    ;;
  local-off)
    if [ -f "$ENV_LOCAL_PATH" ]; then
      rm "$ENV_LOCAL_PATH"
      echo "Local Supabase env disabled (.env.local removed)"
    else
      echo "No .env.local file found"
    fi
    ;;
  status)
    if [ -f "$ENV_LOCAL_PATH" ]; then
      echo ".env.local is active:"
      cat "$ENV_LOCAL_PATH"
    else
      echo ".env.local is not present. The app will use .env"
    fi
    ;;
  *)
    echo "Usage: $0 {local-on|local-off|status}"
    exit 1
    ;;
esac
