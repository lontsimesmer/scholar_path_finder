-- V8 : activer Supabase Realtime sur manual_payment_submissions.
--
-- Objectif : que /admin/manual-payments mette à jour ses métriques (En attente,
-- Validées, Rejetées) en direct dès qu'une soumission est créée ou change de
-- statut, sans F5. La souscription frontend est un simple postgres_changes
-- (INSERT + UPDATE + DELETE) qui déclenche un refetch dans le hook.
--
-- Idempotent : ne rejoue pas l'ajout si la table est déjà dans la publication.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'manual_payment_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_payment_submissions;
  END IF;
END
$$;
