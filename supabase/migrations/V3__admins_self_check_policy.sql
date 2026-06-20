-- V2 enabled RLS on public.admins with no policies, which broke:
--   1. Login.tsx isAdminEmail() lookup (frontend can no longer detect admin).
--   2. All admin RLS policies on other tables (their `EXISTS (SELECT 1 FROM admins
--      WHERE email = auth.jwt() email)` clause runs under the caller role and now
--      returns 0 rows).
--
-- Fix: allow any authenticated user to read ONLY their own admin row. This keeps
-- the original V2 security goal (no full enumeration of the admin email list via
-- the anon key) while restoring legitimate self-checks.

CREATE POLICY "Authenticated users can read their own admin row"
ON public.admins
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' = email
);
