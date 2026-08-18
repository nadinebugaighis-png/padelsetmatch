# Onboarding save destination: home / players directory

## Goal
After a new user finishes the initial profile setup and presses the save button, send them to the players directory home page (`/app/grid`) instead of the profile page.

## Current behavior
In `src/routes/app.onboarding.tsx` the bottom-left "Save" button calls `requestSave("profile")`, which navigates to `/app/profile`. Only the final "Start" button on step 2 sends users to `/app/grid`.

## Proposed change
1. Change the bottom-left "Save" button to call `requestSave("grid")` so it lands on `/app/grid` (the players directory / home).
2. Keep the final step-2 "Start" button going to `/app/grid` as it already does.
3. Update the exit/X flow if it currently forces `/app/profile`: when the profile is valid, save and go to `/app/grid`; when the user discards, also return to `/app/grid`.
4. Verify no other onboarding completion paths redirect to `/app/profile`.

## Acceptance criteria
- Pressing "Save" during onboarding navigates to `/app/grid`.
- Pressing "Start" on the last step still navigates to `/app/grid`.
- Closing/exiting onboarding without saving returns to `/app/grid`.
- The change does not affect the standalone profile edit page (`/app/profile`).
