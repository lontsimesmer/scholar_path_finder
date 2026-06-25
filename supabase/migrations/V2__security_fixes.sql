-- Hardening pass applied right after the initial baseline.
--
-- 1. Enable RLS on public.admins (no policies = no access via anon/authenticated;
--    service_role bypasses RLS so internal lookups in policies continue to work).
-- 2. Revoke EXECUTE on SECURITY DEFINER trigger functions so they cannot be
--    invoked via the PostgREST RPC surface (/rest/v1/rpc/<fn>).

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

REVOKE EXECUTE ON FUNCTION public.prevent_unsafe_student_document_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_unsafe_student_document_request_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_unsafe_notification_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_unsafe_manual_payment_submission_update() FROM PUBLIC, anon, authenticated;
