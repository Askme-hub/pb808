DROP POLICY IF EXISTS "Profiles are viewable by everyone (public info)" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Settings readable" ON public.settings;
CREATE POLICY "Admins can read settings" ON public.settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));