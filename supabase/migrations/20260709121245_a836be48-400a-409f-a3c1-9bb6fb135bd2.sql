ALTER TABLE public.connect_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER connect_comments_set_updated_at
  BEFORE UPDATE ON public.connect_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Users can update their own comments"
  ON public.connect_comments FOR UPDATE
  TO authenticated
  USING (author_profile_id = public.my_profile_id())
  WITH CHECK (author_profile_id = public.my_profile_id());