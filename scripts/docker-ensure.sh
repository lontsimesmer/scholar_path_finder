#!/usr/bin/env bash
set -euo pipefail

docker version >/dev/null 2>&1 && { echo "Docker CLI already available."; exit 0; }

if systemctl is-active --quiet docker 2>/dev/null; then
  echo "Docker daemon is running but CLI not in PATH."
  exit 2
fi

echo "Starting Docker daemon..."
sudo systemctl start docker 2>/dev/null || {
  echo "Could not start Docker automatically. Please start Docker manually."
  exit 2
}

timeout=120
elapsed=0
interval=2
while ! docker version >/dev/null 2>&1; do
  sleep "$interval"
  elapsed=$((elapsed + interval))
  echo "Waiting for Docker to become ready... ($elapsed/$timeout)"
  if [ "$elapsed" -ge "$timeout" ]; then
    echo "Timed out waiting for Docker to become available."
    exit 3
  fi
done

echo "Docker ready."
