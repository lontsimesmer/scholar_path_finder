-- Remove the redundant and confusing "Service role has full access" policy
-- Service role bypasses RLS entirely, so this policy is unnecessary
-- and triggers the "RLS Policy Always True" warning

DROP POLICY IF EXISTS "Service role has full access" ON public.leads;

-- The remaining policies are:
-- 1. "Anyone can create leads" (INSERT, WITH CHECK true) - INTENTIONAL for public lead form
-- 2. "Only service role can read leads" (SELECT, USING false) - blocks public reads
-- 3. "No public updates allowed" (UPDATE, USING false) - blocks public updates  
-- 4. "No public deletes allowed" (DELETE, USING false) - blocks public deletes
-- 
-- This pattern correctly:
-- - Allows anyone to submit leads (public contact form)
-- - Blocks all other public access
-- - Service role (edge functions) bypasses RLS for full access