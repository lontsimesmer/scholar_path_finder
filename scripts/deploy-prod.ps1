<#
.SYNOPSIS
End-to-end deployment of the Supabase production stack for powerprestation.

.DESCRIPTION
Targets a Supabase project where the DB is already created but empty.
Performs, in order:
  1. Pre-flight checks (tools, env file, project-ref shape)
  2. Flyway : info -> validate -> migrate
  3. Push backend secrets via `supabase secrets set --env-file`
  4. Deploy curated Edge Functions list

Each step can be skipped via flags. Destructive steps require explicit confirmation
unless -AssumeYes is set.

Out of scope (still manual on the dashboard) :
  - Project creation, plan, region
  - Auth : Site URL, redirect URLs, OAuth providers, email templates, SMTP
  - Custom domain, network restrictions, PITR
  - CinetPay webhook URL registration on the CinetPay side
  - Brevo sender DKIM/SPF validation

.PARAMETER ProjectRef
Supabase project reference (the URL prefix, e.g. abcdefghijklmnopqrst).

.PARAMETER DbPassword
Production database password as SecureString. If omitted and migrate is enabled,
the script prompts securely.

.PARAMETER EnvFile
Env file pushed as Supabase secrets. Default: supabase/functions/.env

.PARAMETER SkipMigrate
Skip Flyway info/validate/migrate.

.PARAMETER SkipSecrets
Skip `supabase secrets set`.

.PARAMETER SkipFunctions
Skip Edge Functions deploy.

.PARAMETER AssumeYes
Skip the interactive confirmation before migrating production.

.PARAMETER FunctionsOverride
Explicit list of Edge Functions to deploy, bypassing the default curated set.

.EXAMPLE
# Full deploy with interactive password prompt
./scripts/deploy-prod.ps1 -ProjectRef abcdefghijklmnopqrst

.EXAMPLE
# Migrate only
./scripts/deploy-prod.ps1 -ProjectRef abcdefghijklmnopqrst -SkipSecrets -SkipFunctions

.EXAMPLE
# Re-deploy a single function
./scripts/deploy-prod.ps1 -ProjectRef abcdefghijklmnopqrst -SkipMigrate -SkipSecrets `
                         -FunctionsOverride @("cinetpay-webhook")
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,

  [SecureString]$DbPassword,

  [string]$EnvFile = "supabase/functions/.env",

  [switch]$SkipMigrate,
  [switch]$SkipSecrets,
  [switch]$SkipFunctions,
  [switch]$AssumeYes,

  [string[]]$FunctionsOverride
)

$ErrorActionPreference = "Stop"

# -----------------------------------------------------------------------------
# Curated Edge Functions list.
#
# Reflects the production surface after the 2026-06-10 cleanup that removed
# Stripe (create-checkout, verify-stripe-payment) and the unused bank-transfer
# flow. The Test-Path check below tolerates missing dirs, so adding a new
# function to supabase/functions/ requires appending it here explicitly -
# nothing is auto-discovered.
# -----------------------------------------------------------------------------
$DefaultFunctions = @(
  "block-lead-manual-payment",
  "cinetpay-return",
  "cinetpay-webhook",
  "create-cinetpay-payment",
  "create-document-request",
  "get-checkout-settings",
  "get-cinetpay-payment-status",
  "get-contact-verification-status",
  "get-manual-payment-status",
  "get-student-procedure-status",
  "mtn-momo-payment",
  "process-mobile-money",
  "send-contact-verification-code",
  "send-follow-ups",
  "submit-lead",
  "submit-manual-payment",
  "update-checkout-settings",
  "validate-manual-payment",
  "verify-contact-verification-code"
)

$FunctionsToDeploy = if ($FunctionsOverride) { $FunctionsOverride } else { $DefaultFunctions }

$RepoRoot = Split-Path $PSScriptRoot -Parent
$MigrationsDir = Join-Path $RepoRoot "supabase/migrations"
$EnvFilePath = if ([System.IO.Path]::IsPathRooted($EnvFile)) {
  $EnvFile
} else {
  Join-Path $RepoRoot $EnvFile
}

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

function Write-Section($title) {
  Write-Host ""
  Write-Host ("=" * 70) -ForegroundColor Cyan
  Write-Host $title -ForegroundColor Cyan
  Write-Host ("=" * 70) -ForegroundColor Cyan
}

function Write-Step($msg) {
  Write-Host "[*] $msg" -ForegroundColor Yellow
}

function Write-Ok($msg) {
  Write-Host "[OK] $msg" -ForegroundColor Green
}

function Write-Skip($msg) {
  Write-Host "[SKIP] $msg" -ForegroundColor DarkGray
}

function Confirm-Or-Throw($prompt) {
  if ($AssumeYes) { return }
  $reply = Read-Host "$prompt (type 'yes' to continue)"
  if ($reply -ne "yes") {
    throw "Aborted by user."
  }
}

function ConvertFrom-SecureToPlain($secure) {
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  } finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

# -----------------------------------------------------------------------------
# Pre-flight
# -----------------------------------------------------------------------------

Set-Location $RepoRoot

Write-Section "Pre-flight"

if (-not ($ProjectRef -match '^[a-z]{20}$')) {
  Write-Host "Warning: ProjectRef '$ProjectRef' does not match the typical 20-lowercase pattern. Continuing." -ForegroundColor Yellow
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw "npx not found. Install Node.js first."
}

if (-not $SkipMigrate) {
  $hasFlyway = [bool](Get-Command flyway -ErrorAction SilentlyContinue)
  $hasDocker = [bool](Get-Command docker -ErrorAction SilentlyContinue)
  if (-not $hasFlyway -and -not $hasDocker) {
    throw "Neither flyway nor docker found. Install Flyway CLI or Docker Desktop, or pass -SkipMigrate."
  }
}

if (-not (Test-Path $MigrationsDir)) {
  throw "Migrations dir not found: $MigrationsDir"
}

if (-not $SkipSecrets) {
  if (-not (Test-Path $EnvFilePath)) {
    throw "Env file not found: $EnvFilePath  (use -EnvFile to override, or -SkipSecrets)"
  }
}

if (-not $DbPassword -and -not $SkipMigrate) {
  $DbPassword = Read-Host "Production DB password" -AsSecureString
}

Write-Ok "Pre-flight checks complete"
Write-Host "  Project ref     : $ProjectRef"
Write-Host "  Env file        : $EnvFilePath"
Write-Host "  Functions count : $($FunctionsToDeploy.Count)"

# -----------------------------------------------------------------------------
# 1. Flyway
# -----------------------------------------------------------------------------

if ($SkipMigrate) {
  Write-Section "Flyway"
  Write-Skip "Skipped via -SkipMigrate"
}
else {
  Write-Section "Flyway"

  $plainPwd = ConvertFrom-SecureToPlain $DbPassword
  $env:FLYWAY_URL = "jdbc:postgresql://db.$ProjectRef.supabase.co:5432/postgres?sslmode=require"
  $env:FLYWAY_USER = "postgres"
  $env:FLYWAY_PASSWORD = $plainPwd

  try {
    Write-Step "flyway info (current state)"
    & npm run db:flyway:info
    if ($LASTEXITCODE -ne 0) { throw "flyway info failed (check connectivity and credentials)" }

    Write-Step "flyway validate"
    & npm run db:flyway:validate
    if ($LASTEXITCODE -ne 0) { throw "flyway validate failed" }

    Confirm-Or-Throw "About to apply migrations to PROD project '$ProjectRef'. Continue?"

    Write-Step "flyway migrate"
    & npm run db:flyway:migrate
    if ($LASTEXITCODE -ne 0) { throw "flyway migrate failed" }

    Write-Ok "Flyway migration complete"
  }
  finally {
    Remove-Item Env:FLYWAY_PASSWORD -ErrorAction SilentlyContinue
    $plainPwd = $null
    [System.GC]::Collect()
  }
}

# -----------------------------------------------------------------------------
# 2. Supabase secrets
# -----------------------------------------------------------------------------

if ($SkipSecrets) {
  Write-Section "Supabase secrets"
  Write-Skip "Skipped via -SkipSecrets"
}
else {
  Write-Section "Supabase secrets"
  Write-Step "Pushing secrets from $EnvFilePath to project $ProjectRef"
  & npx supabase secrets set --project-ref $ProjectRef --env-file $EnvFilePath
  if ($LASTEXITCODE -ne 0) {
    throw "supabase secrets set failed. Have you run 'npx supabase login' first?"
  }
  Write-Ok "Secrets pushed"
}

# -----------------------------------------------------------------------------
# 3. Edge Functions deploy
# -----------------------------------------------------------------------------

if ($SkipFunctions) {
  Write-Section "Edge Functions"
  Write-Skip "Skipped via -SkipFunctions"
}
else {
  Write-Section "Edge Functions deploy"
  $failed = @()
  foreach ($fn in $FunctionsToDeploy) {
    $fnDir = Join-Path $RepoRoot "supabase/functions/$fn"
    if (-not (Test-Path $fnDir)) {
      Write-Host "[WARN] $fn  not found on disk, skipping" -ForegroundColor Yellow
      continue
    }
    Write-Step "deploy $fn"
    & npx supabase functions deploy $fn --project-ref $ProjectRef
    if ($LASTEXITCODE -ne 0) {
      Write-Host "[ERR ] $fn failed (continuing with others)" -ForegroundColor Red
      $failed += $fn
    }
    else {
      Write-Ok "$fn deployed"
    }
  }

  if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "Functions that failed to deploy:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    throw "$($failed.Count) function(s) failed to deploy."
  }
  Write-Ok "All Edge Functions deployed"
}

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------

Write-Section "Done"
Write-Host "Manual follow-up (not handled by this script):" -ForegroundColor White
Write-Host "  1. Supabase dashboard > Authentication > URL Configuration :"
Write-Host "       Site URL          = https://powerprestation.ca"
Write-Host "       Redirect URLs    += https://powerprestation.ca/*"
Write-Host "  2. CinetPay dashboard > Notification URL :"
Write-Host "       https://$ProjectRef.functions.supabase.co/cinetpay-webhook"
Write-Host "  3. Brevo dashboard : verify sender noreply@powerprestation.ca (DKIM/SPF)"
Write-Host "                        and SMS sender PowerPresta"
Write-Host "  4. Run the manual validation checklist in docs/SUPABASE_PRODUCTION.md (section 11)"
