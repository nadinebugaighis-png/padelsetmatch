CREATE TABLE IF NOT EXISTS public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  target_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_links TO authenticated;
GRANT ALL ON public.short_links TO service_role;
GRANT SELECT ON public.short_links TO anon;

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active links" ON public.short_links
FOR SELECT TO anon
USING (expires_at IS NULL OR expires_at > now());

CREATE POLICY "Authenticated can create links" ON public.short_links
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_short_links_code ON public.short_links(code);