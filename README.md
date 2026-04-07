# Power Prestation

Power Prestation is a React + TypeScript web application for academic mobility consulting. It combines a multilingual marketing site, a lead capture flow, an authenticated student journey, a Cameroon-first CinetPay checkout, and a Supabase-backed admin workflow.

## Main Features

- Public landing page for services, testimonials, FAQ, blog, and contact.
- Bilingual interface with English and French translations.
- Lead creation and account creation from the public acquisition flow.
- Student dashboard with profile validation, private procedure submission, and document upload.
- CinetPay payment flow with server-side verification and webhook reconciliation.
- Admin CRM and bilingual blog management.
- Supabase Edge Functions for lead handling, payment processing, and follow-up automation.

## Tech Stack

- Vite
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui + Radix UI
- Supabase
- Vitest + Testing Library

## Package Manager

Use `npm` only in this repository. `package-lock.json` is the source of truth.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start the local Supabase stack:

```bash
npm run db:supabase:start
```

3. Point the frontend to the local Supabase stack:

```bash
npm run env:supabase:local
```

4. Start the app:

```bash
npm run dev
```

The Vite dev server runs on `http://localhost:8080`.

To go back to the default `.env` values:

```bash
npm run env:supabase:remote
```

## Available Commands

- `npm run dev`: start the local development server.
- `npm run build`: build the production bundle into `dist/`.
- `npm run preview`: preview the production build locally.
- `npm run lint`: run ESLint.
- `npm run test`: run Vitest once.
- `npm run test:watch`: run Vitest in watch mode.
- `npm run db:supabase:start`: start the local Supabase stack.
- `npm run db:supabase:status`: show local Supabase status and URLs.
- `npm run db:supabase:reset`: reset local Supabase, replay migrations, and reseed data.
- `npm run db:supabase:stop`: stop the local Supabase stack.
- `npm run env:supabase:local`: copy local frontend env values into `.env.local`.
- `npm run env:supabase:remote`: stop using `.env.local` and fall back to `.env`.

## Official Local Backend

This repository now has one official local backend mode: the Supabase CLI stack.

It includes:

- local Auth
- local REST API
- local Edge Functions
- local Studio
- local Mailpit
- local Supabase Postgres

Important:

- there is no longer a separate plain PostgreSQL dev stack in this repository
- if you want to run the project end to end locally, use the Supabase CLI commands above
- the local stack is configured in `supabase/config.toml`

## Project Structure

- `src/pages`: route-level screens such as `Index`, `Login`, `Dashboard`, `StartProcedure`, `Checkout`, and `PaymentSuccess`.
- `src/components`: landing sections, feature components, and shared app blocks.
- `src/components/ui`: shadcn/ui primitives and local wrappers.
- `src/components/admin`: admin-only UI such as the blog editor.
- `src/lib`: shared frontend logic for profiles, procedure state, sanitization, and logging.
- `src/i18n`: language provider and translation files.
- `src/integrations/supabase`: frontend Supabase client and generated types.
- `supabase/functions`: Edge Functions used by lead, payment, and automation flows.
- `supabase/migrations`: SQL migrations for schema and security rules.
- `docs`: onboarding, architecture, local environment, and testing guides.

## Supabase Notes

- frontend credentials come from `.env` or `.env.local` via `VITE_SUPABASE_*`
- server-side secrets such as `SUPABASE_SERVICE_ROLE_KEY` stay in the Supabase function environment
- payment-related Edge Functions are configured in `supabase/config.toml`
- the local Supabase stack is started from the repository root with `npm run db:supabase:start`
- CinetPay server-side secrets required by the checkout flow:
  - `CINETPAY_API_KEY`
  - `CINETPAY_SITE_ID`
  - `CINETPAY_SECRET_KEY`
  - `SITE_URL`
- `cinetpay-webhook` must be reachable from the public internet for real webhook delivery; in local development, use a tunnel if you need end-to-end webhook testing

## Additional Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md): architecture overview and reading order for new contributors.
- [DEVELOP_CHANGES.md](docs/DEVELOP_CHANGES.md): summary of the hardening work applied on `develop`.
- [FLOWS.md](docs/FLOWS.md): the real end-to-end product flow from public form to paid student dossier.
- [LOCAL_DATABASES.md](docs/LOCAL_DATABASES.md): official local Supabase workflow and environment setup.
- [TESTING.md](docs/TESTING.md): test commands, current coverage status, and recommended validation strategy.
