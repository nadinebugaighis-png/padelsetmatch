# Fix Apple sign-in in the iPhone app

## What is wrong (confirmed)

When a player taps "Continue with Apple" in the iPhone app, Apple approves them, but the sign-in service refuses the result ("Unacceptable audience in id_token"). The app's sign-in code is correct. The refusal comes from a setting: Apple sign-in currently runs on Lovable's shared Apple keys, and those only recognise the website, not your iPhone app (`com.moorisharches.padelsetmatch`). The shared keys have no place to add your app, so the only lasting fix is to switch Apple sign-in to your own Apple keys and list both the website and the iPhone app on them.

A clear message already shows when it fails ("Apple sign-in didn't go through", with steps to use email or "Forgot password?").

## Steps

### 1. You, in your Apple Developer account (I guide you click by click)
- Create a **Services ID** (for example `com.moorisharches.padelsetmatch.web`) with Sign in with Apple turned on.
- In its settings add the domain `padelsetmatch.com` and the return address I give you.
- Create a **Sign in with Apple key** and download the `.p8` file (it can be downloaded only once).
- Note your **Team ID** and the key's **Key ID**.

### 2. You, in Lovable: Users, Auth settings, Sign In Methods, Apple
- Choose "Use your own credentials".
- Use "Generate Secret" with the Team ID, Key ID, Services ID and the `.p8` contents.
- Client ID: the Services ID **and** the iPhone app ID, separated by a comma:
  `com.moorisharches.padelsetmatch.web,com.moorisharches.padelsetmatch`
- Set a reminder: Apple's secret lasts 6 months and must be regenerated before then.

### 3. Protect existing Apple members
11 of your 21 Apple members hid their email when they joined. Apple gives them a different hidden address under your own keys, so their next Apple sign-in could open a new, empty account instead of their old one.
- Before switching, I send those 11 an in-app notice: "Set a password so you never lose access", linking to the reset page (Apple forwards the email to their real inbox).
- On the registration page, a brand-new Apple account sees a discreet line: "Already a member? Sign out and sign in with your email."
- Members with a normal email are matched to their existing account automatically.

### 4. I check it works
- Watch the sign-in records for a successful Apple sign-in from the iPhone app.
- Check website Apple sign-in still works.
- You do one test on your iPhone.

No new App Store build is needed: the iPhone app already has Apple sign-in built in, and it loads the live site.

## Technical details
- Root cause: native `ASAuthorizationController` issues id_tokens with `aud = com.moorisharches.padelsetmatch`; `signInWithIdToken({ provider: "apple" })` only accepts audiences in the Apple provider's client ID list. Managed (Lovable-owned) Apple credentials cannot include it.
- Apple `sub` and private-relay emails are team-scoped, so switching from Lovable's team to the owner's team changes them for hide-my-email users; email-verified users auto-link by email.
- Code changes are limited to: a one-off in-app notification to the 11 relay-email Apple users, and a registration-page hint for new Apple accounts. `src/lib/native.ts` and `appleNative()` stay as they are.
- Web Apple sign-in keeps using `lovable.auth.signInWithOAuth("apple")`.
