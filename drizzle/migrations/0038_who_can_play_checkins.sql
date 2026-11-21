CREATE TABLE public.play_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  play_date date NOT NULL,
  slot text NOT NULL CHECK (slot IN ('morning','afternoon','evening')),
  area_keys text[] NOT NULL DEFAULT '{}',
  area_label text CHECK (area_label IS NULL OR char_length(area_label) <= 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, play_date, slot)
);
CREATE INDEX play_checkins_date_slot_idx ON public.play_checkins (play_date, slot);
CREATE INDEX play_checkins_area_keys_idx ON public.play_checkins USING gin (area_keys);

GRANT SELECT, INSERT, DELETE ON public.play_checkins TO authenticated;
GRANT ALL ON public.play_checkins TO service_role;

ALTER TABLE public.play_checkins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.not_blocked_with_me(_other uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_profile_id = public.my_profile_id() AND b.blocked_profile_id = _other)
       OR (b.blocker_profile_id = _other AND b.blocked_profile_id = public.my_profile_id())
  )
$$;
REVOKE ALL ON FUNCTION public.not_blocked_with_me(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.not_blocked_with_me(uuid) TO authenticated;

CREATE POLICY "Adults see check-ins of players they have not blocked"
ON public.play_checkins FOR SELECT TO authenticated
USING (
  public.current_user_is_adult()
  AND (profile_id = public.my_profile_id() OR public.not_blocked_with_me(profile_id))
);

CREATE POLICY "Players add their own check-ins"
ON public.play_checkins FOR INSERT TO authenticated
WITH CHECK (
  profile_id = public.my_profile_id()
  AND public.current_user_is_adult()
  AND play_date BETWEEN current_date - 1 AND current_date + 8
);

CREATE POLICY "Players remove their own check-ins"
ON public.play_checkins FOR DELETE TO authenticated
USING (profile_id = public.my_profile_id());

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
  v_url := '/app/connect?day=' || to_char(NEW.play_date, 'YYYY-MM-DD') || '&slot=' || NEW.slot;
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
      v_when || '. See who is in.',
      v_url
    );
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_play_checkin() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER play_checkins_notify
AFTER INSERT ON public.play_checkins
FOR EACH ROW EXECUTE FUNCTION public.notify_play_checkin();