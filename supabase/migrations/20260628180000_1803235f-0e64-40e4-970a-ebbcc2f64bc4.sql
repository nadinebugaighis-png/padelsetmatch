
-- Profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS availability text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS court_side text,
  ADD COLUMN IF NOT EXISTS mixed_doubles boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS played_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_show_count integer NOT NULL DEFAULT 0;

-- Matches: track last activity for expiry
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone NOT NULL DEFAULT now();

-- Played-together confirmations (both must confirm)
CREATE TABLE IF NOT EXISTS public.played_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (match_id, profile_id)
);
GRANT SELECT, INSERT, DELETE ON public.played_confirmations TO authenticated;
GRANT ALL ON public.played_confirmations TO service_role;
ALTER TABLE public.played_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read confirmations"
  ON public.played_confirmations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id
      AND (m.profile_a = public.my_profile_id() OR m.profile_b = public.my_profile_id())
  ));

CREATE POLICY "Members can confirm own side"
  ON public.played_confirmations FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = public.my_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND (m.profile_a = public.my_profile_id() OR m.profile_b = public.my_profile_id())
    )
  );

-- No-show reports
CREATE TABLE IF NOT EXISTS public.no_shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  reporter_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (match_id, reporter_profile_id)
);
GRANT SELECT, INSERT ON public.no_shows TO authenticated;
GRANT ALL ON public.no_shows TO service_role;
ALTER TABLE public.no_shows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporter can insert no-show"
  ON public.no_shows FOR INSERT TO authenticated
  WITH CHECK (reporter_profile_id = public.my_profile_id());

CREATE POLICY "Members can see no-shows on their matches"
  ON public.no_shows FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id
      AND (m.profile_a = public.my_profile_id() OR m.profile_b = public.my_profile_id())
  ));

-- Auto-suspend after 3 no-shows
CREATE OR REPLACE FUNCTION public.handle_no_show()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
     SET no_show_count = no_show_count + 1,
         suspended_at = CASE WHEN no_show_count + 1 >= 3 THEN now() ELSE suspended_at END
   WHERE id = NEW.reported_profile_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_handle_no_show ON public.no_shows;
CREATE TRIGGER trg_handle_no_show AFTER INSERT ON public.no_shows
  FOR EACH ROW EXECUTE FUNCTION public.handle_no_show();

-- Played count bump when both confirm
CREATE OR REPLACE FUNCTION public.handle_played_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int;
  v_a uuid; v_b uuid;
BEGIN
  SELECT profile_a, profile_b INTO v_a, v_b FROM public.matches WHERE id = NEW.match_id;
  SELECT count(*) INTO v_count FROM public.played_confirmations WHERE match_id = NEW.match_id;
  IF v_count >= 2 THEN
    UPDATE public.profiles SET played_count = played_count + 1 WHERE id IN (v_a, v_b);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_handle_played ON public.played_confirmations;
CREATE TRIGGER trg_handle_played AFTER INSERT ON public.played_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.handle_played_confirmation();

-- Bump match.last_message_at when a message is sent
CREATE OR REPLACE FUNCTION public.bump_match_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.matches SET last_message_at = now() WHERE id = NEW.match_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_bump_match ON public.messages;
CREATE TRIGGER trg_bump_match AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_match_activity();
