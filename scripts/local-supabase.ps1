param(
  [Parameter(Mandatory = $true)]
  [ValidateSet(
    "start",
    "stop",
    "status"
  )]
  [string]$Command
)

$ErrorActionPreference = "Stop"

switch ($Command) {
  "start" {
    npx supabase start --ignore-health-check
    break
  }

  "stop" {
    npx supabase stop
    break
  }

  "status" {
    npx supabase status
    break
  }
}
