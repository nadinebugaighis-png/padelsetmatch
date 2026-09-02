# Require Terms acceptance only once (at signup)

Today the Terms/EULA checkbox blocks every sign-in attempt, including returning users. Change it so acceptance is required only when creating an account, while still keeping the EULA visible and enforceable for App Store Guideline 1.2.

## Behaviour after the change

- **Create account tab**: checkbox shown and required — email signup, Google and Apple are all blocked until it is checked.
- **Sign in tab**: no checkbox. Instead a short line of text: "By signing in you agree to the Terms of Use (EULA) and Privacy Policy", with both links.
- Acceptance is recorded on the account when a new user signs up, so the agreement is auditable rather than a purely visual checkbox.

## Technical notes

- `src/routes/auth.tsx`: make the checkbox render only when `mode === "signup"`; `requireAgreement()` returns true immediately when the mode is signin. Keep the guard calls in `submit`, `google`, `appleNative` and the inline web-Apple button (they become no-ops on the sign-in tab). Reset `agreed` when switching tabs.
- Under the sign-in tab, render a compact legal line with links to `/terms` and `/privacy`.
- Persist acceptance: add `terms_accepted_at timestamptz` to `profiles` (migration with the existing grants/RLS pattern) and set it when a signup completes, plus for social sign-ups on first profile creation.
- Translations for the new sign-in legal line in `src/lib/i18n.tsx` (EN / ES castellano / FR).

## Note for App Review

Apple's 1.2 requirement is acceptance at account creation, so this stays compliant. The screen recording should show the signup flow with the checkbox blocking the button until ticked.
