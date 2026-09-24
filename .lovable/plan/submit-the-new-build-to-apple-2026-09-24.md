# Submit the new build to Apple

Sign in with Apple has been tested and both videos are recorded. What's left is building, uploading and submitting.

## Part 1: Get the build ready (my part)
1. Check the build number in the Xcode project. It is currently 15. If Build 15 was already uploaded, raise it to 16 so Apple accepts the upload.
2. Confirm the app compiles cleanly and the latest code is in place: Sign in with Apple, terms checkbox at signup, report/block and account deletion.
3. Update the review notes text (demo account, where to find each feature, video links placeholder) so you can paste it straight in.

## Part 2: On your Mac (your part)
1. In Terminal, in the project folder: `git pull`, then `npm install`, then `npx cap sync ios`, then `npx cap open ios`.
2. In Xcode, open App target, then General. Check that Build shows the number from step 1.
3. Product, then Clean Build Folder. Set the device to "Any iOS Device (arm64)". Product, then Archive.
4. In Organizer: Distribute App, then App Store Connect, then Upload.
5. In App Store Connect, open TestFlight and wait until the build finishes processing (about 10 to 30 minutes).
6. Open the version page, remove the old build, and add the new one.
7. Under App Review Information: demo account `nadine@marches.es` / `AppReview123`. In Notes, paste the review notes and the two video links (unlisted YouTube or iCloud links).
8. Reply to Apple's rejection message in Resolution Center with a short summary and the video links. Then click Submit for Review.

## Lovable not opening on your MacBook
I can't see your computer, so these are the usual fixes, from most to least likely:
1. Try another browser (Chrome or Safari) or a private window.
2. Clear the cache and cookies for lovable.dev, then sign in again.
3. Turn off ad blockers, VPN or privacy extensions for lovable.dev.
4. Update your browser and macOS, then restart the Mac.
5. Try a different network, such as your phone hotspot. Office or Wi-Fi filters sometimes block the site.
6. Check status.lovable.dev for outages.
If none of these work, tell me the exact error message or send a screenshot.

## Technical details
- File: `ios/App/App.xcodeproj/project.pbxproj`, `CURRENT_PROJECT_VERSION` in both Debug and Release. `MARKETING_VERSION` stays 1.0.
- Update `docs/BUILD_15_WALKTHROUGH.md` and `docs/APP_REVIEW_NOTES.md` to match.
- No web or backend changes. The live site already serves the latest code once it is published.
