ALTER TABLE public.short_links ADD COLUMN IF NOT EXISTS created_by uuid;

DROP POLICY IF EXISTS "Authenticated can create links" ON public.short_links;

CREATE POLICY "Authenticated can create their own links" ON public.short_links
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated can view their own links" ON public.short_links
FOR SELECT TO authenticated
USING (created_by = auth.uid() OR expires_at IS NULL OR expires_at > now());