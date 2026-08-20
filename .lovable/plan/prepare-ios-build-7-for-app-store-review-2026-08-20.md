# Prepare iOS Build 7 for App Store Review

Build 6 was submitted on 8 Aug, but there have been many code changes since then (most recently the Connect page `has_role` permission fix on 20 Aug). We need a fresh iOS build so Apple reviewers test the latest code.

## Steps

1. **Bump iOS build number**
   - Update `CURRENT_PROJECT_VERSION` from `2` to `7` in both Debug and Release build configurations inside `ios/App/App.xcodeproj/project.pbxproj`.
   - Keep `MARKETING_VERSION` at `1.0`.

2. **Sync Capacitor native project**
   - Run `npx cap sync ios` so the latest `capacitor.config.ts`, web assets, and plugin changes are reflected in the Xcode project.

3. **Build production web bundle**
   - Run `bun run build` to ensure the web bundle compiles cleanly with the latest code.

4. **Verify and hand off**
   - Confirm the Xcode project shows build `7` and no sync errors.
   - Provide the exact next steps for archiving and uploading from a Mac (Xcode → Product ▸ Archive → Distribute App → App Store Connect).

## Out of scope

- Actual upload to App Store Connect must be done on a Mac via Xcode or Codemagic; this sandbox cannot run Xcode or notarize an iOS binary.
- No app version bump (stays at 1.0); only the build number increments.
