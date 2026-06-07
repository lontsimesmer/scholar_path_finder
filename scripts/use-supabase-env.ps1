param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("local-on", "local-off", "status")]
  [string]$Command
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ExamplePath = Join-Path $RepoRoot ".env.supabase.local.example"
$EnvLocalPath = Join-Path $RepoRoot ".env.local"

switch ($Command) {
  "local-on" {
    if (-not (Test-Path $ExamplePath)) {
      throw "Missing example file: $ExamplePath"
    }

    Copy-Item $ExamplePath $EnvLocalPath -Force
    Write-Host "Local Supabase env enabled in .env.local"
    break
  }

  "local-off" {
    if (Test-Path $EnvLocalPath) {
      Remove-Item $EnvLocalPath -Force
      Write-Host "Local Supabase env disabled (.env.local removed)"
    } else {
      Write-Host "No .env.local file found"
    }
    break
  }

  "status" {
    if (Test-Path $EnvLocalPath) {
      Write-Host ".env.local is active:"
      Get-Content $EnvLocalPath
    } else {
      Write-Host ".env.local is not present. The app will use .env"
    }
    break
  }
}
