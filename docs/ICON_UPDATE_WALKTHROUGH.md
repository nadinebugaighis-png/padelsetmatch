# Release the corrected iPhone icon

The corrected icon has no white outer frame. The App Store version already installed on phones will keep its old icon until Apple approves and releases this update.

1. Get the latest project code onto your Mac: in Terminal inside the project folder run `git pull` (if Terminal says files would be overwritten, run `git checkout -- .` first, then `git pull`). The icon was last corrected on 21 Oct 2026 — the old icon file will keep showing until you pull.
2. In Terminal inside the project folder, run `npm install`, then `npx cap sync ios`, then `npx cap open ios`.
3. In Xcode, open **App → Assets → AppIcon**. Confirm the green artwork reaches all four edges, with no white outer border.
4. Open the **App** target → **General**. Set **Version** to **1.0.1**. Set **Build** to a number higher than every build already uploaded to App Store Connect (use **17** if **16** is still your highest).
5. Keep your existing signing team, bundle identifier and Sign in with Apple capability unchanged.
6. Select **Any iOS Device (arm64)**. Choose **Product → Clean Build Folder**, then **Product → Archive**.
7. In Organizer, choose the new archive → **Distribute App → App Store Connect → Upload**.
8. Once processing finishes, install this build through **TestFlight** and check its home-screen icon on your iPhone. Also check that sign-in still works.
9. In App Store Connect, open **Padel Set Match** and add a new iOS version **1.0.1** using the **+** beside iOS. Select the newly uploaded build.
10. For **What's New**, enter: “Updated the app icon.” Keep the existing review login details. In review notes, enter: “This update removes the white outer border from the app icon.”
11. Choose **Automatically release this version** after approval, then **Add for Review / Submit for Review**.

Publishing the website alone cannot replace the icon in the installed iPhone app. Apple's review and release are required; timing is controlled by Apple.