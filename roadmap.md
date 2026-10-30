# iPhone sign-in and notifications

## Match card colours
- [ ] Alternate the demo's lavender, green and amber date blocks by calendar day; leave date filters unchanged and verify the signed-in match feed.

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