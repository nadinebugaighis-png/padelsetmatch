
-- Notifications infrastructure

-- 1. push_subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX push_subscriptions_profile_idx ON public.push_subscriptions(profile_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs select" ON public.push_subscriptions FOR SELECT TO authenticated
  USING (profile_id = public.my_profile_id());
CREATE POLICY "own subs insert" ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.my_profile_id());
CREATE POLICY "own subs delete" ON public.push_subscriptions FOR DELETE TO authenticated
  USING (profile_id = public.my_profile_id());

-- 2. notification_prefs
CREATE TABLE public.notification_prefs (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  messages BOOLEAN NOT NULL DEFAULT true,
  matches BOOLEAN NOT NULL DEFAULT true,
  connect_activity BOOLEAN NOT NULL DEFAULT true,
  coach_requests BOOLEAN NOT NULL DEFAULT true,
  match_participants BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO authenticated;
GRANT ALL ON public.notification_prefs TO service_role;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs" ON public.notification_prefs FOR ALL TO authenticated
  USING (profile_id = public.my_profile_id())
  WITH CHECK (profile_id = public.my_profile_id());

-- 3. notifications inbox
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_profile_created_idx ON public.notifications(profile_id, created_at DESC);
CREATE INDEX notifications_profile_unread_idx ON public.notifications(profile_id) WHERE read_at IS NULL;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifs select" ON public.notifications FOR SELECT TO authenticated
  USING (profile_id = public.my_profile_id());
CREATE POLICY "own notifs update" ON public.notifications FOR UPDATE TO authenticated
  USING (profile_id = public.my_profile_id())
  WITH CHECK (profile_id = public.my_profile_id());
CREATE POLICY "own notifs delete" ON public.notifications FOR DELETE TO authenticated
  USING (profile_id = public.my_profile_id());

-- Realtime for live in-app updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 4. push_outbox — server drains this and sends web pushes
CREATE TABLE public.push_outbox (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
CREATE INDEX push_outbox_pending_idx ON public.push_outbox(created_at) WHERE sent_at IS NULL;
GRANT ALL ON public.push_outbox TO service_role;
GRANT USAGE ON SEQUENCE public.push_outbox_id_seq TO service_role;
ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;
-- no policies: service_role only

-- 5. helper to enqueue a notification (writes to notifications + push_outbox after checking prefs)
CREATE OR REPLACE FUNCTION public.enqueue_notification(
  _profile_id UUID,
  _type TEXT,
  _pref_column TEXT,
  _title TEXT,
  _body TEXT,
  _url TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  -- ensure a prefs row exists
  INSERT INTO public.notification_prefs (profile_id) VALUES (_profile_id)
    ON CONFLICT (profile_id) DO NOTHING;

  -- always insert in-app notification
  INSERT INTO public.notifications (profile_id, type, title, body, url)
  VALUES (_profile_id, _type, _title, _body, _url);

  -- check the specific pref for push
  EXECUTE format('SELECT %I FROM public.notification_prefs WHERE profile_id = $1', _pref_column)
    INTO v_enabled USING _profile_id;

  IF COALESCE(v_enabled, true) THEN
    INSERT INTO public.push_outbox (profile_id, title, body, url, type)
    VALUES (_profile_id, _title, _body, _url, _type);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon, authenticated;

-- 6. Triggers on source tables

-- 6a. New message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_a UUID; v_b UUID; v_recipient UUID; v_sender_name TEXT; v_preview TEXT;
BEGIN
  SELECT profile_a, profile_b INTO v_a, v_b FROM public.matches WHERE id = NEW.match_id;
  IF NEW.sender_profile_id = v_a THEN v_recipient := v_b; ELSE v_recipient := v_a; END IF;
  SELECT first_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_profile_id;
  v_preview := CASE WHEN char_length(NEW.body) > 80 THEN substring(NEW.body, 1, 77) || '…' ELSE NEW.body END;
  PERFORM public.enqueue_notification(
    v_recipient,
    'message',
    'messages',
    COALESCE(v_sender_name, 'Someone') || ' sent you a message',
    v_preview,
    '/app/matches/' || NEW.match_id::text
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- 6b. New match
CREATE OR REPLACE FUNCTION public.notify_new_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name_a TEXT; v_name_b TEXT;
BEGIN
  SELECT first_name INTO v_name_a FROM public.profiles WHERE id = NEW.profile_a;
  SELECT first_name INTO v_name_b FROM public.profiles WHERE id = NEW.profile_b;
  PERFORM public.enqueue_notification(
    NEW.profile_a, 'match', 'matches',
    'It''s a match with ' || COALESCE(v_name_b, 'a new player') || '!',
    'Say hi and set up a game.',
    '/app/matches/' || NEW.id::text
  );
  PERFORM public.enqueue_notification(
    NEW.profile_b, 'match', 'matches',
    'It''s a match with ' || COALESCE(v_name_a, 'a new player') || '!',
    'Say hi and set up a game.',
    '/app/matches/' || NEW.id::text
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_match
  AFTER INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_match();

-- 6c. New connect comment
CREATE OR REPLACE FUNCTION public.notify_new_connect_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author UUID; v_commenter_name TEXT; v_preview TEXT;
BEGIN
  SELECT author_profile_id INTO v_post_author FROM public.connect_posts WHERE id = NEW.post_id;
  SELECT first_name INTO v_commenter_name FROM public.profiles WHERE id = NEW.author_profile_id;
  v_preview := CASE WHEN char_length(NEW.body) > 80 THEN substring(NEW.body, 1, 77) || '…' ELSE NEW.body END;
  IF v_post_author IS NOT NULL AND v_post_author <> NEW.author_profile_id THEN
    PERFORM public.enqueue_notification(
      v_post_author, 'connect_comment', 'connect_activity',
      COALESCE(v_commenter_name, 'Someone') || ' commented on your post',
      v_preview,
      '/app/connect?post=' || NEW.post_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_connect_comment
  AFTER INSERT ON public.connect_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_connect_comment();

-- 6d. Coach endorsement request
CREATE OR REPLACE FUNCTION public.notify_coach_endorsement_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT first_name INTO v_student_name FROM public.profiles WHERE id = NEW.student_profile_id;
    PERFORM public.enqueue_notification(
      NEW.coach_profile_id, 'coach_request', 'coach_requests',
      COALESCE(v_student_name, 'A player') || ' asked to endorse you',
      'Approve to let them leave a review.',
      '/app/profile'
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_coach_endorsement_request
  AFTER INSERT ON public.coach_endorsements
  FOR EACH ROW EXECUTE FUNCTION public.notify_coach_endorsement_request();

-- 6e. Match event participant joined
CREATE OR REPLACE FUNCTION public.notify_participant_joined()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_new_name TEXT; v_event RECORD;
BEGIN
  SELECT first_name INTO v_new_name FROM public.profiles WHERE id = NEW.profile_id;
  SELECT id, club_name, starts_at, host_profile_id INTO v_event FROM public.match_events WHERE id = NEW.match_event_id;
  FOR r IN
    SELECT profile_id FROM public.match_event_participants
    WHERE match_event_id = NEW.match_event_id AND profile_id <> NEW.profile_id
  LOOP
    PERFORM public.enqueue_notification(
      r.profile_id, 'match_join', 'match_participants',
      COALESCE(v_new_name, 'A player') || ' joined your match',
      COALESCE(v_event.club_name, 'Match') || ' — ' || to_char(v_event.starts_at, 'Dy DD Mon, HH24:MI'),
      '/app/events/' || NEW.match_event_id::text
    );
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_participant_joined
  AFTER INSERT ON public.match_event_participants
  FOR EACH ROW EXECUTE FUNCTION public.notify_participant_joined();

-- 6f. Match event participant left
CREATE OR REPLACE FUNCTION public.notify_participant_left()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_left_name TEXT; v_event RECORD;
BEGIN
  SELECT first_name INTO v_left_name FROM public.profiles WHERE id = OLD.profile_id;
  SELECT id, club_name, starts_at INTO v_event FROM public.match_events WHERE id = OLD.match_event_id;
  FOR r IN
    SELECT profile_id FROM public.match_event_participants
    WHERE match_event_id = OLD.match_event_id AND profile_id <> OLD.profile_id
  LOOP
    PERFORM public.enqueue_notification(
      r.profile_id, 'match_leave', 'match_participants',
      COALESCE(v_left_name, 'A player') || ' left the match',
      COALESCE(v_event.club_name, 'Match') || ' — ' || to_char(v_event.starts_at, 'Dy DD Mon, HH24:MI'),
      '/app/events/' || OLD.match_event_id::text
    );
  END LOOP;
  RETURN OLD;
END;
$$;
CREATE TRIGGER trg_notify_participant_left
  AFTER DELETE ON public.match_event_participants
  FOR EACH ROW EXECUTE FUNCTION public.notify_participant_left();
