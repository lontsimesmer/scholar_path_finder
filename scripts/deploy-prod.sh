#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# End-to-end deployment of the Supabase production stack for powerprestation.
#
# Usage:
#   ./scripts/deploy-prod.sh <project-ref> [options]
#
# Options:
#   --skip-migrate       Skip Flyway info/validate/migrate
#   --skip-secrets       Skip `supabase secrets set`
#   --skip-functions     Skip Edge Functions deploy
#   --yes                Skip interactive confirmation
#   --env-file <path>    Env file (default: supabase/functions/.env)
#   -f <fn> [<fn>...]    Explicit list of Edge Functions to deploy
#
# Examples:
#   ./scripts/deploy-prod.sh abcdefghijklmnopqrst
#   ./scripts/deploy-prod.sh abcdefghijklmnopqrst --skip-secrets --skip-functions
#   ./scripts/deploy-prod.sh abcdefghijklmnopqrst --skip-migrate --skip-secrets -f cinetpay-webhook
# -----------------------------------------------------------------------------

# ---- Config ----
PROJECT_REF="${1:-}"
if [ -z "$PROJECT_REF" ]; then
  echo "Usage: $0 <project-ref> [options]"
  exit 1
fi
shift

SKIP_MIGRATE=false
SKIP_SECRETS=false
SKIP_FUNCTIONS=false
ASSUME_YES=false
ENV_FILE="supabase/functions/.env"
FUNCTIONS_OVERRIDE=()

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-migrate) SKIP_MIGRATE=true; shift ;;
    --skip-secrets) SKIP_SECRETS=true; shift ;;
    --skip-functions) SKIP_FUNCTIONS=true; shift ;;
    --yes) ASSUME_YES=true; shift ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    -f) shift; while [ $# -gt 0 ] && ! [[ "$1" =~ ^-- ]]; do FUNCTIONS_OVERRIDE+=("$1"); shift; done ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Curated Edge Functions list
DEFAULT_FUNCTIONS=(
  "block-lead-manual-payment"
  "cinetpay-return"
  "cinetpay-webhook"
  "create-cinetpay-payment"
  "create-document-request"
  "get-checkout-settings"
  "get-cinetpay-payment-status"
  "get-contact-verification-status"
  "get-manual-payment-status"
  "get-student-procedure-status"
  "mtn-momo-payment"
  "process-mobile-money"
  "send-contact-verification-code"
  "send-follow-ups"
  "seo-report"
  "submit-lead"
  "submit-manual-payment"
  "update-checkout-settings"
  "validate-manual-payment"
  "verify-contact-verification-code"
)

if [ ${#FUNCTIONS_OVERRIDE[@]} -gt 0 ]; then
  FUNCTIONS_TO_DEPLOY=("${FUNCTIONS_OVERRIDE[@]}")
else
  FUNCTIONS_TO_DEPLOY=("${DEFAULT_FUNCTIONS[@]}")
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"

if [[ "$ENV_FILE" = /* ]]; then
  ENV_FILE_PATH="$ENV_FILE"
else
  ENV_FILE_PATH="$REPO_ROOT/$ENV_FILE"
fi

# ---- Helpers ----
write_section() { echo -e "\n\033[36m$(printf '=%.0s' {1..70})\033[0m"; echo -e "\033[36m$1\033[0m"; echo -e "\033[36m$(printf '=%.0s' {1..70})\033[0m"; }
write_step()   { echo -e "\033[33m[*] $1\033[0m"; }
write_ok()     { echo -e "\033[32m[OK] $1\033[0m"; }
write_skip()   { echo -e "\033[90m[SKIP] $1\033[0m"; }

confirm_or_throw() {
  if [ "$ASSUME_YES" = true ]; then return; fi
  read -r -p "$1 (type 'yes' to continue): " REPLY
  if [ "$REPLY" != "yes" ]; then echo "Aborted by user."; exit 1; fi
}

# ---- Pre-flight ----
cd "$REPO_ROOT"

write_section "Pre-flight"

if ! [[ "$PROJECT_REF" =~ ^[a-z]{20}$ ]]; then
  echo -e "\033[33mWarning: ProjectRef '$PROJECT_REF' does not match the typical 20-lowercase pattern. Continuing.\033[0m"
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found. Install Node.js first."
  exit 1
fi

if [ "$SKIP_MIGRATE" = false ]; then
  HAS_FLYWAY=false; HAS_DOCKER=false
  command -v flyway >/dev/null 2>&1 && HAS_FLYWAY=true
  command -v docker >/dev/null 2>&1 && HAS_DOCKER=true
  if [ "$HAS_FLYWAY" = false ] && [ "$HAS_DOCKER" = false ]; then
    echo "Neither flyway nor docker found. Install Flyway CLI or Docker, or pass --skip-migrate."
    exit 1
  fi
fi

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Migrations dir not found: $MIGRATIONS_DIR"
  exit 1
fi

if [ "$SKIP_SECRETS" = false ] && [ ! -f "$ENV_FILE_PATH" ]; then
  echo "Env file not found: $ENV_FILE_PATH  (use --env-file to override, or --skip-secrets)"
  exit 1
fi

write_ok "Pre-flight checks complete"
echo "  Project ref     : $PROJECT_REF"
echo "  Env file        : $ENV_FILE_PATH"
echo "  Functions count : ${#FUNCTIONS_TO_DEPLOY[@]}"

# ---- 1. Flyway ----
if [ "$SKIP_MIGRATE" = true ]; then
  write_section "Flyway"
  write_skip "Skipped via --skip-migrate"
else
  write_section "Flyway"

  echo -n "Production DB password: "
  read -rs DB_PASSWORD
  echo

  export FLYWAY_URL="jdbc:postgresql://db.${PROJECT_REF}.supabase.co:5432/postgres?sslmode=require"
  export FLYWAY_USER="postgres"
  export FLYWAY_PASSWORD="$DB_PASSWORD"

  write_step "flyway info (current state)"
  npm run db:flyway:info
  if [ $? -ne 0 ]; then echo "flyway info failed (check connectivity and credentials)"; exit 1; fi

  write_step "flyway validate"
  npm run db:flyway:validate
  if [ $? -ne 0 ]; then echo "flyway validate failed"; exit 1; fi

  confirm_or_throw "About to apply migrations to PROD project '$PROJECT_REF'. Continue?"

  write_step "flyway migrate"
  npm run db:flyway:migrate
  if [ $? -ne 0 ]; then echo "flyway migrate failed"; exit 1; fi

  unset FLYWAY_PASSWORD
  write_ok "Flyway migration complete"
fi

# ---- 2. Supabase secrets ----
if [ "$SKIP_SECRETS" = true ]; then
  write_section "Supabase secrets"
  write_skip "Skipped via --skip-secrets"
else
  write_section "Supabase secrets"
  write_step "Pushing secrets from $ENV_FILE_PATH to project $PROJECT_REF"
  npx supabase secrets set --project-ref "$PROJECT_REF" --env-file "$ENV_FILE_PATH"
  if [ $? -ne 0 ]; then
    echo "supabase secrets set failed. Have you run 'npx supabase login' first?"
    exit 1
  fi
  write_ok "Secrets pushed"
fi

# ---- 3. Edge Functions deploy ----
if [ "$SKIP_FUNCTIONS" = true ]; then
  write_section "Edge Functions"
  write_skip "Skipped via --skip-functions"
else
  write_section "Edge Functions deploy"
  FAILED=()
  for fn in "${FUNCTIONS_TO_DEPLOY[@]}"; do
    FN_DIR="$REPO_ROOT/supabase/functions/$fn"
    if [ ! -d "$FN_DIR" ]; then
      echo -e "\033[33m[WARN] $fn not found on disk, skipping\033[0m"
      continue
    fi
    write_step "deploy $fn"
    if npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF"; then
      write_ok "$fn deployed"
    else
      echo -e "\033[31m[ERR ] $fn failed (continuing with others)\033[0m"
      FAILED+=("$fn")
    fi
  done

  if [ ${#FAILED[@]} -gt 0 ]; then
    echo -e "\n\033[31mFunctions that failed to deploy:\033[0m"
    for f in "${FAILED[@]}"; do echo -e "  \033[31m- $f\033[0m"; done
    exit 1
  fi
  write_ok "All Edge Functions deployed"
fi

# ---- Done ----
write_section "Done"
echo -e "\033[97mManual follow-up (not handled by this script):\033[0m"
echo "  1. Supabase dashboard > Authentication > URL Configuration :"
echo "       Site URL          = https://powerprestation.ca"
echo "       Redirect URLs    += https://powerprestation.ca/*"
echo "  2. CinetPay dashboard > Notification URL :"
echo "       https://$PROJECT_REF.functions.supabase.co/cinetpay-webhook"
echo "  3. Brevo dashboard : verify sender noreply@powerprestation.ca (DKIM/SPF)"
echo "                        and SMS sender PowerPresta"
echo "  4. Run the manual validation checklist in docs/SUPABASE_PRODUCTION.md (section 11)"
