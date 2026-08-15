$ErrorActionPreference = "Stop"

Write-Output "Ensuring Docker is running..."
& "$PSScriptRoot\docker-ensure.ps1"

Write-Output "Starting DB-only docker-compose..."
$composePath = Resolve-Path "$PSScriptRoot\..\supabase\docker-compose.db.yml"
docker compose -f $composePath up -d

Write-Output "Done. Use 'docker ps' to verify the container is running."
