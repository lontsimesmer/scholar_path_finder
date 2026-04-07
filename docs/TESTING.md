# Testing Guide

This document explains how testing works in the repository and what is still missing.

## Current State

Automated testing is configured, but current coverage is low.

What exists today:

- Vitest configuration in [vitest.config.ts](../vitest.config.ts)
- Testing Library setup in [src/test/setup.ts](../src/test/setup.ts)
- one placeholder example test in [src/test/example.test.ts](../src/test/example.test.ts)

Important:

- there is no meaningful automated coverage yet for the core business flows
- there is no enforced coverage threshold
- `lint` and `build` currently catch more regressions than the test suite

## Commands

Main quality commands:

```bash
npm run lint
npm run test
npm run build
```

If the change depends on local Supabase:

```bash
npm run db:supabase:start
npm run env:supabase:local
npm run dev
```

## What Should Be Tested First

Priority order for real coverage:

1. `src/lib/student-profile.ts`
2. `src/lib/procedure-lead.ts`
3. route guards and redirects in `Dashboard`, `StartProcedure`, `Checkout`, and `Login`
4. `Contact` conflict handling for existing accounts
5. `CinetpayPayment` validation and submit states
6. admin blog required-field behavior

These areas contain the highest business risk and the most branching logic.

## Manual Regression Checklist

Until automated coverage improves, validate these flows manually:

### Student flow

- create an account from the public contact form
- sign in with an existing account and resume the procedure
- validate profile fields in the dashboard
- submit the private procedure page
- resume checkout when payment is still unpaid

### Payment flow

- open checkout only with a valid authenticated session
- confirm that profile validation is required before payment
- start a CinetPay payment and verify the redirect flow
- verify the return page state after browser return

### Admin flow

- open `/admin/crm`
- edit a student profile
- request a profile correction
- create, edit, hide, and validate blog posts

### Platform checks

- switch FR / EN and verify key pages
- run the app on mobile width for dashboard, checkout, and admin dialogs

## Recommended Test Placement

- utility tests: next to helpers or in `src/test`
- page/component tests: next to the page or component being validated
- naming: `*.test.ts` or `*.test.tsx`

Examples:

- `src/lib/student-profile.test.ts`
- `src/pages/Checkout.test.tsx`
- `src/components/Contact.test.tsx`

## Recommended Strategy for This Repo

For now, treat quality as a 3-step gate:

1. `npm run lint`
2. `npm run test`
3. `npm run build`

Then add manual validation for the feature area you changed.

## Honest Coverage Assessment

If a new developer asks whether the project has strong automated confidence today, the answer is no.

The project has:

- a working test runner
- a very small test baseline
- a real need for business-flow tests before calling coverage mature
