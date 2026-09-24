# Build 16 — Step-by-Step Walkthrough

## 1. Pull the latest code

Open Terminal in the project folder and run:

```bash
git pull
```

## 2. Install dependencies and sync Capacitor

```bash
npm install
npx cap sync ios
```

Wait for both to finish. `cap sync` copies the latest web build into the iOS project.

## 3. Open Xcode

```bash
npx cap open ios
```

This opens the `App.xcodeproj` in Xcode.

## 4. Verify the build number is 15

In Xcode, click the **App** target at the top of the left sidebar, then choose the **General** tab.

- **Version**: 1.0
- **Build**: 16

If Build is not 16, type `16` in the Build field.

## 5. Confirm Sign in with Apple capability is added

With the **App** target still selected, open the **Signing & Capabilities** tab.

Click **+ Capability**, search for **Sign in with Apple**, and add it.

You should see **Sign in with Apple** listed under the capabilities. Make sure it is checked/enabled.

## 6. Clean the build folder

In the Xcode menu bar:

```
Product → Clean Build Folder
```

(Shortcut: Shift + Cmd + K)

## 7. Select a real device or "Any iOS Device"

In the top toolbar, change the run destination from a simulator to:

- **Any iOS Device (arm64)** — for archiving

You cannot archive if a simulator is selected.

## 8. Archive the build

In the Xcode menu bar:

```
Product → Archive
```

Wait for the archive to finish. This may take a few minutes.

## 9. Upload to App Store Connect

When the archive finishes, the **Organizer** window opens automatically.

1. Select the new archive (Build 16).
2. Click **Distribute App**.
3. Choose **App Store Connect**.
4. Choose **Upload**.
5. Click **Next** through the prompts (strip symbols and upload bitcode can stay as default).
6. Wait for the upload to complete.

## 10. Wait for processing

After upload, go to:

```
App Store Connect → My Apps → Padel Set Match → TestFlight
```

Build 16 will appear with a blue processing spinner. Wait until it says **Ready to Submit**.

## 11. Record the required videos on a real device

Install Build 16 from TestFlight on a real iPhone or iPad and record:

1. **Sign in with Apple** — open the app, tap Sign in with Apple, complete login.
2. **EULA / Terms acceptance** — show the Create account screen and the terms checkbox blocking signup until accepted.
3. **Flag objectionable content** — go to Connect, tap the flag/report option on a post or comment.
4. **Block a user** — open a user profile, tap Block.
5. **Account deletion** — go to Profile → Settings → Delete Account, confirm deletion.

Upload each video to a private/unlisted link (iCloud, YouTube unlisted, etc.).

## 12. Paste the links in App Store Connect

Go to:

```
App Store Connect → My Apps → Padel Set Match → App Review Information → Notes
```

Paste all video links and the review notes text.

## 13. Submit for review

In App Store Connect, select Build 16, then click **Submit for Review**.

---

If Xcode shows any signing errors, confirm:

- Team: Moorish Arches S.L.
- Bundle Identifier: `com.moorisharches.padelsetmatch`
- Automatic signing is on
- Sign in with Apple capability is enabled in the Apple Developer portal for this bundle ID
