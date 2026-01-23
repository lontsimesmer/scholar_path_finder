-- Add explicit RESTRICTIVE policies to prevent UPDATE and DELETE by non-service-role users
-- These policies explicitly deny modifications to protect lead data integrity

CREATE POLICY "No public updates allowed"
ON public.leads
AS RESTRICTIVE
FOR UPDATE
USING (false);

CREATE POLICY "No public deletes allowed"
ON public.leads
AS RESTRICTIVE
FOR DELETE
USING (false);

-- Note: The service_role bypasses RLS entirely, so these don't affect edge functions
-- These policies block anon/authenticated users from modifying lead records