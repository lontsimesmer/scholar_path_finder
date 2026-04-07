# Local Supabase

This repository now supports one official local backend mode: the Supabase CLI stack.

Use it when you want the real local project behavior:

- Auth
- REST API
- Edge Functions
- Studio
- Mailpit
- Supabase-managed Postgres
- migrations and seed replay

## Commands

Repository wrapper commands:

```bash
npm run db:supabase:start
npm run db:supabase:status
npm run db:supabase:reset
npm run db:supabase:stop
```

Direct CLI equivalents:

```bash
npx supabase start
npx supabase status
npx supabase db reset
npx supabase stop
```

The repository wrapper uses [scripts/local-supabase.ps1](../scripts/local-supabase.ps1).

## Current Local Endpoints

- API URL: `http://127.0.0.1:15421`
- DB URL: `postgresql://postgres:postgres@127.0.0.1:15422/postgres`
- Studio: `http://127.0.0.1:15423`
- Mailpit: `http://127.0.0.1:15424`

These ports come from [supabase/config.toml](../supabase/config.toml).

## Frontend Env

To point the React app to the local Supabase stack:

```bash
npm run env:supabase:local
```

This copies `.env.supabase.local.example` into `.env.local`, which is what Vite reads in local development.

Useful commands:

```bash
npm run env:supabase:status
npm run env:supabase:remote
```

Notes:

- `.env.local` overrides `.env`
- restart `npm run dev` after switching env
- `.env.local` is local-only and should not be committed

## Seeded Data

`npm run db:supabase:reset` replays all migrations in `supabase/migrations` and seeds data from `supabase/seed.sql`.

This includes local demo data such as:

- admin account: `admin@powerprestation.com`
- admin password: `AdminPower123!`
- demo student accounts
- demo student profiles
- demo student applications
- demo blog posts

## Payment Notes

CinetPay local testing still depends on backend secrets in the Supabase function environment:

- `CINETPAY_API_KEY`
- `CINETPAY_SITE_ID`
- `CINETPAY_SECRET_KEY`
- `SITE_URL`

`cinetpay-webhook` cannot be called by CinetPay if your local environment is only reachable at `127.0.0.1`. Use a tunnel when you need real webhook delivery. Without a tunnel, the app can still reconcile the payment after the browser returns to `/payment-success`.

## Important Simplification

The repository no longer provides a separate plain PostgreSQL + Adminer development stack.

If you want to understand, test, or run the application locally, use the Supabase CLI stack only.
