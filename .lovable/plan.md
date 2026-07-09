# Make PadelMatch feel like a real app (PWA + Push)

## Goal

Fix the two things users complain about:
1. **They get signed out** → make sessions persistent and push everyone toward "Add to Home Screen" (which is what actually fixes iOS session loss).
2. **No notifications** → add real push notifications for messages, matches, Connect activity, coach requests, and match join/leave.

Works on Android and desktop today. Works on iPhone the moment the user installs the app to their home screen (iOS 16.4+).

## What changes for the user

- **First-visit banner** after sign-in: "Install the app to stay signed in and get notifications" with a big Install button (uses the existing InstallModal).
- **Sign-in stays put** for months once installed. On regular Safari, we extend it as far as the browser allows.
- **Notification bell** in the app header shows an unread count.
- **New Settings → Notifications** panel where users pick what they want to be pinged about (defaults: all on).
- **Push notifications** fire for:
  - New message in a match
  - Mutual like / new match
  - Comment on your Connect post, or reply to your comment
  - Coach endorsement request received (for coaches)
  - Someone joined or left a match you're in
- Tapping a notification opens the app directly on the relevant screen (chat, post, match, coach panel).

## What we're NOT doing this turn

- Native iOS/Android apps for the App Store / Play Store. That's the Capacitor track — a separate 1–2 week effort that needs an Apple Developer account ($99/yr), Google Play account ($25 + 12-tester requirement), and a Mac to build. I'll queue that as a follow-up once this ships.

---

## Technical section

### 1. Database (one migration)

**New table `push_subscriptions`**
- `id`, `profile_id` (FK profiles), `endpoint` (unique), `p256dh`, `auth`, `user_agent`, `created_at`, `last_used_at`.
- RLS: user can insert/select/delete only their own rows. Service role full access.
- GRANT SELECT, INSERT, UPDATE, DELETE to authenticated; ALL to service_role.

**New table `notification_prefs`** (one row per profile)
- Booleans: `messages`, `matches`, `connect_activity`, `coach_requests`, `match_participants`. All default true.
- RLS: user manages their own row.

**New table `notifications`** (in-app inbox mirror of what we push)
- `id`, `profile_id`, `type`, `title`, `body`, `url`, `read_at`, `created_at`.
- RLS: user reads/updates own; service_role inserts.
- Enable Realtime so the bell updates live.

**Triggers** on existing tables to enqueue notifications:
- `matches` insert → notify both users ("It's a match!").
- `messages` insert → notify the other participant.
- `connect_comments` insert → notify post author + parent comment author.
- `coach_endorsements` insert (status pending) → notify the coach.
- `match_event_participants` insert/delete → notify all other participants.

Triggers write into `notifications` and call a Postgres helper that inserts a row into `push_outbox` (a small queue). A cron-free approach: a Postgres `LISTEN/NOTIFY` isn't reachable from Workers, so instead the Realtime subscription on `notifications` lets the CLIENT show in-app toasts immediately, AND a scheduled server function drains `push_outbox` every ~30s via the stable public cron URL.

Simpler alternative I'll actually use: the trigger writes to `notifications` and calls a server-side edge webhook via `pg_net` (supabase extension). If `pg_net` isn't available I'll fall back to draining `push_outbox` inside each server function that creates the source row (messages, comments, likes, join/leave) so pushes go out immediately without any cron.

### 2. Web Push infrastructure

- Generate VAPID key pair once (P-256), store `VAPID_PUBLIC_KEY` in `.env` (client-visible) and `VAPID_PRIVATE_KEY` via `generate_secret` (server-only). `VAPID_SUBJECT` set to `mailto:` from user.
- `public/sw.js` — minimal service worker: handles `push` and `notificationclick`. Registered ONLY in production (skipped in Lovable preview, per PWA skill).
- `src/lib/push-client.ts` — subscribe/unsubscribe helpers; called after login and from Settings.
- `src/lib/push.server.ts` — Web Push sender built on Web Crypto (Cloudflare Workers compatible, no `web-push` npm package which is Node-only). Signs VAPID JWT, encrypts payload (aes128gcm), POSTs to the subscription endpoint.
- `src/lib/notifications.functions.ts` — `subscribePush`, `unsubscribePush`, `listNotifications`, `markRead`, `getPrefs`, `updatePrefs`.

### 3. UI

- `src/components/InstallAndNotifyBanner.tsx` — shown once after first sign-in until dismissed or installed. Explains that installing = stays signed in + notifications.
- `src/components/NotificationBell.tsx` — header bell with unread badge, dropdown list, "See all".
- `src/routes/app.notifications.tsx` — full list + preferences panel.
- Ask for notification permission at the right moment: only after user taps "Enable notifications" in the banner or Settings — never on page load.

### 4. Session persistence hardening

- Audit `src/integrations/supabase/client.ts` config (already `persistSession: true` — verify).
- Add `onAuthStateChange` refresh handler already in `__root.tsx` — confirm token refresh is happening.
- Add a small "keepalive" ping every 5 min while app is open so token refresh happens even on flaky connections.

### 5. Files touched

**New**
- `public/sw.js`
- `src/lib/push-client.ts`, `src/lib/push.server.ts`, `src/lib/notifications.functions.ts`
- `src/components/InstallAndNotifyBanner.tsx`, `src/components/NotificationBell.tsx`
- `src/routes/app.notifications.tsx`

**Edited**
- `src/routes/__root.tsx` (register SW in prod only, mount banner)
- `src/routes/app.tsx` (add bell to header)
- `src/lib/connect.functions.ts`, `src/lib/coach.functions.ts`, `src/lib/match-events.functions.ts`, `src/lib/app.functions.ts` (drain push outbox on write paths)
- `.env` (add `VITE_VAPID_PUBLIC_KEY`)
- One SQL migration

### 6. Reality checks (honesty)

- **iOS Safari without install**: push does NOT work. Nothing we can do web-side. The install banner is the fix.
- **iOS installed to Home Screen**: push works but is less reliable than native — Apple sometimes throttles. Fine for MVP.
- **Android Chrome**: push works whether installed or not.
- **Desktop**: push works in Chrome/Edge/Firefox, not Safari macOS unless installed.

### 7. Cost / limits

- Web Push itself is free (browser vendor infrastructure).
- Our extra Cloud usage: tiny — a few DB rows and one outbound HTTPS request per notification.

---

Approve this and I'll ship it in the next turn, then hand back a short "how to test on your phone" checklist.
