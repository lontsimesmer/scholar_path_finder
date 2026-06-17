param()

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path $PSScriptRoot -Parent
$seedPath = Join-Path $repoRoot "supabase/seed.sql"

if (-not (Test-Path $seedPath)) {
  throw "Seed file not found: $seedPath"
}

$containerName = docker ps --format "{{.Names}}" | Where-Object {
  $_ -like "supabase_db_*" -or $_ -like "*db*pdphzddlfgdpngangnjx*"
} | Select-Object -First 1

if (-not $containerName) {
  throw "No local Supabase Postgres container found. Start the stack with npm run db:supabase:start."
}

docker cp $seedPath "${containerName}:/tmp/powerprestation-seed.sql" | Out-Null
docker exec $containerName psql -U postgres -d postgres -f /tmp/powerprestation-seed.sql
