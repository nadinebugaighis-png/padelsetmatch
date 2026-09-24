# Publishing PadelSetMatch on Google Play — step by step

The Android app is the same idea as the iPhone one: a native shell that loads
`https://padelsetmatch.com`, so every web fix ships instantly without a new build.

---

## Part 1 — Google Play Console account (one-time, do first)

1. Go to **play.google.com/console** and sign in with a Google account
   (use a company/owner account, not a personal throwaway).
2. Choose **Organisation** when asked for account type (same as Apple:
   a personal account would force a 12-tester / 14-day closed test first).
   - Fee: **$25 one-off** (Apple is $99/year — this is cheaper and one time).
   - You'll need: legal name **Moorish Arches S.L.**, address, phone, and the
     website `https://padelsetmatch.com`. Have a **D-U-N-S number** ready —
     you already have one from Apple.
3. **Identity verification**: upload the same documents you used for Apple.
   Google reviews this — it can take a **few days**. Start it today.
4. Complete the **Payments profile** and **Developer verification**.

While you wait for verification you can prepare everything in Parts 2–3.

---

## Part 2 — Build the Android app (.aab) — needs a computer with Android Studio

You need a machine (Mac is fine) with:
- Node.js (`node -v` works)
- **Android Studio** — download free from developer.android.com/studio
  (this installs the Java JDK 17 and Android SDK for you)

Open Terminal, in the project folder:

```bash
git pull
npm install
npx cap add android      # first time only — creates the android/ folder
npx cap sync android
```

Then open Android Studio:
1. **File ▸ Open** → choose the `android` folder inside the project.
2. Let Gradle sync finish (first time downloads a lot — be patient, 10–20 min).
3. Menu **Build ▸ Generate Signed Bundle / APK** → pick **Android App Bundle**.
4. **Key store path → Create new…** and fill in:
   - Key store path: save as `padelsetmatch-upload.jks` (somewhere safe, e.g. Documents)
   - Password: pick one and **write it down** — losing this key is serious
   - Alias: `upload`
   - Validity: 25+ years (default is fine)
   - Fill in your name / organisation (Moorish Arches S.L.) / city / country
5. Select **release**, click Finish.
6. Output file: `android/app/build/outputs/bundle/release/app-release.aab`

> In Play Console, enable **Play App Signing** when Google asks — you upload
> this "upload key", Google keeps the real publishing key. It's automatic.

---

## Part 3 — Store listing (you can do this in the browser now)

All the images are already made:

| Asset | Where |
|---|---|
| App icon 512×512 | `public/icon-512.png` (in the project) |
| Feature graphic 1024×500 | Files → `play-store/feature-graphic-1024x500.png` |
| Phone screenshots 1080×1920 | Files → `play-store/screenshots-1080x1920/` |

Text to copy:

**Short description** (80 chars max):
> Find padel players near you, match by level and join games at your club.

**Full description**: reuse the App Store copy (EN / ES / FR) from App Store Connect.

Other listing fields:
- **App name**: PadelSetMatch
- **Category**: Sports
- **Email**: your support email (info@padelsetmatch.com once Zoho is ready)
- **Website**: https://padelsetmatch.com
- **Privacy policy**: https://padelsetmatch.com/privacy

---

## Part 4 — Create the app + declarations (browser, in Play Console)

1. **All apps ▸ Create app**:
   - Name: PadelSetMatch · Default language: English (or Spanish)
   - **App or game**: App · **Free or paid**: Free
   - Tick the declarations (developer program policies, US export laws).
2. Go through **Grow ▸ … no** — first the left-menu questionnaires under
   **Policy ▸ App content**. Fill each one:
   - **Privacy policy**: https://padelsetmatch.com/privacy
   - **Ads**: No ads.
   - **Content rating** questionnaire: it's a social app with chat and
     user-generated content → answer honestly (user-generated content: yes,
     users share text/photos: yes, sharing location: yes). Likely result:
     **Teen / PEGI 12**.
   - **Target audience**: 18+ only. This matters — declaring children would
     trigger extra family-policy requirements.
   - **Data safety** form: same answers as the Apple privacy label —
     Contact info, Location (approximate), Photos, Messages, Identifiers,
     Diagnostics. All **collected, linked to the user, not used for
     tracking/ads**. Data encrypted in transit. Users can request deletion
     in-app (Me → Delete account) and at the support page.
   - **Account deletion** (required): URL → `https://padelsetmatch.com/support`
     (in-app deletion also exists, but Google wants the URL too).
   - **App access**: provide the demo login —
     `nadine@marches.es` / `AppReview123` (Google reviewers need it, same as Apple).
   - **Government apps / financial features**: No.

---

## Part 5 — Upload and release

1. Left menu **Testing** (recommended first step): create a **Closed test**
   and upload the .aab there — first uploads always go to a test track.
2. Set the **version code** if Android Studio didn't (open
   `android/app/build.gradle`, `versionCode 1`, `versionName "1.0"` — fine for
   the first release).
3. Upload `app-release.aab`, write release notes ("First release"), save.
4. Add at least ~12 testers' emails to the closed test, publish the test
   release. Testers get a link to opt in and install.
5. When you're happy: **Production ▸ Create new release**, add the same .aab
   (or a new one), write release notes, review, roll out.
6. Review time for a first submission: **typically 1–7 days** (new org accounts
   can take longer).

---

## Cheat sheet — differences from the Apple flow

| | Apple | Google |
|---|---|---|
| Account | $99/year | $25 one-off |
| Verification | D-U-N-S, days | D-U-N-S + ID, days — **start early** |
| File you upload | .ipa from Xcode | .aab from Android Studio |
| Sign in with Apple requirement | mandatory | not applicable |
| Review time | ~1–2 days | 1–7 days first time |
| Web fixes | instant (shell loads site) | instant (shell loads site) |

## Reminders
- Never commit or share the `.jks` keystore or its password. Back it up —
  Google lets you reset an upload key, but keep it safe anyway.
- The shell loads `https://padelsetmatch.com`, so after launch you never need
  a new .aab for normal fixes — the same as iOS.
- The Play "Data safety" answers must match the Apple privacy label; keep the
  two in sync whenever either changes.
