# Google Play release — PadelSetMatch

App ID: `com.moorisharches.padelsetmatch` · Publisher: Moorish Arches S.L.

## 0. One-time account setup
1. Create a **Google Play Console** account (organisation) — $25 one-off.
2. Verify the organisation (D-U-N-S / legal docs, same details as Apple). Takes a few days.
3. Complete Payments profile + the Developer verification (address, phone, website `https://padelsetmatch.com`).

## 1. Build the Android app bundle (.aab)
Run on any machine with Node + Android Studio (JDK 17 + Android SDK 34):

```bash
npm install
npx cap add android          # first time only
npx cap sync android
cd android && ./gradlew bundleRelease
```

Signing: in Play Console enable **Play App Signing**, then create an upload key:

```bash
keytool -genkey -v -keystore padelsetmatch-upload.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```
Add it to `android/keystore.properties` (never commit it) and reference it from
`android/app/build.gradle` `signingConfigs.release`.

Output: `android/app/build/outputs/bundle/release/app-release.aab`.

Notes:
- The shell loads `https://padelsetmatch.com` (see `capacitor.config.ts`), so web fixes ship instantly without a new .aab.
- Set `versionCode` / `versionName` in `android/app/build.gradle` for every upload.

## 2. Store listing assets (already generated)
- App icon 512×512 → `public/icon-512.png`
- Feature graphic 1024×500 → `/mnt/documents/play-store/feature-graphic-1024x500.png`
- Phone screenshots 1080×1920 (min 2, max 8) → `/mnt/documents/play-store/screenshots-1080x1920/`
- Launcher icons → `/mnt/documents/android-icons/android-launcher-icons.zip`

Short description (80 chars max):
> Find padel players near you, match by level and join games at your club.

Full description: reuse the App Store copy (EN / ES / FR).

## 3. Play Console declarations
- **Privacy policy URL**: https://padelsetmatch.com/privacy
- **Data safety form**: same answers as the Apple nutrition label — Contact info, Location (approximate), Photos, Messages, Identifiers, Diagnostics. Collected, linked to the user, **not** used for tracking/ads. Data is encrypted in transit; users can request deletion in-app (Me → Delete account) and at https://padelsetmatch.com/support.
- **Account deletion URL** (required): https://padelsetmatch.com/support
- **Content rating** questionnaire: social app with user-generated content + chat → likely Teen/PEGI 12. Declare UGC and moderation.
- **Target audience**: 18+.
- **Ads**: No.
- **App access**: provide the review login (`nadine@marches.es`) — Play testers need it just like Apple.
- **Government / financial features**: No.

## 4. Release
1. Create app → Production (or start with **Closed testing**, recommended: 12 testers × 14 days is required for *personal* accounts only, not organisations).
2. Upload the .aab, fill release notes, roll out.
3. Review typically takes 1–7 days for a first submission.
