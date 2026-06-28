
-- Profiles: anyone authenticated has one row; seed players are rows with is_seed=true and user_id=null
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_seed BOOLEAN NOT NULL DEFAULT false,
  first_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 99),
  gender TEXT NOT NULL CHECK (gender IN ('woman','man','non-binary')),
  interested_in TEXT[] NOT NULL DEFAULT '{}',
  age_min INTEGER NOT NULL DEFAULT 18,
  age_max INTEGER NOT NULL DEFAULT 99,
  nationality TEXT NOT NULL,
  zone TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('just starting','casual','intermediate','advanced','competitive')),
  priorities TEXT[] NOT NULL DEFAULT '{}',
  looking_for TEXT NOT NULL DEFAULT 'both' CHECK (looking_for IN ('partner','friend','both')),
  bio TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Helper: current user's profile id
CREATE OR REPLACE FUNCTION public.my_profile_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Likes
CREATE TABLE public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  liker_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  liked_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (liker_profile_id, liked_profile_id),
  CHECK (liker_profile_id <> liked_profile_id)
);
GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own likes" ON public.likes FOR INSERT TO authenticated
  WITH CHECK (liker_profile_id = public.my_profile_id());
CREATE POLICY "Users see their likes" ON public.likes FOR SELECT TO authenticated
  USING (liker_profile_id = public.my_profile_id() OR liked_profile_id = public.my_profile_id());
CREATE POLICY "Users delete own likes" ON public.likes FOR DELETE TO authenticated
  USING (liker_profile_id = public.my_profile_id());

-- Matches: stored with profile_a < profile_b (uuid order) to keep pair unique
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_a, profile_b),
  CHECK (profile_a < profile_b)
);
GRANT SELECT ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their matches" ON public.matches FOR SELECT TO authenticated
  USING (profile_a = public.my_profile_id() OR profile_b = public.my_profile_id());

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_match ON public.messages(match_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read messages of their matches" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.profile_a = public.my_profile_id() OR m.profile_b = public.my_profile_id())));
CREATE POLICY "Users send messages in their matches" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_profile_id = public.my_profile_id()
    AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.profile_a = public.my_profile_id() OR m.profile_b = public.my_profile_id())));

-- Trigger: on like, if reciprocal exists -> create match; if liked is seed -> auto-like back.
CREATE OR REPLACE FUNCTION public.handle_new_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_seed BOOLEAN;
  v_a UUID;
  v_b UUID;
BEGIN
  -- Auto-like back from seed profiles
  SELECT is_seed INTO v_is_seed FROM public.profiles WHERE id = NEW.liked_profile_id;
  IF v_is_seed THEN
    INSERT INTO public.likes(liker_profile_id, liked_profile_id)
    VALUES (NEW.liked_profile_id, NEW.liker_profile_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Check reciprocal -> create match
  IF EXISTS (SELECT 1 FROM public.likes WHERE liker_profile_id = NEW.liked_profile_id AND liked_profile_id = NEW.liker_profile_id) THEN
    IF NEW.liker_profile_id < NEW.liked_profile_id THEN
      v_a := NEW.liker_profile_id; v_b := NEW.liked_profile_id;
    ELSE
      v_a := NEW.liked_profile_id; v_b := NEW.liker_profile_id;
    END IF;
    INSERT INTO public.matches(profile_a, profile_b) VALUES (v_a, v_b)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_handle_new_like AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_like();

-- Updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime for messages and matches
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
