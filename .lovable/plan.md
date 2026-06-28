
# PadelMatch Madrid — full rebuild

Pivoting the demo into a real, account-based app. Tinder-style **grid (no swiping)**: tap photos you like, and if they tap yours back, a chat room opens.

## Flow

1. **Sign up / sign in** (email + password, via Lovable Cloud).
2. **Onboarding questionnaire**: first name, age, gender, who you're interested in, age range, nationality, Madrid zone, padel level, ranked priorities (intellectual, looks, funny, adventurous…), looking-for (partner / friend / both), short bio.
3. **Upload a padel photo** (you holding a racket / on court). Required. Stored in Lovable Cloud Storage.
4. **Discover** tab — grid of matching players' photos with first name + age + zone overlay. Tap a card to "like". Filter chip: partner / friend.
5. **Matches** tab — when two people have liked each other, a chat room appears here.
6. **Chat** — real-time messages + a "Book a court on Playtomic" button that opens Playtomic for the user's zone.
7. **Profile** tab — edit your info, replace photo, sign out.

## Matching logic (server function)

Hybrid score reused from the current code, gated by:
- Mutual gender interest
- Mutual age range
- "Looking for" overlap (partner ↔ partner, friend matches anyone open to friends)

Plus weighted bonuses for padel level proximity, Madrid zone proximity, nationality / cultural affinity, ranked priority overlap. AI Gateway (Gemini 3 Flash) generates a one-line "why you'd click on court" blurb shown when you tap a card.

## Seed players (Madrid)

12 seeded profiles with **AI-generated padel action photos** (premium image gen, photoreal, varied: men/women, different ages, different Madrid courts, racket in hand). First names only. They auto-"like back" anyone who likes them after a short delay, so the chat flow is demoable from a fresh account.

## Data model (Lovable Cloud)

- `profiles` (1-1 with auth.users): first_name, age, gender, interested_in[], age_min, age_max, nationality, zone, level, priorities[], looking_for, bio, photo_url
- `likes`: liker_id, liked_id, created_at (unique pair)
- `matches`: user_a, user_b, created_at — created by trigger when a like is reciprocated
- `messages`: match_id, sender_id, body, created_at — realtime subscription

RLS: users read their own profile + profiles of users in their match pool; can only insert their own likes; can only read/write messages in matches they're part of. Storage bucket `padel-photos` public-read, write only by authenticated owner.

## Design

Keep the existing **Court at Dusk** theme (teal + Madrid clay + neon ball-yellow, Bebas Neue headlines, Barlow body). Add a clean card-grid for Discover and a stripped-down chat surface using AI Elements primitives.

## Technical notes

- TanStack Start + Lovable Cloud (Supabase under the hood).
- `_authenticated` route group for app shell; `/auth` for sign-in/up.
- Server functions for matching score + AI blurb; client-side Supabase realtime for messages.
- Image gen done as a one-time seed script via the AI gateway skill (12 photos saved into `src/assets/seed/`).
- Playtomic link = `https://playtomic.io/clubs?q=Madrid+<zone>`.

## What I'll cut from the current build

The anonymous handles + emoji avatars + "reveal on match" flow is fully replaced by real first names and real photos, per your direction.

Approve and I'll enable Lovable Cloud, generate the seed photos, build the schema, and ship the full flow.
