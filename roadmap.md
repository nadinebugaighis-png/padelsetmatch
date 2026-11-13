# iPhone sign-in and notifications

## Shared matches open in the installed app
- [x] Prepare iOS Universal Links, Android App Links, safe cold/warm link handling and new release versions; 15 focused checks, typecheck and preview build pass.
- [ ] Add the Google Play app-signing SHA-256 fingerprint (requires Nadine's Play Console certificate details).
- [ ] Publish website association files, upload both signed builds and verify WhatsApp links on physical iPhone/Android devices (requires Nadine's Mac and store access).

## Thorough app QA
- [x] Investigate installed-iPhone blank opening; bound session/navigation waits, add a visible retry screen without clearing saved login. Ten checks pass; simulated iPhone delayed verification shows retry, normal saved-session opening reaches /app/grid; build OK. Exact screenshot failure and physical iPhone confirmation remain unverified until Nadine checks after publication.
- [x] Review signup, profiles, player grid, compatibility, matches, notifications, privacy and unused controls; 30 tests pass, signed-in phone/desktop browsing and 40 images checked; findings and unverified flows recorded in the QA report dated 1 November 2026. Audit only; no app/data fixes performed.
- [x] Review the completed deep security scan: guest removal, withdrawn photos and unsafe short links need fixes; the shared club directory remains intentionally visible.
- [x] Fix raw-answer privacy, host-only guest cancellation, unsafe sharing, withdrawn-photo signing/storage access, truthful deletion and retry, adult age/range validation, form limits, chat draft retention/update refresh, nonblocking notification taps, Google failure handling, invite redirect preservation, account-wide daily answers, translations and missing page metadata. 35 automated checks passed; disposable players verified daily-save/read-back/cross-device dismissal, private-answer denial, guest token join/room/leave, unsafe link rejection, withdrawn-photo denial and permanent profile/identity deletion.
- [ ] Verify native cold launch, push delivery, hosted Google/Apple sign-in and live club suggestions after publication (requires Nadine's physical devices and hosted external services).
- [ ] Verify two-person chat edits/deletes and unread-notification failure navigation after publication (requires live realtime delivery and notification states; code and focused checks pass, not a full device end-to-end claim).

## Match date and time clarity
- [x] Replace the combined date/time field with a light calendar and readable hour/minute choices; signed-in phone/desktop checks selected 31 October at 18:30 with no overflow or page errors, and build passes. Publication and real-device check remain with Nadine.

## Club search clarity and speed
- [x] Lighten location choices and suggestion list; reuse matching fetched clubs immediately, cache repeat searches and use an 80ms typing delay. Seven tests and app checks pass; signed-in phone/desktop checks confirm the form and manual-location path, with no overflow or page errors. No match rules or store uploads changed.
- [ ] Verify live Google club results and selection on the published website (Maps-dependent checks are unavailable in the sandbox; requires publication and Nadine's check).

## Matches page clarity
- [x] Simplify the header, move Start a match into it, calm date selection and tuck level/time choices behind Filters; three date tests pass and signed-in phone/desktop checks verify search, dates, filters, My matches and new-match navigation with no page errors. Live rollout requires website publication.

## Match card colours
- [x] Alternate the demo's lavender, green and amber date blocks by calendar day; date filters unchanged. Signed-in mobile/desktop checks show November 3 lavender and November 11 gold, no page errors, and build OK.

## Notification response delay
- [x] Remove notification delivery from the response-critical path using Worker waitUntil and request deduplication; 16 tests pass, signed-in grid requests return successfully, and preview build passes. Published/iPhone delivery check still requires publication and a device.

## Viewed notifications
- [x] Automatically acknowledge visible alerts and remove the manual button; keep links usable while open and invitations until answered. Seven focused tests and preview build pass; signed-in empty-list check passes.
- [ ] Verify automatic clearing with a real unread notification after publication (Nadine's tested inbox had no unread alerts).

## iPhone force-close reopening
- [x] Hide welcome and sign-in while native restoration resolves; eight tests pass and signed-in browser checks reach grid with zero visible welcome/login frames. Signed-out form remains available.
- [ ] Publish the flash-prevention change and verify a cold launch on Nadine's iPhone (requires publication and device check).
- [x] Route saved-in native app launches from the welcome page to the player grid; seven tests and authenticated browser reopening checks pass.
- [ ] Confirm reopening on Nadine's iPhone after the website correction is published (requires device check).

## Google Play deletion page
- [x] Add public account and individual-data deletion instructions with links to existing controls.
- [x] Verify the public page and profile sign-in link; preview build passes.
- [ ] Publish the deletion page (requires Nadine to publish the website).

- [x] Finish saved sign-in protection; browser reopen/connection checks and native script tests pass (real iPhone check pending).
- [x] Complete native push callbacks, tap handling, registration retries and leased background delivery.
- [x] Prepare version 1.0.2 / build 18 and release instructions.
- [ ] Configure Apple push credentials (waiting for Nadine's Apple key).
- [ ] Verify delivery and reopening on a real iPhone (requires new Apple build and credentials).
## Grid questions replace the personality page
- [x] Expand grid question bank to 35 (pádel 15, personality 11, lifestyle 9) and remove the signup Personality page; 8 question checks pass.

## Neighbour areas
- [x] Add La Moraleja to the 16 neighbours Nadine listed (Madrid-only or empty locations).

## No-photo card artwork
- [ ] Show Nadine court-view line-art mockup for empty player cards; build chosen design as inline SVG variants behind the initial in PlayerPhoto fallback (awaiting her pick).
