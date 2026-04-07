param(
  [Parameter(Mandatory = $true)]
  [ValidateSet(
    "start",
    "stop",
    "reset",
    "status"
  )]
  [string]$Command
)

$ErrorActionPreference = "Stop"

switch ($Command) {
  "start" {
    npx supabase start
    break
  }

  "stop" {
    npx supabase stop
    break
  }

  "reset" {
    npx supabase db reset
    break
  }

  "status" {
    npx supabase status
    break
  }
}
