# Onboarding save destination: home / players directory

## Goal
After a new user finishes the initial profile setup and presses the save button, send them to the players directory home page (`/app/grid`) instead of the profile page.

## Current behavior
In `src/routes/app.onboarding.tsx` the bottom-left "Save" button calls `requestSave("profile")`, which navigates to `/app/profile`. Only the final "Start" button on step 2 sends users to `/app/grid`.

## Proposed change
1. Change the bottom-left "Save" button to call `requestSave("grid")` so it lands on `/app/grid` (the players directory / home).
2. Keep the final step-2 "Start" button going to `/app/grid` as it already does.
3. Leave the exit/X flow as it is: exiting onboarding still takes the user to `/app/profile` (the "me" page), both when saving on exit and when discarding.
4. Verify no other onboarding completion paths redirect elsewhere.

## Acceptance criteria
- Pressing "Save" during onboarding navigates to `/app/grid`.
- Pressing "Start" on the last step still navigates to `/app/grid`.
- Pressing exit (X) still goes to `/app/profile`.

- The change does not affect the standalone profile edit page (`/app/profile`).
