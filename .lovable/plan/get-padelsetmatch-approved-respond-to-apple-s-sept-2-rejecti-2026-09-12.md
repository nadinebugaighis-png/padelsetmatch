# Get PadelSetMatch approved — respond to Apple's Sept 2 rejection (Build 13 → 15)

Apple's rejection has 3 items. All three are already fixed in the code (native Apple sign-in plugin, EULA acceptance at signup, in-app account deletion) but **none of it was in Build 13** — the build Apple reviewed. The work now is: verify the fixes actually work on a real iPad, make a new build, record the proof videos Apple asks for, and resubmit.

## Step 1 — Verify Sign in with Apple works natively (the critical one)

This was rejected twice, so it's the make-or-break item. The native Swift plugin and entitlement are in the project, but two things still need to happen on your Mac:

- In Xcode, open the App target → **Signing & Capabilities** and confirm **"Sign In with Apple"** appears in the list. If it doesn't, click **+ Capability** and add it (Xcode then also enables it on your App ID in the Apple Developer portal automatically). Without this, the button will fail on a real device even though the code is correct.
- Run the app on your iPhone (or iPad if you have one) from Xcode and actually tap **Sign in with Apple**: the Apple sheet must appear, and after Face ID you must land inside the app signed in. Test cancel too — it should just close the sheet, not freeze.
- Also test on iPad if possible, since Apple reviews on an iPad Air. If you don't have one, the iPad simulator in Xcode is acceptable for a smoke test.

## Step 2 — Verify the other two fixes on device

- **EULA (Guideline 1.2):** on the Create account tab the checkbox must block email signup, Google and Apple until ticked; the Terms page shows the zero-tolerance section. Flagging (flag icon on posts/profiles) and blocking (from a player's profile) already exist.
- **Account deletion (5.1.1(v)):** Me tab → Settings → "Delete my account" (red, full-width) → confirm → account is gone and you can sign up again with the same email. **Important:** test this with a throwaway account, not your own.

## Step 3 — Fix the /auth hydration warning

The sign-in page logs a technical hydration warning in the browser console during development. It is invisible to users and does not affect the iOS app, but we will clean it up before building.

- Investigate the warning on `src/routes/auth.tsx` (the route is `ssr: false`, so the mismatch likely comes from the lazy-loaded client bundle or initial state).
- Apply a minimal, safe fix that removes the warning without changing the visible UI or signup flow.
- Verify the page still loads, the EULA checkbox still blocks signup, and no new warning appears.

## Step 4 — Record the two screen recordings Apple explicitly demands

Apple will not approve without these. Record on a physical device (iPhone is fine — use the built-in screen recorder from Control Centre, or QuickTime on the Mac with the phone plugged in):

1. **Recording A (Guideline 1.2):** open the app → Create account tab → show the EULA checkbox blocking sign-up → tick it → sign up → flag a post with the flag icon → block a user from their profile.
2. **Recording B (Guideline 5.1.1(v)):** sign in → navigate to Me → Settings → Delete my account → confirm → account deleted.

Upload both as **unlisted YouTube videos** and keep the links.

## Step 5 — Build 15, upload, resubmit

1. Bump the build number to **15**, then on your Mac: `git pull && npm install && npm run build && npx cap sync ios && npx cap open ios`.
2. In Xcode: **Product → Archive → Distribute → App Store Connect → Upload**.
3. In App Store Connect: select Build 15, paste both video links into **App Review Information → Notes**, keep demo account `nadine@marches.es` / `AppReview123`, confirm **Age Rating → Messaging and Chat = Yes**, and submit.
4. Reply to Apple's message in the Resolution Center (I'll give you the exact text when the recordings are ready).

## Technical notes

- No code changes are expected in steps 1–2 unless device testing reveals a bug; the fixes are already committed (`ios/App/App/AppleSignInPlugin.swift`, `App.entitlements`, EULA checkbox in `src/routes/auth.tsx` gated to signup only, `terms_accepted_at` on profiles, delete button in `src/routes/app.profile.tsx`).
- Step 3 adds a small frontend cleanup for the auth-page hydration warning.
- Build number lives in `ios/App/App.xcodeproj/project.pbxproj` (`CURRENT_PROJECT_VERSION`, currently 14 → 15).
- If the Apple sign-in sheet fails on device, the most likely cause is the missing capability in Xcode (Step 1) — check that first before touching code.
