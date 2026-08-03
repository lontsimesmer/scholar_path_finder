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

# baselineOnMigrate lets Flyway adopt a database that already contains the V1
# schema (dashboard / supabase db push setups) without trying to re-run it.
# On an empty schema it is a no-op, so leaving it enabled is safe for dev too.
$baselineOnMigrate = if ($env:FLYWAY_BASELINE_ON_MIGRATE) { $env:FLYWAY_BASELINE_ON_MIGRATE } else { "true" }
$baselineVersion = if ($env:FLYWAY_BASELINE_VERSION) { $env:FLYWAY_BASELINE_VERSION } else { "1" }

if (Get-Command $flywayBin -ErrorAction SilentlyContinue) {
  & $flywayBin `
    "-locations=filesystem:$migrationsDir" `
    "-url=$jdbcUrl" `
    "-user=$dbUser" `
    "-password=$dbPassword" `
    "-connectRetries=10" `
    "-schemas=public" `
    "-baselineOnMigrate=$baselineOnMigrate" `
    "-baselineVersion=$baselineVersion" `
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
  "-baselineOnMigrate=$baselineOnMigrate" `
  "-baselineVersion=$baselineVersion" `
  $Command
