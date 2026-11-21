CREATE TABLE public.play_slot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_key text NOT NULL CHECK (char_length(area_key) BETWEEN 1 AND 120),
  play_date date NOT NULL,
  slot text NOT NULL CHECK (slot IN ('morning','afternoon','evening')),
  sender_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX play_slot_messages_thread_idx ON public.play_slot_messages (area_key, play_date, slot, created_at);

GRANT SELECT, INSERT, DELETE ON public.play_slot_messages TO authenticated;
GRANT ALL ON public.play_slot_messages TO service_role;

ALTER TABLE public.play_slot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Adults read slot chats of players they have not blocked"
ON public.play_slot_messages FOR SELECT TO authenticated
USING (
  public.current_user_is_adult()
  AND (sender_profile_id = public.my_profile_id() OR public.not_blocked_with_me(sender_profile_id))
);

CREATE POLICY "Free players write in their slot chat"
ON public.play_slot_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_profile_id = public.my_profile_id()
  AND public.current_user_is_adult()
  AND play_date >= current_date - 1
  AND EXISTS (
    SELECT 1 FROM public.play_checkins c
    WHERE c.profile_id = public.my_profile_id()
      AND c.play_date = play_slot_messages.play_date
      AND c.slot = play_slot_messages.slot
      AND play_slot_messages.area_key = ANY (c.area_keys)
  )
);

CREATE POLICY "Players delete their own slot messages"
ON public.play_slot_messages FOR DELETE TO authenticated
USING (sender_profile_id = public.my_profile_id());

CREATE OR REPLACE FUNCTION public.connect_area_param(_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT replace(replace(replace(replace(replace(_key, '%', '%25'), ' ', '%20'), '&', '%26'), '#', '%23'), '+', '%2B')
$$;

CREATE OR REPLACE FUNCTION public.notify_play_slot_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_url text;
  v_when text;
  r record;
BEGIN
  SELECT first_name INTO v_name FROM public.profiles WHERE id = NEW.sender_profile_id;
  v_url := '/app/connect?day=' || to_char(NEW.play_date, 'YYYY-MM-DD') || '&slot=' || NEW.slot
    || '&area=' || public.connect_area_param(NEW.area_key) || '&chat=1';
  v_when := to_char(NEW.play_date, 'FMDy FMDD FMMon') || ' · ' || initcap(NEW.slot);
  FOR r IN
    SELECT DISTINCT c.profile_id
    FROM public.play_checkins c
    WHERE c.play_date = NEW.play_date
      AND c.slot = NEW.slot
      AND NEW.area_key = ANY (c.area_keys)
      AND c.profile_id <> NEW.sender_profile_id
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_profile_id = c.profile_id AND b.blocked_profile_id = NEW.sender_profile_id)
           OR (b.blocker_profile_id = NEW.sender_profile_id AND b.blocked_profile_id = c.profile_id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.profile_id = c.profile_id
          AND n.type = 'play_slot_message'
          AND n.url = v_url
          AND n.created_at > now() - interval '10 minutes'
      )
  LOOP
    PERFORM public.enqueue_notification(
      r.profile_id, 'play_slot_message', 'messages',
      COALESCE(v_name, 'A player') || ' · ' || v_when,
      left(NEW.body, 140),
      v_url
    );
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_play_slot_message() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER play_slot_messages_notify
AFTER INSERT ON public.play_slot_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_play_slot_message();

CREATE OR REPLACE FUNCTION public.notify_play_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_url text;
  v_when text;
  r record;
BEGIN
  IF cardinality(NEW.area_keys) = 0 THEN RETURN NEW; END IF;
  SELECT first_name INTO v_name FROM public.profiles WHERE id = NEW.profile_id;
  v_url := '/app/connect?day=' || to_char(NEW.play_date, 'YYYY-MM-DD') || '&slot=' || NEW.slot
    || '&area=' || public.connect_area_param(NEW.area_keys[1]);
  v_when := to_char(NEW.play_date, 'FMDy FMDD FMMon') || ' · ' || initcap(NEW.slot);
  FOR r IN
    SELECT DISTINCT c.profile_id
    FROM public.play_checkins c
    WHERE c.play_date = NEW.play_date
      AND c.slot = NEW.slot
      AND c.profile_id <> NEW.profile_id
      AND c.area_keys && NEW.area_keys
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_profile_id = c.profile_id AND b.blocked_profile_id = NEW.profile_id)
           OR (b.blocker_profile_id = NEW.profile_id AND b.blocked_profile_id = c.profile_id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.profile_id = c.profile_id
          AND n.type = 'play_checkin'
          AND n.url = v_url
          AND n.created_at > now() - interval '2 hours'
      )
  LOOP
    PERFORM public.enqueue_notification(
      r.profile_id, 'play_checkin', 'connect_activity',
      COALESCE(v_name, 'A player') || ' can play too',
      v_when || '. See who is free.',
      v_url
    );
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_play_checkin() FROM PUBLIC, anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.play_slot_messages;