-- V4 ouvre la gestion des admins depuis l'app :
--   * les admins peuvent lister l'ensemble des lignes de public.admins (en plus de la
--     policy self-check de V3, indispensable au moment du login) ;
--   * les admins peuvent ajouter un nouvel email (INSERT) ;
--   * les admins peuvent retirer un email (DELETE), mais pas le leur (garde-fou
--     anti auto-suppression, doublé par l'Edge Function et l'UI).
--
-- La RLS de V2 reste en place, les policies restrictives de la table conservent
-- leur logique (les non-admins ne voient toujours rien).

DROP POLICY IF EXISTS "Admins can list all admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can add admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can remove admins" ON public.admins;

CREATE POLICY "Admins can list all admins"
ON public.admins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admins caller
    WHERE caller.email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Admins can add admins"
ON public.admins
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admins caller
    WHERE caller.email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Admins can remove admins"
ON public.admins
FOR DELETE
TO authenticated
USING (
  email <> (auth.jwt() ->> 'email')
  AND EXISTS (
    SELECT 1
    FROM public.admins caller
    WHERE caller.email = auth.jwt() ->> 'email'
  )
);
