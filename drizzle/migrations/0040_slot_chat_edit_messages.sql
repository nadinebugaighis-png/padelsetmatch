ALTER TABLE public.play_slot_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

GRANT UPDATE (body, edited_at) ON public.play_slot_messages TO authenticated;

CREATE POLICY "Players edit their own slot messages"
ON public.play_slot_messages FOR UPDATE TO authenticated
USING (sender_profile_id = public.my_profile_id())
WITH CHECK (sender_profile_id = public.my_profile_id());