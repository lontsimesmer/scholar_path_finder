-- V5 corrige la récursion RLS introduite par V4.
--
-- Les policies V4 sur public.admins font un sous-SELECT sur public.admins
-- pour vérifier que l'appelant est admin. Lors de l'évaluation, ce sous-SELECT
-- redéclenche la policy sur admins → "infinite recursion detected in policy
-- for relation admins".
--
-- Fix : encapsuler le check dans une fonction SECURITY DEFINER qui s'exécute
-- avec les privilèges du propriétaire (postgres) et bypass RLS. Les policies
-- appellent la fonction au lieu de refaire le SELECT directement.
--
-- La policy V3 "Authenticated users can read their own admin row" reste en
-- place (auth.jwt() ->> 'email' = email, pas de sous-SELECT, pas de récursion),
-- ce qui garantit qu'un user peut toujours vérifier son propre statut admin
-- même hors de la fonction.

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email'
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins can list all admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can add admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can remove admins" ON public.admins;

CREATE POLICY "Admins can list all admins"
ON public.admins
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

CREATE POLICY "Admins can add admins"
ON public.admins
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can remove admins"
ON public.admins
FOR DELETE
TO authenticated
USING (
  email <> (auth.jwt() ->> 'email')
  AND public.is_current_user_admin()
);
