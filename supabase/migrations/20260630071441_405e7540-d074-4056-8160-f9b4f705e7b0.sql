ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE POLICY "Sender can edit own messages"
  ON public.messages FOR UPDATE
  USING (sender_profile_id = my_profile_id())
  WITH CHECK (sender_profile_id = my_profile_id());

CREATE POLICY "Sender can delete own messages"
  ON public.messages FOR DELETE
  USING (sender_profile_id = my_profile_id());