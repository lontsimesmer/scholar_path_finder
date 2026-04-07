# Main Product Flows

This document explains the real user journey without requiring a full code read.

## 1. Public Acquisition Flow

Entry point:

- homepage contact form in [Contact.tsx](../src/components/Contact.tsx)

What happens:

1. the visitor fills in name, email, phone, and message
2. if the visitor is not signed in, the form also asks for a password
3. the frontend calls `submit-lead`
4. a `lead` is created or reused in `public.leads`

Possible outcomes:

- no account yet: the backend creates the account, the frontend signs the user in, then redirects to the dashboard
- existing account: the form draft is kept, and the user is redirected to login
- already signed-in account: the same email is reused and the lead is refreshed safely

## 2. Account Conflict Handling

If a person already has an account and submits the public form again while signed out:

1. `submit-lead` detects that the auth account already exists
2. the frontend does not auto-connect that person for security reasons
3. the user is redirected to `/login?redirect=/start-procedure`
4. after login, the user continues the private procedure flow

This avoids taking over an existing account from a public form.

## 3. Student Profile Validation Flow

Main page:

- [Dashboard.tsx](../src/pages/Dashboard.tsx)

Required identity fields:

- first name
- last name
- date of birth

Rules:

- the student must validate these fields before continuing
- after validation, the profile becomes final for the student
- only admin can change it unless the admin requests a correction

If admin requests a correction:

1. admin reopens the profile from [AdminCRM.tsx](../src/pages/AdminCRM.tsx)
2. a correction comment is stored
3. the student can edit again
4. the student must validate the profile again

## 4. Private Procedure Submission Flow

Main page:

- [StartProcedure.tsx](../src/pages/StartProcedure.tsx)

Access rules:

- the page is private
- anonymous users are redirected to login
- users with an incomplete profile are redirected back to the dashboard

What happens on submit:

1. the page loads the signed-in user profile
2. it checks whether a current actionable lead already exists
3. if not, the student submits phone + procedure message
4. the frontend calls `submit-lead`
5. the lead is created or reused
6. the student is redirected to checkout

Important:

- the phone number is stored both in `leads.phone` and `student_profiles.phone_number`
- if a lead already exists and payment is still missing, the page does not ask for a new submission; it offers payment continuation directly

## 5. Checkout and Payment Flow

Main page:

- [Checkout.tsx](../src/pages/Checkout.tsx)

Rules before payment:

- the user must be authenticated
- the user must have a validated profile
- a valid `leadId` must be present

Payment provider:

- CinetPay is the primary checkout flow

Backend payment flow:

1. frontend calls `create-cinetpay-payment`
2. backend creates a `payment_transactions` row
3. browser is redirected to CinetPay
4. CinetPay notifies the backend through `cinetpay-webhook`
5. the backend verifies the transaction server-side
6. `leads.payment_status` is updated

Important:

- the browser return page is not the source of truth
- server-side verification is the source of truth

## 6. If Payment Is Not Completed

If the procedure is submitted but payment is not completed:

1. the lead remains in an actionable unpaid state
2. the dashboard shows a payment-required state
3. `/start-procedure` shows a payment continuation state instead of asking for a new submission
4. the student can resume payment later

At this point:

- the lead exists
- the profile exists
- but the real student dossier is not active yet

## 7. When the Dossier Becomes Active

The real student dossier starts only after payment confirmation.

What happens after confirmed payment:

1. the lead is marked as paid
2. `ensureConsultationApplication` creates `student_applications` if needed
3. the student becomes visible in the admin CRM as an active case

So the product distinction is:

- `lead`: acquisition and payment intent
- `student_profile`: identity and academic profile
- `student_application`: active paid dossier

## 8. Recommended Reading Order for This Flow

1. [README.md](../README.md)
2. [ARCHITECTURE.md](./ARCHITECTURE.md)
3. [FLOWS.md](./FLOWS.md)
4. [Contact.tsx](../src/components/Contact.tsx)
5. [Dashboard.tsx](../src/pages/Dashboard.tsx)
6. [StartProcedure.tsx](../src/pages/StartProcedure.tsx)
7. [Checkout.tsx](../src/pages/Checkout.tsx)
8. `supabase/functions/submit-lead`
9. `supabase/functions/create-cinetpay-payment`
10. `supabase/functions/cinetpay-webhook`
