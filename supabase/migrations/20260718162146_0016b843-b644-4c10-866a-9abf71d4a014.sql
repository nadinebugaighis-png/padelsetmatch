
-- 1) Fix short_links: drop anon "read all" policy; add RPC that resolves one code
DROP POLICY IF EXISTS "Public can read active links" ON public.short_links;

CREATE OR REPLACE FUNCTION public.resolve_short_link(_code text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target_url
  FROM public.short_links
  WHERE code = _code
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_short_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_short_link(text) TO anon, authenticated, service_role;

-- 2) Fix mutable search_path on email queue helpers
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

-- 3) Revoke EXECUTE from anon/authenticated on trigger-only functions
--    (These are attached to triggers and never called via PostgREST.)
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'notify_new_match()',
    'notify_new_message()',
    'notify_new_connect_comment()',
    'notify_participant_joined()',
    'notify_participant_left()',
    'notify_favorite_match_created()',
    'notify_favorite_match_joined()',
    'notify_coach_endorsement_request()',
    'notify_match_cancelled()',
    'handle_new_like()',
    'handle_no_show()',
    'handle_played_confirmation()',
    'enforce_single_intro_message()',
    'assign_founding_number()',
    'check_match_event_full()',
    'bump_match_activity()',
    'add_host_as_participant()',
    'trg_alert_on_match_insert()',
    'trg_alert_on_participant_leave()',
    'set_updated_at()',
    'set_endorsement_approved_at()',
    'email_queue_dispatch()',
    'email_queue_wake()',
    'fanout_match_alerts(uuid, text)'
  ]
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- 4) Email queue helpers are called by the queue processor with service_role.
--    Revoke from anon/authenticated so end users cannot dequeue/enqueue emails.
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;

-- 5) Revoke anon EXECUTE on private SECURITY DEFINER RPCs.
--    Keep anon on: guest_*, list_public_upcoming_matches, public_match_view,
--    get_signup_ordinal (called from public auth page), resolve_short_link,
--    has_role (used by RLS as any role).
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'accept_intro(uuid, uuid)',
    'admin_clear_profile_photo(uuid)',
    'admin_dashboard_stats()',
    'admin_resolve_report(uuid, text)',
    'admin_set_suspended(uuid, boolean)',
    'claim_push_outbox(integer)',
    'cleanup_relationship_with(uuid)',
    'clear_my_compat_scores()',
    'coach_stats(uuid)',
    'delete_expired_push_subs(text[])',
    'delete_match_thread(uuid)',
    'delete_my_account_data()',
    'get_pair_qa(uuid)',
    'get_player_count()',
    'get_profiles_minimal(uuid[])',
    'handle_no_show()',
    'handle_report(uuid, text, text)',
    'ignore_intro(uuid, uuid)',
    'is_current_user_admin()',
    'list_my_favorite_ids()',
    'open_coach_chat(uuid, uuid)',
    'open_intro_chat(uuid, text, uuid)',
    'qa_affinity_scores(uuid, uuid[])',
    'respond_to_intro(uuid, uuid, boolean)',
    'send_intro_message(uuid, text)',
    'shared_venues(uuid, uuid)',
    'transfer_match_host(uuid, uuid)',
    'upsert_compat_score(uuid, integer, text, jsonb, text, jsonb, text)',
    'venue_overlap_for_me(uuid[])',
    'my_profile_id()'
  ]
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXCEPTION WHEN undefined_function THEN
      -- Skip if signature doesn't exist
      NULL;
    END;
  END LOOP;
END $$;
