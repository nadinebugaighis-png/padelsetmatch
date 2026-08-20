# Fix blocked/suspended user names and photos

## Problem
When a user is auto-suspended after reports, the people who blocked or hid them can no longer read that profile because the `profiles` RLS policy only allows reading non-suspended other users. The "Hidden & blocked" page then falls back to "Unknown" with no photo, making it impossible to know who you are unblocking.

## Solution
Allow authenticated users to read the basic profile row for anyone they have explicitly blocked or hidden, even if that account is suspended. Keep suspended users hidden from discovery and from everyone else.

## Steps
1. **Database policy update**
   - Add a new `SELECT` policy on `public.profiles`:
     - Allow reading a profile row if the current user has a row in `public.blocks` where they are the blocker, or a row in `public.hides` where they are the hider.
     - This is OR'd with the existing "own profile" and "active other profiles" policies.
   - No schema changes; only a policy addition.

2. **Verify server function**
   - Confirm `getHiddenAndBlocked` in `src/lib/app.functions.ts` now receives `first_name`, `photo_url`, and `zone` for suspended blocked/hidden users after the policy change.
   - If any column is still missing, switch the profile lookup to a security-definer RPC that bypasses RLS for the caller's own blocks/hides only.

3. **UI polish**
   - In `src/routes/app.hidden.tsx`, add a small "Account suspended" badge next to blocked/hidden users whose `suspended_at` is set, so users understand why that person is no longer visible elsewhere.
   - Keep the existing Unhide/Unblock actions working.

## Result
Users who block or report someone will still see that person's real name and photo in "Hidden & blocked", and can unblock them if they choose. Suspended accounts remain invisible everywhere else.
