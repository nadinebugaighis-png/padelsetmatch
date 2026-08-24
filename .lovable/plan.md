# Submit iOS Build 9 to App Store Review

Goal: get Build 9 (native Sign in with Apple + under-13 Connect gate + fixed demo password) uploaded and the App Review notes updated so Apple can re-test without leaving the app.

## 1. On your Mac — prepare the build

```bash
git pull
npm install          # installs @capacitor-community/apple-sign-in
npm run build        # must finish with no errors
npx cap sync ios     # pulls the new plugin into the Xcode project
```

## 2. In Xcode — add Sign in with Apple

1. Open the project: `npx cap open ios`
2. Select the **App** target → **Signing & Capabilities**.
3. Tap **+ Capability** → add **Sign in with Apple**.
4. Verify:
   - **Version**: `1.0`
   - **Build**: `9`
   - Bundle ID: `com.moorisharches.padelsetmatch`
5. **Product → Archive → Distribute App → App Store Connect → Upload**.

## 3. Update App Review Information → Notes

Replace the existing Notes text with the block below (it now mentions native Sign in with Apple, the under-13 gate, and the corrected demo password).

```text
Demo account (full access, no paid tiers):
- Email: nadine@marches.es
- Password: AppReview123

This build (1.0.9) resolves the previous sign-in issue and keeps authentication inside the app:
- Email/password login is the primary path in the native shell.
- Native Sign in with Apple is now included, so Apple-ID users never leave the app.
- Google Sign-In is only offered on the web, not inside the iOS app.

The Connect community feed is gated to users with a completed adult profile. Profiles without a verified age cannot create or view Connect posts or comments, ensuring users under 13 cannot access social features.

Main features to test:
1. Launch app → landing screen.
2. Register a new account with email + password.
3. Complete onboarding: name, photo, city/club, level, availability.
4. Home ("Grid") shows nearby players; open a profile, close it.
5. "Play" tab lists open matches; tap a match → "Join" → chat opens.
6. "Connect" tab is the community feed (posts, comments, Q&A).
7. Report/Block: tap the "…" / flag icon on a profile or post.
8. Account deletion: Me → Settings → Delete account → confirm.
9. Sign in again with the demo account above.

No paid content, no subscriptions, no in-app purchases anywhere in the app.

External services used:
- Lovable Cloud — authentication, database, storage, push delivery
- Sign in with Apple and Google Sign-In — authentication (Google is web-only)
- Google Maps Platform — club and city lookup
- Resend — transactional email
- Lovable AI Gateway — optional profile-matching text embeddings

No payment processors, no advertising or tracking SDKs.
```

## 4. Reply in Resolution Center

Paste a short reply referencing the new build:

```text
Thank you for the feedback. We have uploaded Build 9 (1.0.9) which addresses both issues:

1. The demo account now works with email/password:
   - Email: nadine@marches.es
   - Password: AppReview123

2. Authentication now stays fully inside the app:
   - Native Sign in with Apple is included.
   - Email/password is the primary native path.
   - Google Sign-In is no longer shown in the iOS shell.

We also added an age gate so the Connect social feed is only available to adult profiles. Please let us know if you need anything else.
```

## 5. Final checks before submitting

- [ ] Build 9 appears in App Store Connect and is selected for review.
- [ ] **App Review Information → Notes** contains the updated demo credentials and Sign in with Apple note.
- [ ] **Reply to App Review** has been sent.
- [ ] The app rating questionnaire is answered consistently with social features (Connect feed) gated to adult users.

## Out of scope

- Actual upload and App Store Connect UI actions must be done on your Mac; this sandbox cannot run Xcode.
- We are not changing the app marketing version (stays 1.0); only the build number is bumped to 9.
