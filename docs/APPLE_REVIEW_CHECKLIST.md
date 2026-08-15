# Apple App Review — Preparation Checklist

*For PadelSetMatch (Moorish Arches S.L.)*

This is the short version. The full draft reply you paste into App Store Connect is in `docs/APP_REVIEW_NOTES.md`.

---

## 1. Before you start — gather these 3 things

| Item | What to do | Where it goes |
|---|---|---|
| **Screen recording** | Record 2–4 min on a real iPhone: launch → register → onboarding → browse grid → join a match → report/block → delete account. Upload unlisted to YouTube/Vimeo/Dropbox. | App Review reply + App Review Information → Notes |
| **Demo account password** | Make sure `nadine@marches.es` works and has a known password. | App Review Information → Demo Account |
| **Devices tested** | Write down the exact iPhone/iPad models and iOS versions you used. | App Review reply |

---

## 2. What to paste in App Store Connect

Go to **App Store Connect → Your app → App Review Information** and fill in:

- **Notes:** copy the full block from `docs/APP_REVIEW_NOTES.md`
- **Demo Account:** `nadine@marches.es` + current password
- **Contact Information:** your company email / phone

Then go to **Reply to App Review** and paste the same block again.

---

## 3. How to explain what makes this app different

Apple often asks: *“What makes this app different from similar apps?”* Use these points:

1. **Solves a real sport-specific problem.** Padel is almost always played in doubles. The app’s only purpose is to help a player find a fourth partner at the right level, club, and time.
2. **Neighbourhood-focused, not dating-focused.** Discovery is built around where you play (city / club / zone) and your schedule, not around matching people socially or romantically.
3. **Safety by design.** Sign-in required, no public profiles, block/report everywhere, account deletion in-app, and a moderation queue for user-generated content.
4. **No monetisation tricks.** Free app, no subscriptions, no in-app purchases, no ads, no data selling.
5. **Travelling players.** You can use it at home or when visiting a new city to find local games.
6. **Verified coach reviews.** Anonymous ratings only qualify if the coach confirms they actually coached that player.

---

## 4. Common Apple questions and short answers

| Apple might ask | Short answer |
|---|---|
| Is this a dating app? | **No.** There are no romantic or relationship features. It is a directory and match-organising tool for padel players. |
| How do you moderate content? | Users can report profiles, posts, comments, kit items and chat messages. Admins review reports and can remove content or suspend accounts. |
| How do users delete their account? | Me → Settings → Delete account → confirm. It deletes profile, content, matches and messages. |
| Why do you need location? | Only to show nearby players and open matches at clubs in the user’s city. Exact GPS is never shared. |
| Why do you need camera/photos? | Only so users can set a profile picture. |
| Is there any paid content? | No. No subscriptions, no in-app purchases, no paid tiers. |
| What age is it for? | Safe for younger audiences, but we recommend 18+ for responsible in-person meetups to play. |

---

## 5. Quick final checks before resubmitting

- [ ] The build in App Store Connect is the one you want reviewed.
- [ ] `nadine@marches.es` can sign in on a fresh install.
- [ ] The screen recording link is unlisted but accessible.
- [ ] You replaced `<paste the current password here>` in `docs/APP_REVIEW_NOTES.md` with the real password.
- [ ] You filled in the real devices and iOS versions.
- [ ] You clicked **Reply to App Review** and then **Resubmit**.

---

## 6. What happens next

1. Apple reads your reply and notes.
2. They test the app with the demo account.
3. If they need more info, they send another message.
4. If everything is clear, the app moves to **In Review** and then **Ready for Sale**.

You do **not** need to upload a new binary unless Apple asks for code changes.
