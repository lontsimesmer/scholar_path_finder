-- Fix: Block direct public inserts to the leads table
-- The edge function uses service_role which bypasses RLS, so it will still work
-- But direct database access with anon key will be blocked

-- Drop the old permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;

-- Create a new restrictive INSERT policy that blocks public inserts
-- Only service_role (which bypasses RLS) can insert
CREATE POLICY "No direct public inserts allowed"
ON public.leads
FOR INSERT
WITH CHECK (false);

-- Comment: This prevents spam bots from inserting directly into the database
-- All lead submissions must go through the submit-lead edge function
-- which enforces rate limiting, input validation, and other protections