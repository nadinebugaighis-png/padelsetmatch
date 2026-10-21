# Shipping PadelSetMatch to the App Store

The web app stays exactly as it is. Capacitor wraps it in a native iOS shell that
loads `https://padelsetmatch.com` (see `capacitor.config.ts`).

## What you need

1. **Apple Developer Program** – $99/year, developer.apple.com.
   Company enrolment as *Moorish Arches S.L.* requires a free D-U-N-S number (1–2 weeks).
2. **A Mac with Xcode 15+** (or a cloud Mac such as Codemagic / MacStadium).
3. **CocoaPods**: `sudo gem install cocoapods`.

## One-time setup on the Mac

```bash
git clone <your repo>
cd <repo>
npm install            # or bun install
npx cap add ios        # creates the ios/ folder (do this on macOS only)
npx cap sync ios
npx cap open ios       # opens Xcode
```

App icons use `resources/icon.png`, an opaque full-bleed source. The corrected
iOS icon is already committed in `Assets.xcassets/AppIcon.appiconset`.
Do not regenerate it with default padding: that can restore an outer frame.
If generating splash screens or other assets, restore the iOS icon afterward:

```bash
npx capacitor-assets generate --ios
cp resources/icon.png ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
```

## Privacy manifest (required)

```bash
cp docs/ios/PrivacyInfo.xcprivacy ios/App/App/PrivacyInfo.xcprivacy
```

Add it to the **App** target in Xcode. Full details and the App Store Connect
nutrition-label answers: `docs/ios/APP_STORE_PRIVACY.md`.

## In Xcode

- **Signing & Capabilities** → select your Team, bundle id `com.moorisharches.padelsetmatch`.
- Add capability **Push Notifications**.
- Add capability **Background Modes** → Remote notifications.
- Set **Display Name** to `PadelSetMatch`, version `1.0`, build `1`.
- Confirm `PrivacyInfo.xcprivacy` is in *Build Phases → Copy Bundle Resources*.
- `Product ▸ Archive` → `Distribute App` → `App Store Connect` → Upload.


## App Store Connect listing

- Category: Sports. Age rating: 17+ (user-generated content, meeting strangers).
- Privacy policy URL: `https://padelsetmatch.com/privacy`
- Support URL: `https://padelsetmatch.com/support`
- Screenshots: 6.7" and 6.5" iPhone (use the published site in Safari responsive mode).

## Guideline 4.2 (“minimum functionality”)

Apple rejects thin website wrappers. The shell therefore uses native APIs via
`src/lib/native.ts`: native share sheet, native push notification registration,
status bar theming, splash screen, and hardware back handling.

## Guideline 1.2 (user-generated content) — required, now implemented

- Filter objectionable content: photo moderation + report queue in the admin panel.
- Report mechanism: report a **profile**, a **photo**, a **post** and a **comment**.
- Block abusive users: block / hide from any profile.
- Contact info: `https://padelsetmatch.com/support`, acted on within 24h.

## Releasing an update

Web-only changes ship instantly (the shell loads the live site). Rebuild and
re-upload in Xcode only when native code, plugins, or icons change.

For the white-frame correction on the live app, follow `docs/ICON_UPDATE_WALKTHROUGH.md`.
