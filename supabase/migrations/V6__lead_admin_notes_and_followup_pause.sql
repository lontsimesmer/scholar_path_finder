-- V6 : ajoute les notes internes sur les leads (miroir de student_admin_notes)
-- et le drapeau de mise en pause des relances (auto + manuelles).
--
-- lead_admin_notes : table dédiée pour garder l'historique des notes par admin,
-- avec RLS "admins seulement" alignée sur student_admin_notes.
--
-- follow_up_paused_at + follow_up_paused_by + follow_up_paused_reason sur
-- public.leads permettent au cron send-follow-ups et à l'Edge Function
-- admin-lead-followup d'ignorer les leads mis en pause explicitement.
-- Le blocage manual_payment_blocked_at reste indépendant (paiement manuel).

CREATE TABLE IF NOT EXISTS public.lead_admin_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  note TEXT NOT NULL CHECK (btrim(note) <> ''),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS lead_admin_notes_lead_id_idx
  ON public.lead_admin_notes (lead_id, created_at DESC);

ALTER TABLE public.lead_admin_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage lead admin notes" ON public.lead_admin_notes;

CREATE POLICY "Admins can manage lead admin notes"
  ON public.lead_admin_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admins
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admins
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  );

DROP TRIGGER IF EXISTS update_lead_admin_notes_updated_at ON public.lead_admin_notes;

CREATE TRIGGER update_lead_admin_notes_updated_at
BEFORE UPDATE ON public.lead_admin_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS follow_up_paused_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS follow_up_paused_by TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_paused_reason TEXT;

CREATE INDEX IF NOT EXISTS leads_follow_up_paused_at_idx
  ON public.leads (follow_up_paused_at)
  WHERE follow_up_paused_at IS NOT NULL;
