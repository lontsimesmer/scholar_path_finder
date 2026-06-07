param(
  [Parameter(Mandatory = $true)]
  [ValidateSet(
    "migrate",
    "info",
    "validate"
  )]
  [string]$Command
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path $PSScriptRoot -Parent
$migrationsDir = Join-Path $repoRoot "supabase/migrations"
$flywayBin = if ($env:FLYWAY_BIN) { $env:FLYWAY_BIN } else { "flyway" }
$jdbcUrl = if ($env:FLYWAY_URL) { $env:FLYWAY_URL } else { "jdbc:postgresql://127.0.0.1:15422/postgres" }
$dbUser = if ($env:FLYWAY_USER) { $env:FLYWAY_USER } else { "postgres" }
$dbPassword = if ($env:FLYWAY_PASSWORD) { $env:FLYWAY_PASSWORD } else { "postgres" }

if (Get-Command $flywayBin -ErrorAction SilentlyContinue) {
  & $flywayBin `
    "-locations=filesystem:$migrationsDir" `
    "-url=$jdbcUrl" `
    "-user=$dbUser" `
    "-password=$dbPassword" `
    "-connectRetries=10" `
    "-schemas=public" `
    $Command

  exit $LASTEXITCODE
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Flyway CLI not found and Docker is unavailable. Install Flyway, Docker, or set FLYWAY_BIN."
}

$dockerJdbcUrl = $jdbcUrl -replace "127\.0\.0\.1", "host.docker.internal"
$dockerJdbcUrl = $dockerJdbcUrl -replace "localhost", "host.docker.internal"
$resolvedMigrationsDir = (Resolve-Path $migrationsDir).Path

& docker run --rm `
  -v "${resolvedMigrationsDir}:/flyway/sql" `
  flyway/flyway `
  "-locations=filesystem:/flyway/sql" `
  "-url=$dockerJdbcUrl" `
  "-user=$dbUser" `
  "-password=$dbPassword" `
  "-connectRetries=10" `
  "-schemas=public" `
  $Command
