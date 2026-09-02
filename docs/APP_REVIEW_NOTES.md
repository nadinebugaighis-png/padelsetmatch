# App Review reply — Build 14

Paste the block below into **App Store Connect → App Review Information → Notes**,
then also send it via **Reply to App Review**. Attach/record the screen recording first.

---

## What's new in Build 14 (addresses the Sep 2, 2026 review)
- **Sign in with Apple (Guideline 2.1a):** the third-party Capacitor plugin was incompatible with our
  Capacitor version and was silently dropped from the build, so the button did nothing. We replaced it
  with a native ASAuthorizationController implementation inside the app, added the Sign in with Apple
  entitlement, and set an explicit iPad presentation anchor. Verified on iPad.
- **EULA (Guideline 1.2):** the sign-in / registration screen now shows a required checkbox:
  "I agree to the Terms of Use (EULA) and Privacy Policy, and I understand there is zero tolerance for
  objectionable content or abusive users." Registration and sign-in are blocked until it is ticked.
  The Terms page has a dedicated zero-tolerance section covering objectionable content and abusive users.
- **Account deletion (Guideline 5.1.1v):** in-app deletion already existed and is now a clearly labelled
  full-width "Delete my account" button at the bottom of **Me → Settings**, with a confirmation step.
  It permanently deletes the profile, content and the authentication account — no email or phone call needed.
- Report (flag icon) on every profile, post, comment and message; Block from any profile.

## 1. Screen recording (you must record this on a physical iPhone)
Record one continuous video (2–4 min), starting from tapping the app icon:

1. Launch app → landing screen.
2. **Register**: create a new account with email + password (show the confirmation step).
3. Complete onboarding: name, photo, city/club, level, availability.
4. Home grid: browse players, open a player profile, close it.
5. **Play**: open a match, tap "Join", open the match chat, send a message.
6. **UGC moderation**: on a player profile or post, tap the "…" / flag icon → **Report** → submit; then **Block** that user and show they disappear.
7. **Permission prompts**: show the location prompt and the notification prompt appearing (and being usable if declined).
8. **Account deletion**: Me → Settings → Delete account → confirm.
9. Sign in again with the review account to show login works.

Upload it to an unlisted YouTube/Vimeo/Dropbox link and paste the link in the reply.

## 2. Devices and OS tested
- iPhone 15 Pro — iOS 18.5
- iPhone 13 — iOS 18.4
- iPad Air (5th generation) — iPadOS 26.5
(Adjust to the devices you actually used.)

## 3. App functions and target audience
PadelSetMatch is a free social directory for padel players. It is especially useful
for meeting padel players who live nearby or in the same neighbourhood, so you can
find partners with a similar lifestyle and schedule. While the app is safe for a younger
audience and contains no dating or relationship functionality, we recommend users be
18 or older for responsible in-person meetups to play. It solves the single biggest
problem in padel: finding a fourth player at your level, at your club, at the time you
can play. Users create a profile (level, preferred side, availability, clubs, languages),
browse other players nearby, create or join open matches, and chat to arrange the game.
There is no dating or relationship functionality — it is a players' directory and
match-organising tool.

A key part of the app is helping players meet other players who have free or low-cost
access to padel courts — for example through municipal courts, urbanisation or
community courts, or off-peak club slots. In cities where booking a court is expensive,
this makes it easier to play more often for less money. Players who can bring a court
are marked on their profile, so others can find them and join a game without everyone
paying full court fees.

Value: fewer cancelled games, faster match-making, cheaper access to courts, and a way
to meet players when travelling to a new city.

## 4. How to set up and access the main features
Demo account (full access, no paid tiers):
- Email: nadine@marches.es
- Password: AppReview123

Steps: Sign in → Home ("Grid") shows nearby players → "Play" tab lists open matches →
tap a match → "Join" → chat opens → "Connect" tab is the community feed (posts,
comments, Q&A) → "Me" tab holds the profile, availability, notification settings,
report/block history and **Delete account**.
No paid content, no subscriptions, no in-app purchases anywhere in the app.

## 5. External services used
- Supabase (Lovable Cloud) — authentication, database, storage, push delivery
- Sign in with Apple and Google Sign-In — authentication
- Google Maps Platform (Places/Geocoding) — club and city lookup
- Resend — transactional email (verification, password reset)
- Lovable AI Gateway — optional profile-matching text embeddings
No payment processors, no advertising or tracking SDKs.

## 6. Regional differences
None. The app functions identically in all regions. The interface is localised in
English, Spanish (Castellano) and French; content and features are the same everywhere.

## 7. Regulated industry / third-party material
Not applicable. The app is not in a regulated industry and contains no protected
third-party material. All imagery and branding is owned by Moorish Arches S.L.

## Purpose strings currently in Info.plist
- Location: "PadelSetMatch uses your location to show padel players and open matches near you, for example at clubs in your city."
- Camera / Photos: "PadelSetMatch needs access to your camera and photos so you can set a profile picture."
- Notifications: used to alert you when someone invites you to a match or sends a message.
