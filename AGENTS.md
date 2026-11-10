<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep `resources/icon.png` and the iOS AppIcon asset identical opaque, full-bleed 1024px squares; iOS applies the corner mask, and generator padding must not reintroduce an outer frame.
- Native iOS push and web push share push_outbox; service-role-only claim_pending_push_delivery leases rows and the server delivery helper acknowledges completed sends. Server-function completion schedules request-deduplicated draining through the hosting runtime's request.waitUntil, never awaiting delivery before responding, so recipients need not keep the app open and app actions are not delayed.
- iOS restores and mirrors only the production-origin auth storage key through Keychain in PersistentBridgeViewController before page scripts start; generated auth clients remain untouched and explicit sign-out clears the native copy.
- Native launches at the public home resume saved sessions through /app after hydration; hide the welcome page before native first paint and keep sign-in controls hidden until session resolution, while retaining the web landing and existing access gate.
- Bound native entry waits and show a retry screen on stalls without clearing credentials; stalled session reads must not trigger late navigation after timeout.
- Keep the public deletion page accessible without signing in; link to existing authenticated deletion controls and privacy-request channels rather than duplicating destructive logic, so store visitors can find deletion steps safely.
- Acknowledge notifications through the existing owner-scoped mark-read action only after their rows are visible; retain a list-open snapshot so reading does not remove the link before it can be tapped, and never auto-answer pending match invitations.
- Derive match-card colour cycles from the viewer-local calendar date using UTC-normalized date components, not time of day or list position, and rotate the palette within a day by each match's start-time order (computed from the unfiltered feed), so filtering, reordering and daylight-saving changes do not alter a card's colour; define palette values in global semantic tokens.
- Keep Matches page controls compact with scoped light-theme tokens and date-selection logic separate from the feed; this preserves existing match actions and avoids treating all dates as individually highlighted choices.
- Keep club suggestion caching instance-scoped, bounded and browser-safe; reuse fetched clubs while waiting for authenticated search and reject stale responses so typing stays quick without sharing search history across users.
- Use a shared Shadcn calendar and separate hour/minute selectors for match scheduling, with scoped light tokens; this avoids platform-dependent datetime fields while preserving local-time submission and edit values.
- Keep raw compatibility answers owner-only; authorized server scoring may read a verified pair but returns only derived results, never answer rows.
- Save quick answers atomically and store the answered question slot on the profile so dismissal follows the account across devices; question timing rules live in src/lib/daily-questions.ts and compatibility questions come only from its curated bank, never live AI generation, so they appear instantly. Never reword an existing bank question's English text, because saved answers are matched by it.
- Signup/profile editing is a single page; values and personality are gathered only through the grid questions, while previously saved priorities/traits are hydrated and re-sent unchanged so older scoring data is not wiped.
- Restrict shared redirects at both insertion and resolution to exact app hosts and match paths; hosting-domain wildcards are not trusted destinations.
- Withdraw photo access before cleanup and delete replaced/removed owned objects; the resize endpoint may re-sign only current eligible photos, never withdrawn ones.
- Grid and player-preview photos use PlayerPhoto with two bounded cache-bypassing proxy retries and an initial fallback; never bypass withdrawal checks by retrying the original storage URL.
- Report account deletion as complete only after owned-file, profile and identity deletion all succeed; preserve a retry control without a profile.
- Match ages as bracket spans via src/lib/age-bracket.ts, never raw numbers: signup stores only the bracket midpoint (56+ → 78), so exact-age comparisons hide every 56+ player from ranges ending below 78; onboarding persists age_bracket_lo/hi and legacy rows fall back to exact age.
- Shared match links use exact-host Universal Links/App Links for /s, /m, /g and /app/events only; native warm opens resolve short links as JSON and never follow arbitrary redirects, while the Android association stays empty until the Play app-signing SHA-256 is configured.
- Match gender labels, join eligibility and share/preview wording live in src/lib/match-rules.ts; only men_only/women_only restrict joining, and "free" wording appears only when the host set the match's free_court flag, so no page promises a free game the host didn't mark.
- Share the app via the /download smart link (src/lib/store-link.ts): it serves a branded 1200×630 preview to link bots and redirects phones client-side to their store, because raw store URLs produce unbranded WhatsApp previews.
- Court booking deep-links out (Playtomic has no public booking API); link choice and the curated club list live in src/lib/club-booking.ts, and private, free or undecided-club matches never show a booking link. Outgoing Playtomic links carry PadelSetMatch UTM tags and each tap emits project.book_court_clicked with a curated club key (never free text), so referrals can be reported per club.
- App sharing goes through nativeShare (src/lib/native.ts), which falls through native sheet → Web Share → clipboard and only stops on a user cancel; successful shares are recorded per player via the record_app_share RPC (app_shares table, admin-only admin_top_sharers), so share buttons never fail silently and sharers can be rewarded.
- Match chat messages notify every other registered participant via a database trigger on match_event_messages (respecting the "messages" push preference), at most once per player per match every 10 minutes while unread, and never for cancelled matches, so busy group chats do not spam phones.
