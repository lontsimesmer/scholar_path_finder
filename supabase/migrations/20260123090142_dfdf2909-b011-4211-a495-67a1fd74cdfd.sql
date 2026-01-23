-- Add SELECT policy to prevent public read access
-- Only service role can read leads (via edge functions)
CREATE POLICY "Only service role can read leads"
ON public.leads
FOR SELECT
USING (false);

-- Note: The existing "Service role has full access" policy with USING (true) 
-- applies to the service_role, which bypasses RLS entirely.
-- This SELECT policy blocks anon/authenticated users from reading leads.