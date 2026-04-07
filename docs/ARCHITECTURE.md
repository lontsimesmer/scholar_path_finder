# Architecture Overview

This document is the quickest way to understand how the application is organized after `README.md`.

## High-Level Shape

The project has 3 main layers:

- `src/`: the React frontend
- `supabase/functions/`: server-side business actions and payment/webhook handlers
- `supabase/migrations/`: database structure and security rules

The app is not a generic dashboard. It is a student-procedure product with a public acquisition flow, an authenticated student flow, and an admin back-office.

## Frontend Structure

Core frontend folders:

- `src/pages`: route-level screens
- `src/components`: page sections and feature components
- `src/components/ui`: local shadcn/ui primitives
- `src/lib`: feature helpers and shared logic
- `src/i18n`: language provider and translations
- `src/integrations/supabase`: frontend Supabase client

Main route entry is [App.tsx](../src/App.tsx). Read it first.

## Main User Flows

### 1. Public marketing flow

- Homepage: [Index.tsx](../src/pages/Index.tsx)
- Main sections: `Hero`, `Services`, `About`, `HowItWorks`, `Testimonials`, `FAQ`, `Contact`
- Public contact form: [Contact.tsx](../src/components/Contact.tsx)

This flow creates a lead, can create an account automatically, and redirects the user into the student journey.

### 2. Student account and profile flow

- Login / signup: [Login.tsx](../src/pages/Login.tsx)
- Student dashboard: [Dashboard.tsx](../src/pages/Dashboard.tsx)
- Private submission step: [StartProcedure.tsx](../src/pages/StartProcedure.tsx)

Important rule:

- a student must validate identity fields before the procedure can continue
- once validated, only admin can modify the profile unless the admin reopens it for correction

Shared profile logic is in [student-profile.ts](../src/lib/student-profile.ts).

### 3. Payment flow

- Checkout page: [Checkout.tsx](../src/pages/Checkout.tsx)
- Payment component: [CinetpayPayment.tsx](../src/components/checkout/CinetpayPayment.tsx)
- Return page: [PaymentSuccess.tsx](../src/pages/PaymentSuccess.tsx)

The current primary payment path is CinetPay. The backend is the source of truth for payment confirmation.

### 4. Admin flow

- Admin landing: [AdminDashboard.tsx](../src/pages/AdminDashboard.tsx)
- CRM: [AdminCRM.tsx](../src/pages/AdminCRM.tsx)
- Blog back-office: [AdminBlog.tsx](../src/pages/AdminBlog.tsx)

## Backend Structure

Main Edge Functions:

- `submit-lead`: creates or reuses leads, handles account creation conflicts
- `get-student-procedure-status`: resolves current lead/payment state for the signed-in student
- `create-cinetpay-payment`: initializes CinetPay transactions
- `cinetpay-webhook`: receives server-side payment notifications
- `get-cinetpay-payment-status`: reconciles payment status after browser return
- `send-follow-ups`: lead reactivation / reminder automation

Shared backend helpers live in `supabase/functions/_shared`.

## Main Data Model

Key tables:

- `leads`: public acquisition + payment intent state
- `student_profiles`: student identity and academic profile
- `student_applications`: active student dossier after confirmed payment
- `student_documents`: uploaded student files
- `payment_transactions`: CinetPay transaction tracking
- `admins`: admin access control
- `blog_categories` / `blog_posts`: public blog content

## Reading Order for a New Contributor

1. [README.md](../README.md)
2. [ARCHITECTURE.md](./ARCHITECTURE.md)
3. [FLOWS.md](./FLOWS.md)
4. [LOCAL_DATABASES.md](./LOCAL_DATABASES.md)
5. [DEVELOP_CHANGES.md](./DEVELOP_CHANGES.md)
6. [App.tsx](../src/App.tsx)
7. `src/pages/`
8. `supabase/functions/`
9. `supabase/migrations/`
