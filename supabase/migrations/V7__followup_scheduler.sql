-- V7 : planificateur des relances automatiques.
--
-- 1. Semer la configuration par défaut dans app_settings (clé leads.followup_config).
-- 2. Activer pg_cron + pg_net (indispensable pour appeler l'Edge Function depuis Postgres).
-- 3. Créer une fonction SQL qui lit deux secrets Vault (URL de la fonction + service role JWT)
--    et fait un POST asynchrone via pg_net vers send-follow-ups.
-- 4. Planifier le job toutes les heures. La fonction send-follow-ups lit
--    leads.followup_config à chaque tick pour décider si elle envoie ou non.
--
-- Après application de cette migration, exécuter UNE FOIS ces deux commandes
-- dans le SQL editor pour provisionner les secrets Vault utilisés par le job.
-- Sans ces secrets, la fonction PL/pgSQL log un warning puis quitte sans appeler
-- l'Edge Function — c'est intentionnel pour éviter des runs silencieux à vide.
--
--   -- 1) URL publique de la fonction Edge (déjà OK si le projet est celui de prod)
--   SELECT vault.create_secret(
--     'https://tpifecyqvepcldjchlxs.supabase.co/functions/v1/send-follow-ups',
--     'send_follow_ups_url'
--   );
--
--   -- 2) Service role JWT (récupérable via Dashboard → Settings → API → service_role)
--   --    Attention : cette clé donne accès admin complet à la BD, ne jamais l'exposer
--   --    ailleurs qu'ici (le Vault Supabase l'encrypte au repos).
--   SELECT vault.create_secret(
--     'YOUR_SERVICE_ROLE_KEY_HERE',
--     'send_follow_ups_service_role'
--   );
--
-- Pour désactiver rapidement l'envoi sans toucher au job cron :
--   UPDATE public.app_settings
--   SET value = jsonb_set(value, '{enabled}', 'false'::jsonb)
--   WHERE key = 'leads.followup_config';
-- (ou passer par la page /admin/followup-settings côté frontend).

INSERT INTO public.app_settings (key, value, description)
VALUES (
  'leads.followup_config',
  '{"enabled": true, "max_follow_ups": 14, "interval_hours": 24}'::jsonb,
  'Configuration of automated lead follow-ups (send-follow-ups cron).'
)
ON CONFLICT (key) DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_send_follow_ups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_config JSONB;
  v_enabled BOOLEAN;
  v_url TEXT;
  v_service_role TEXT;
BEGIN
  SELECT value
    INTO v_config
    FROM public.app_settings
    WHERE key = 'leads.followup_config';

  v_enabled := COALESCE((v_config->>'enabled')::boolean, false);
  IF NOT v_enabled THEN
    RAISE NOTICE 'send-follow-ups skipped: disabled in app_settings';
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'send_follow_ups_url';
  SELECT decrypted_secret INTO v_service_role
    FROM vault.decrypted_secrets WHERE name = 'send_follow_ups_service_role';

  IF v_url IS NULL OR v_service_role IS NULL THEN
    RAISE WARNING 'send-follow-ups skipped: missing Vault secrets (send_follow_ups_url / send_follow_ups_service_role)';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_role,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('trigger', 'pg_cron', 'invoked_at', now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_send_follow_ups() FROM PUBLIC;

-- Remove any pre-existing schedule with the same name so re-runs stay idempotent.
DO $$
DECLARE
  v_existing_jobid BIGINT;
BEGIN
  SELECT jobid INTO v_existing_jobid FROM cron.job WHERE jobname = 'lead-followups-hourly';
  IF v_existing_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_existing_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'lead-followups-hourly',
  '0 * * * *',
  $$ SELECT public.trigger_send_follow_ups(); $$
);
