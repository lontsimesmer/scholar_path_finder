# Develop Branch Changes

## Scope
This document summarizes the corrective work applied on the `develop` branch after the technical audit. It focuses on functional fixes, security hardening, and baseline quality restoration.

## 1. Payment Flow Hardening

### Real Stripe redirect instead of fake card processing
- Files: `src/pages/Checkout.tsx`, `src/components/checkout/StripePayment.tsx`
- Change: removed the fake client-side card flow and replaced it with a real redirect to Stripe Checkout.
- Why: the previous flow simulated a successful payment locally, which could confirm a consultation without any real charge.

### Payment success page now verifies the payment
- Files: `src/pages/PaymentSuccess.tsx`, `supabase/functions/verify-stripe-payment/index.ts`
- Change: the success page no longer trusts the URL alone. It verifies the Stripe session before showing a confirmed payment state.
- Why: a user must never see "payment successful" unless the server has confirmed the session as paid.

### Mobile Money now stays pending until real verification
- Files: `src/components/checkout/MobileMoneyPayment.tsx`, `supabase/functions/mtn-momo-payment/index.ts`, `supabase/functions/process-mobile-money/index.ts`
- Change: Orange and MTN manual flows no longer redirect to success immediately; they remain in a pending/manual verification state.
- Why: a manual payment confirmation is not equivalent to a verified payment.

### Account numbers aligned between UI and backend
- Files: `src/components/checkout/MobileMoneyPayment.tsx`, `supabase/functions/mtn-momo-payment/index.ts`, `supabase/functions/process-mobile-money/index.ts`
- Change: aligned the MTN and Orange destination numbers shown to users with the numbers used by backend responses.
- Why: inconsistent account numbers are an operational risk and can send money to the wrong destination.

### Unsafe local card-entry UI removed
- Files: `src/components/checkout/CardPaymentModal.tsx`, `src/components/checkout/PaymentMethodSelector.tsx`
- Change: removed the unused local card collection modal and selector helper.
- Why: card data must not be collected in custom app UI when Stripe Checkout already handles the secure flow.

## 2. Security Hardening

### JWT protection restored on sensitive Edge Functions
- File: `supabase/config.toml`
- Change: enabled `verify_jwt = true` for payment-related functions.
- Why: anonymous callers should not be able to trigger lead mutations or payment operations.

### Shared auth and ownership checks added
- File: `supabase/functions/_shared/auth-utils.ts`
- Change: introduced reusable helpers to authenticate the current user and verify lead ownership.
- Why: centralizing these checks reduces duplication and prevents inconsistent security rules across functions.

### Lead mutations now require authenticated ownership
- Files: `supabase/functions/create-checkout/index.ts`, `supabase/functions/process-mobile-money/index.ts`, `supabase/functions/process-bank-transfer/index.ts`, `supabase/functions/mtn-momo-payment/index.ts`
- Change: the backend now checks that the signed-in user matches the lead email before reading or updating the lead.
- Why: this blocks IDOR-style abuse where someone could reuse another person’s `leadId`.

### Follow-up automation trigger secured
- File: `supabase/functions/send-follow-ups/index.ts`
- Change: removed reliance on a forgeable cron header and restricted execution to a trusted secret or service role authorization.
- Why: a public caller must not be able to start a bulk email/SMS follow-up campaign.

## 3. Lead and Notification Flow

### Checkout links now preserve lead identity and email context
- Files: `src/components/Contact.tsx`, `src/pages/Login.tsx`, `supabase/functions/submit-lead/index.ts`
- Change: checkout redirects now carry normalized lead context more consistently.
- Why: this makes login redirects safer and helps the backend confirm ownership reliably.

### Follow-up campaign logic fixed
- File: `supabase/functions/send-follow-ups/index.ts`
- Change: follow-up selection now includes both `pending` and `follow_up` leads.
- Why: the previous logic stopped the campaign after the first follow-up instead of continuing across the full sequence.

### Email normalization tightened
- File: `supabase/functions/submit-lead/index.ts`
- Change: emails are normalized before lookup, insert, and outbound messaging.
- Why: normalization avoids duplicate lead identities caused by casing or formatting differences.

## 4. Data and Schema Alignment

### Database constraint updated for bank transfer pending state
- File: `supabase/migrations/20260330132000_extend_payment_status_constraint.sql`
- Change: extended the `payment_status` constraint to include `bank_transfer_pending`.
- Why: the backend was using a status that was not fully represented by the database constraint set.

## 5. Quality and Repo Hygiene

### Secrets now ignored by Git
- File: `.gitignore`
- Change: added `.env` and `.env.*`.
- Why: environment files should not be tracked in source control.

### Lint baseline restored
- Files: `tailwind.config.ts`, `src/components/ui/command.tsx`, `src/components/ui/textarea.tsx`
- Change: fixed lint-breaking issues that prevented `npm run lint` from passing.
- Why: a broken quality gate hides real regressions and makes future changes harder to validate.

## Validation
- `npm run lint`: passes with warnings only
- `npm run test`: passes
- `npm run build`: passes

## Remaining Notes
- Existing unrelated changes in `package.json`, `package-lock.json`, and `AGENTS.md` were not overwritten.
- Remaining warnings are mostly existing frontend/tooling items: React Fast Refresh warnings in some shadcn files, CSS import order in `src/index.css`, and bundle size warnings during build.
