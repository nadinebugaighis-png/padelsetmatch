# Player cards: story-hook design + one free intro DM

Based on your picks: story-cards with a hook line, whole card taps to open profile with a big 👍 button always visible, and anyone can send **one** intro message before mutual match.

---

## 1. Card redesign — "story with a hook"

**Layout** (`src/routes/app.grid.tsx`)
- Larger photo (roughly 1.15× current) with a soft bottom gradient so text sits on the image.
- Name · Age on the gradient.
- **One AI-generated hook line** underneath — a short, warm one-liner like _"Loves 8 pm games in La Moraleja — always up for a 3rd set."_ (EN/ES/FR).
- Small row of 2–3 mini-chips (level, distance/venue in common, availability window) — icons only where possible, per your "less writing" rule.
- **Big 👍 pill button** pinned bottom-right, thumb-reachable, with haptic-style micro-animation on tap.
- Whole card = open profile (except the 👍 button itself, which fires the like inline).
- Subtle "you've tapped 👍" state: button flips to filled + says _"Waiting"_ until they tap back.
- "Intro" pill appears on cards where sender can still use their free DM.

**Micro-interactions**
- Card lift on hover / press.
- 👍 button bursts with a small ring pulse on tap.
- If they've tapped you first (secret like), a soft plum glow border hints _"they liked you"_ — without revealing who tapped first (already the current rule).

## 2. Story-hook generation

New profile column `story_hook_en` / `_es` / `_fr` (nullable text).

- Generated **server-side** via Lovable AI Gateway (`google/gemini-2.5-flash`) using existing profile fields: level, city, availability, favorite venues, preferred game style, coach flag.
- Trigger: on profile save (onboarding finish + edits) via a `regenerateStoryHook` server fn — fire-and-forget.
- Backfill: one-time server fn that generates hooks for all existing profiles without one.
- Fallback if AI fails: deterministic template ("Level 3.5 · Nights in Madrid").
- Cached in DB, no per-view AI cost.

## 3. One free intro DM

**Rule**: Anyone can send **exactly one** message to a player they haven't mutually matched with. Once sent, sender is blocked from sending more **until** the recipient replies. Recipient's reply auto-creates the match.

**DB migration**
- Add `is_intro boolean` to `messages`.
- Update RLS INSERT policy on `messages`:
  - Allow if mutual match exists (current behavior), OR
  - Allow if `is_intro = true` AND sender has zero prior messages to this recipient AND no active block.
- Trigger `on_intro_reply`: when recipient sends any message back to an intro sender, auto-insert into `matches` so full chat opens both ways.
- `open_intro_thread(target_profile_id)` RPC — creates/returns the thread id, prevents second intro.

**UI**
- 👍 button on the card gets a small "💬" satellite when sender still has their intro available.
- Tapping 💬 opens a lightweight intro composer sheet: 140-char limit, placeholder _"Say hi — this is your one intro."_
- After sending: satellite disappears; a "Intro sent · awaiting reply" badge shows on that card until they reply.
- Recipient side (Messages tab): intro threads appear with an "Intro" chip; a big **Reply** / **Ignore** pair. Reply = full chat unlocks. Ignore = thread archives silently, sender never notified.
- Report/block one-tap in the intro sheet, in case of abuse.

**Anti-spam guardrails**
- Rate limit: max 5 intro DMs per sender per 24h (enforced in the RPC).
- Blocked users can never intro.
- Hidden profiles can't be introed.
- Toast on hitting the limit: _"Take a breath — 5 intros a day 👋"_.

## 4. Translations

All new strings in `src/lib/i18n.tsx` for EN / ES (castellano) / FR.

## 5. Order I'll build in

1. DB migration (messages RLS + is_intro + auto-match trigger + rate limit + story_hook columns).
2. Server fns: `sendIntroMessage`, `regenerateStoryHook`, `backfillStoryHooks`.
3. Card redesign in `app.grid.tsx` with hook, big 👍, 💬 intro satellite, states.
4. Intro composer sheet + messages-tab "Intro" chip + Reply/Ignore.
5. Wire hook regeneration into onboarding save + profile edit.
6. Run backfill once.

## Technical details

- New Lovable AI call is cheap (short prompt, ~50 tokens out) and cached in DB per profile, per language.
- RLS INSERT policy will use a helper SQL fn `can_send_intro(sender, recipient)` (SECURITY DEFINER) to avoid recursive policy checks on `messages`.
- Auto-match trigger runs on `messages` INSERT; only fires when the reply is to an existing intro and no match row exists yet.
- No changes to the existing mutual-match flow — coexists.
- All frontend work stays in `src/routes/app.grid.tsx`, `src/routes/app.matches.tsx`, a new `IntroSheet.tsx`, and i18n.

Approve and I'll build it.
