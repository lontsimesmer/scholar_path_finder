-- V9 : activer Supabase Realtime sur leads.
--
-- Objectif : sur /admin/manual-payments, refléter en live le passage d'un lead
-- à bloqué / débloqué (colonne manual_payment_blocked_at) quand l'action se fait
-- depuis un autre onglet (typiquement /admin/leads). Sans ça, la card
-- "Leads bloqués" restait stale entre deux refetch déclenchés par
-- manual_payment_submissions.
--
-- Le frontend n'écoute pas leads de façon fine (pas de filtre serveur sur
-- manual_payment_blocked_at) car c'est difficile à modéliser côté Postgres
-- Realtime. À la place, un debounce côté hook collapse les rafales d'events
-- en un seul refetch.
--
-- Idempotent : ne rejoue pas l'ajout si la table est déjà dans la publication.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
END
$$;
