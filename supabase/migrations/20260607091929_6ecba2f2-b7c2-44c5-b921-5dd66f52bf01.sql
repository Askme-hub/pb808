
-- 1) Remove sensitive financial/role tables from Realtime publication.
--    profiles/predictions/ad_campaigns stay (RLS on those tables already filters per-user).
ALTER PUBLICATION supabase_realtime DROP TABLE public.payments;
ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_roles;

-- 2) Restrict prediction_comments reads so VIP comment content isn't exposed to anon/free users.
DROP POLICY IF EXISTS "Anyone can read comments" ON public.prediction_comments;

CREATE POLICY "Comments readable when prediction is accessible"
ON public.prediction_comments
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.predictions p
    WHERE p.id = prediction_comments.prediction_id
      AND p.is_published = true
      AND (p.publish_at IS NULL OR p.publish_at <= now())
      AND (
        p.category = 'free'
        OR (
          auth.uid() IS NOT NULL
          AND (public.has_active_vip(auth.uid()) OR public.has_role(auth.uid(),'admin'))
        )
      )
  )
);

-- 3) Lock down SECURITY DEFINER helper that was executable by PUBLIC/anon.
REVOKE EXECUTE ON FUNCTION public.has_staff_access(uuid) FROM PUBLIC, anon;
