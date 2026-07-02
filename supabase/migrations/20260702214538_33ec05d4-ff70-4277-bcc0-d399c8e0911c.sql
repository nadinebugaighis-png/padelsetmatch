-- Enums
CREATE TYPE public.match_gender_rule AS ENUM ('mixed', 'men_only', 'women_only');
CREATE TYPE public.match_event_status AS ENUM ('open', 'full', 'cancelled', 'played');

-- match_events
CREATE TABLE public.match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  club_name TEXT NOT NULL,
  club_address TEXT,
  club_place_id TEXT,
  club_lat DOUBLE PRECISION,
  club_lng DOUBLE PRECISION,
  city TEXT,
  country TEXT,
  level_min TEXT NOT NULL DEFAULT 'casual',
  level_max TEXT NOT NULL DEFAULT 'advanced',
  gender_rule public.match_gender_rule NOT NULL DEFAULT 'mixed',
  extra_confirmed INT NOT NULL DEFAULT 0 CHECK (extra_confirmed >= 0 AND extra_confirmed <= 3),
  note TEXT,
  playtomic_link TEXT,
  court_booked BOOLEAN NOT NULL DEFAULT FALSE,
  status public.match_event_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_events TO authenticated;
GRANT ALL ON public.match_events TO service_role;

ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view non-cancelled match events"
  ON public.match_events FOR SELECT
  TO authenticated
  USING (status <> 'cancelled' OR host_profile_id = public.my_profile_id());

CREATE POLICY "Users can create match events as themselves"
  ON public.match_events FOR INSERT
  TO authenticated
  WITH CHECK (host_profile_id = public.my_profile_id());

CREATE POLICY "Host can update their own match events"
  ON public.match_events FOR UPDATE
  TO authenticated
  USING (host_profile_id = public.my_profile_id())
  WITH CHECK (host_profile_id = public.my_profile_id());

CREATE POLICY "Host can delete their own match events"
  ON public.match_events FOR DELETE
  TO authenticated
  USING (host_profile_id = public.my_profile_id());

CREATE INDEX idx_match_events_starts_at ON public.match_events(starts_at);
CREATE INDEX idx_match_events_city ON public.match_events(city);
CREATE INDEX idx_match_events_host ON public.match_events(host_profile_id);

-- Participants
CREATE TABLE public.match_event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_event_id UUID NOT NULL REFERENCES public.match_events(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_event_id, profile_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_event_participants TO authenticated;
GRANT ALL ON public.match_event_participants TO service_role;

ALTER TABLE public.match_event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view participants"
  ON public.match_event_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join match events as themselves"
  ON public.match_event_participants FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = public.my_profile_id());

CREATE POLICY "Users can leave match events they joined"
  ON public.match_event_participants FOR DELETE
  TO authenticated
  USING (
    profile_id = public.my_profile_id()
    OR EXISTS (
      SELECT 1 FROM public.match_events me
      WHERE me.id = match_event_id AND me.host_profile_id = public.my_profile_id()
    )
  );

CREATE INDEX idx_mep_event ON public.match_event_participants(match_event_id);
CREATE INDEX idx_mep_profile ON public.match_event_participants(profile_id);

-- Messages
CREATE TABLE public.match_event_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_event_id UUID NOT NULL REFERENCES public.match_events(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.match_event_messages TO authenticated;
GRANT ALL ON public.match_event_messages TO service_role;

ALTER TABLE public.match_event_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read messages"
  ON public.match_event_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.match_event_participants p
      WHERE p.match_event_id = match_event_messages.match_event_id
        AND p.profile_id = public.my_profile_id()
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.match_event_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_profile_id = public.my_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.match_event_participants p
      WHERE p.match_event_id = match_event_messages.match_event_id
        AND p.profile_id = public.my_profile_id()
    )
  );

CREATE INDEX idx_mem_event ON public.match_event_messages(match_event_id, created_at);

-- Updated-at trigger
CREATE TRIGGER trg_match_events_updated
  BEFORE UPDATE ON public.match_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-add host as participant on create
CREATE OR REPLACE FUNCTION public.add_host_as_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.match_event_participants (match_event_id, profile_id)
  VALUES (NEW.id, NEW.host_profile_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_match_events_add_host
  AFTER INSERT ON public.match_events
  FOR EACH ROW EXECUTE FUNCTION public.add_host_as_participant();

-- Auto-flip to 'full' when spots reach 4
CREATE OR REPLACE FUNCTION public.check_match_event_full()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_extra INT;
BEGIN
  SELECT COUNT(*), MAX(me.extra_confirmed) INTO v_count, v_extra
  FROM public.match_event_participants p
  JOIN public.match_events me ON me.id = p.match_event_id
  WHERE p.match_event_id = NEW.match_event_id;

  IF (v_count + COALESCE(v_extra, 0)) >= 4 THEN
    UPDATE public.match_events SET status = 'full' WHERE id = NEW.match_event_id AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mep_check_full
  AFTER INSERT ON public.match_event_participants
  FOR EACH ROW EXECUTE FUNCTION public.check_match_event_full();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_event_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_event_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_events;