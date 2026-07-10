
-- Favorites table (silent — the favorited player is never told)
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  favorite_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, favorite_profile_id),
  CHECK (profile_id <> favorite_profile_id)
);

GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own favorites read" ON public.favorites FOR SELECT TO authenticated
  USING (profile_id = public.my_profile_id());
CREATE POLICY "own favorites insert" ON public.favorites FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.my_profile_id());
CREATE POLICY "own favorites delete" ON public.favorites FOR DELETE TO authenticated
  USING (profile_id = public.my_profile_id());

CREATE INDEX IF NOT EXISTS favorites_favorite_profile_id_idx ON public.favorites (favorite_profile_id);

-- New notification preference (default on)
ALTER TABLE public.notification_prefs ADD COLUMN IF NOT EXISTS favorite_activity BOOLEAN NOT NULL DEFAULT true;

-- Trigger: when a favorited player CREATES a match, notify their favoriters (if slots remain and future)
CREATE OR REPLACE FUNCTION public.notify_favorite_match_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  v_host_name TEXT;
  v_slots INT;
BEGIN
  IF NEW.starts_at <= now() THEN RETURN NEW; END IF;
  v_slots := 4 - (1 + COALESCE(NEW.extra_confirmed, 0));
  IF v_slots <= 0 THEN RETURN NEW; END IF;
  SELECT first_name INTO v_host_name FROM public.profiles WHERE id = NEW.host_profile_id;
  FOR r IN
    SELECT f.profile_id
    FROM public.favorites f
    WHERE f.favorite_profile_id = NEW.host_profile_id
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_profile_id = f.profile_id AND b.blocked_profile_id = NEW.host_profile_id)
           OR (b.blocker_profile_id = NEW.host_profile_id AND b.blocked_profile_id = f.profile_id)
      )
  LOOP
    PERFORM public.enqueue_notification(
      r.profile_id, 'favorite_match', 'favorite_activity',
      COALESCE(v_host_name, 'A favorite') || ' created a match',
      COALESCE(NEW.club_name, 'Match') || ' — ' || to_char(NEW.starts_at, 'Dy DD Mon, HH24:MI') || ' · ' || v_slots || ' spot' || CASE WHEN v_slots = 1 THEN '' ELSE 's' END || ' left',
      '/app/events/' || NEW.id::text
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_favorite_match_created ON public.match_events;
CREATE TRIGGER trg_notify_favorite_match_created
AFTER INSERT ON public.match_events
FOR EACH ROW EXECUTE FUNCTION public.notify_favorite_match_created();

-- Trigger: when a favorited player JOINS an existing match with spots left, notify their favoriters
-- (skip host — already covered by the create trigger)
CREATE OR REPLACE FUNCTION public.notify_favorite_match_joined()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  v_event RECORD;
  v_name TEXT;
  v_count INT;
  v_slots INT;
BEGIN
  SELECT id, host_profile_id, starts_at, club_name, extra_confirmed, status
    INTO v_event FROM public.match_events WHERE id = NEW.match_event_id;
  IF v_event.id IS NULL OR v_event.starts_at <= now() THEN RETURN NEW; END IF;
  IF v_event.host_profile_id = NEW.profile_id THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_count FROM public.match_event_participants WHERE match_event_id = NEW.match_event_id;
  v_slots := 4 - (v_count + COALESCE(v_event.extra_confirmed, 0));
  IF v_slots <= 0 THEN RETURN NEW; END IF;

  SELECT first_name INTO v_name FROM public.profiles WHERE id = NEW.profile_id;
  FOR r IN
    SELECT f.profile_id
    FROM public.favorites f
    WHERE f.favorite_profile_id = NEW.profile_id
      AND NOT EXISTS (
        SELECT 1 FROM public.match_event_participants p
        WHERE p.match_event_id = NEW.match_event_id AND p.profile_id = f.profile_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_profile_id = f.profile_id AND b.blocked_profile_id = NEW.profile_id)
           OR (b.blocker_profile_id = NEW.profile_id AND b.blocked_profile_id = f.profile_id)
      )
  LOOP
    PERFORM public.enqueue_notification(
      r.profile_id, 'favorite_match', 'favorite_activity',
      COALESCE(v_name, 'A favorite') || ' joined a match',
      COALESCE(v_event.club_name, 'Match') || ' — ' || to_char(v_event.starts_at, 'Dy DD Mon, HH24:MI') || ' · ' || v_slots || ' spot' || CASE WHEN v_slots = 1 THEN '' ELSE 's' END || ' left',
      '/app/events/' || NEW.match_event_id::text
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_favorite_match_joined ON public.match_event_participants;
CREATE TRIGGER trg_notify_favorite_match_joined
AFTER INSERT ON public.match_event_participants
FOR EACH ROW EXECUTE FUNCTION public.notify_favorite_match_joined();

-- Convenience RPC: list my favorite profile ids
CREATE OR REPLACE FUNCTION public.list_my_favorite_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT favorite_profile_id FROM public.favorites WHERE profile_id = public.my_profile_id();
$$;
REVOKE ALL ON FUNCTION public.list_my_favorite_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_favorite_ids() TO authenticated;
