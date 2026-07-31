#!/usr/bin/env bash
set -euo pipefail

CMD="${1:-}"
shift 2>/dev/null || true

case "$CMD" in
  start)
    npx supabase start --ignore-health-check "$@"
    ;;
  stop)
    npx supabase stop "$@"
    ;;
  status)
    npx supabase status "$@"
    ;;
  *)
    echo "Usage: $0 {start|stop|status} [--debug]"
    exit 1
    ;;
esac
